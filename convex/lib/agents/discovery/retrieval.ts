"use node";

import { tavily } from "@tavily/core";
import { JinaClient } from "../../clients/jina.js";
import {
  extractJinaContent,
  isBlockedOrThinScrape,
  JINA_READER_OPTIONS,
  sanitizeScrapedMarkdown,
} from "../scrapeUtils.js";
import { DiscoveryEvidenceItem, DiscoverySearchVector } from "./state.js";

interface DialecticRetrievalOptions {
  vectors: DiscoverySearchVector[];
  maxQueriesPerVector?: number;
  timeoutMs?: number;
}

const SEARCH_CONCURRENCY_LIMIT = 3;

function isEligibleDeepReadUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
    if (
      host.includes("google.") && parsed.pathname.startsWith("/search") ||
      host.includes("duckduckgo.com") ||
      host.includes("bing.com") && parsed.pathname.startsWith("/search")
    ) {
      return false;
    }
    if (/\.(?:pdf|zip|tar|gz|mp4|mov|webm|png|jpe?g|gif|webp|svg)(?:$|\?)/i.test(pathAndQuery)) {
      return false;
    }
    if (/\/(?:login|signin|sign-in|register|signup|account|subscribe)\b/i.test(parsed.pathname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Helper to wrap external network promises with an explicit timeout to prevent hanging requests
function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeoutPromise,
  ]);
}

/**
 * Executes unconstrained, open-web dialectic retrieval across Tavily Search
 * and Jina Reader for full-text primary source ingestion.
 *
 * NOTE: Brave Search is currently disabled per configuration ("not using it currently").
 * Per product specifications, domain filtering/whitelisting is strictly disabled.
 */
export async function executeDialecticRetrieval(
  options: DialecticRetrievalOptions
): Promise<DiscoveryEvidenceItem[]> {
  const { vectors, maxQueriesPerVector = 2, timeoutMs = 20000 } = options;
  const evidenceItems: DiscoveryEvidenceItem[] = [];

  const tavilyApiKey = process.env.TAVILY_API_KEY;
  const jinaApiKey = process.env.JINA_API_KEY;

  let tavilyClient: ReturnType<typeof tavily> | null = null;
  if (tavilyApiKey) {
    try {
      tavilyClient = tavily({ apiKey: tavilyApiKey });
    } catch (err) {
      console.warn("[DialecticRetrieval] Failed to initialize Tavily client:", err);
    }
  }

  const jinaClient = new JinaClient(jinaApiKey);

  // Flatten queries with their associated vector metadata
  const queryTasks: Array<{ vector: string; query: string }> = [];
  for (const v of vectors) {
    const queries = v.queries.slice(0, maxQueriesPerVector);
    for (const q of queries) {
      if (q && q.trim()) {
        queryTasks.push({ vector: v.vector, query: q.trim() });
      }
    }
  }

  if (queryTasks.length === 0) {
    return evidenceItems;
  }

  // 1. Paced Parallel Search Execution (Tavily AI Search) to avoid HTTP 429 burst throttling
  for (let i = 0; i < queryTasks.length; i += SEARCH_CONCURRENCY_LIMIT) {
    const batch = queryTasks.slice(i, i + SEARCH_CONCURRENCY_LIMIT);
    const batchPromises = batch.map(async ({ vector, query }) => {
      if (!tavilyClient) return;
      try {
        const tavilyRes = await withTimeout(
          tavilyClient.search(query, {
            searchDepth: "advanced",
            includeAnswer: true,
            maxResults: 3,
          }),
          timeoutMs,
          null
        );

        if (tavilyRes?.answer) {
          evidenceItems.push({
            vector,
            query,
            title: "Tavily Synthesis",
            snippet: tavilyRes.answer,
            source: "tavily_answer",
          });
        }

        if (Array.isArray(tavilyRes?.results) && tavilyRes.results.length > 0) {
          for (const r of tavilyRes.results) {
            if (r.content || r.title) {
              evidenceItems.push({
                vector,
                query,
                title: r.title,
                url: r.url,
                snippet: r.content || "",
                source: "tavily_web",
              });
            }
          }
        }
      } catch (tavilyErr) {
        console.warn(`[DialecticRetrieval] Tavily search failed for "${query}":`, tavilyErr);
      }
    });

    await Promise.allSettled(batchPromises);
  }

  // 2. Select Top High-Value Primary Source URLs for Full-Text Ingestion via Jina Reader
  const candidateUrls = evidenceItems
    .map((e) => e.url)
    .filter((url): url is string => typeof url === "string" && isEligibleDeepReadUrl(url));

  const uniqueUrls = Array.from(new Set(candidateUrls)).slice(0, 3);

  if (uniqueUrls.length > 0) {
    const jinaPromises = uniqueUrls.map(async (url) => {
      try {
        const jinaRes = await withTimeout(jinaClient.read(url, JINA_READER_OPTIONS), timeoutMs, null);
        if (!jinaRes) return;

        const { markdown: rawMarkdown, title } = extractJinaContent(jinaRes);
        const markdownText = sanitizeScrapedMarkdown(rawMarkdown);

        if (markdownText && !isBlockedOrThinScrape(markdownText, title, url)) {
          // Truncate cleanly to ~2500 chars to conserve context budget while extracting receipts
          const cleanedText = markdownText.slice(0, 2500);
          const matchedItem = evidenceItems.find((e) => e.url === url);
          if (matchedItem) {
            matchedItem.full_text = cleanedText;
          } else {
            evidenceItems.push({
              vector: "full_text_deep_read",
              query: url,
              url,
              snippet: cleanedText.slice(0, 300),
              full_text: cleanedText,
              source: "jina_reader",
            });
          }
        }
      } catch (jinaErr) {
        console.warn(`[DialecticRetrieval] Jina reader failed for "${url}":`, jinaErr);
      }
    });

    await Promise.allSettled(jinaPromises);
  }

  return evidenceItems;
}
