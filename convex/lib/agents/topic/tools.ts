"use node";

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { tavily } from "@tavily/core";
import "dotenv/config";

import { JinaClient } from "../../clients/jina.js";
import FirecrawlApp from "@mendable/firecrawl-js";
import { validateThreadDraftContent } from "../tools.js";
import {
  extractJinaContent,
  extractMarkdownImages,
  FIRECRAWL_EXCLUDE_TAGS,
  isBlockedOrThinScrape,
  JINA_READER_OPTIONS,
  sanitizeScrapedMarkdown,
} from "../scrapeUtils.js";

export const TavilySearchTool = tool(
  async ({ query, topic, days, maxResults, includeDomains, excludeDomains }) => {
    try {
      const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
      const response = await client.search(query, {
        searchDepth: "advanced",
        includeAnswer: true,
        topic,
        days: days,
        maxResults: maxResults,
        includeDomains: includeDomains,
        excludeDomains: excludeDomains,
      });

      return JSON.stringify({
        answer: response.answer,
        results: response.results
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Tavily search failed";
      return JSON.stringify({ error: message });
    }
  },
  {
    name: "tavily_search",
    description: "Searches the web using Tavily to fetch LLM-optimized summaries and synthesize factual answers.",
    schema: z.object({
      query: z.string().describe("The search query to research"),
      topic: z.enum(["general", "news"]).optional().default("general").describe("Topic of search, use 'news' for recent events"),
      days: z.number().optional().describe("Number of days back to search"),
      maxResults: z.number().optional().default(5).describe("Number of results to return"),
      includeDomains: z.array(z.string()).optional().describe("List of domains to exclusively search from"),
      excludeDomains: z.array(z.string()).optional().describe("List of domains to exclude from results")
    }),
  }
);

import { search as ddgSearch, SafeSearchType } from "duck-duck-scrape";

export const DuckDuckGoSearchTool = tool(
  async ({ query }) => {
    let ddgErrorMessage = "";
    try {
      const response = await ddgSearch(query, {
        safeSearch: SafeSearchType.MODERATE,
      });
      if (Array.isArray(response?.results) && response.results.length > 0) {
        return JSON.stringify(response.results.slice(0, 5));
      }
      ddgErrorMessage = "DuckDuckGo returned zero results";
    } catch (e: unknown) {
      ddgErrorMessage = e instanceof Error ? e.message : "DuckDuckGo search failed";
      console.warn(`[DuckDuckGoSearchTool] DDG failed ("${ddgErrorMessage}"), falling back to Tavily basic search...`);
    }

    try {
      const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
      const fallbackResponse = await client.search(query, {
        searchDepth: "basic",
        maxResults: 5,
      });
      const normalized = (fallbackResponse.results || []).slice(0, 5).map((r) => ({
        title: r.title || "",
        url: r.url || "",
        description: r.content || "",
      }));
      return JSON.stringify(normalized);
    } catch (fallbackErr: unknown) {
      const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : "Tavily fallback failed";
      return JSON.stringify({ error: `${ddgErrorMessage}; fallback failed: ${fallbackMessage}` });
    }
  },
  {
    name: "duckduckgo_search",
    description: "Executes DuckDuckGo Search (with automatic Tavily fallback on rate limits) to discover high-volume entity metadata and breaking references.",
    schema: z.object({
      query: z.string().describe("The search query for entity discovery"),
    }),
  }
);

export const JinaReaderTool = tool(
  async ({ url }) => {
    try {
      const jina = new JinaClient();
      const response = await jina.read(url, JINA_READER_OPTIONS);
      const { markdown: rawMarkdown, title } = extractJinaContent(response);
      const markdown = sanitizeScrapedMarkdown(rawMarkdown);

      if (!markdown || isBlockedOrThinScrape(markdown, title, url)) {
        return JSON.stringify({
          error: "Target URL blocked or returned insufficient readable article content via Jina Reader.",
        });
      }

      const images = extractMarkdownImages(markdown);

      return JSON.stringify({
        markdown,
        title,
        images,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Jina Reader extraction failed";
      return JSON.stringify({ error: message });
    }
  },
  {
    name: "jina_reader",
    description: "Extracts clean markdown from a URL with a massive context budget.",
    schema: z.object({
      url: z.string().describe("The URL of the high-traffic source document to ingest"),
    }),
  }
);

export const FirecrawlScrapeTool = tool(
  async ({ url }) => {
    try {
      const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
      const response = await app.scrape(url, {
        onlyMainContent: true,
        blockAds: true,
        removeBase64Images: true,
        excludeTags: FIRECRAWL_EXCLUDE_TAGS,
        formats: ["markdown", "images"],
      });

      if (typeof response === "object" && response !== null) {
        const respObj = response as { success?: boolean; error?: string };
        if (respObj.success === false && respObj.error) {
          throw new Error(respObj.error || "Firecrawl failed");
        }
      }

      const metadata = (response.metadata || {}) as {
        title?: string;
        ogTitle?: string;
      };
      const title = (metadata.ogTitle || metadata.title || "").trim();
      const markdown = sanitizeScrapedMarkdown(response.markdown || "");
      if (!markdown || isBlockedOrThinScrape(markdown, title, url)) {
        return JSON.stringify({
          error: "Target URL blocked or returned insufficient readable article content via Firecrawl.",
        });
      }

      let images = response.images || [];
      if (images.length === 0 && markdown) {
        images = extractMarkdownImages(markdown);
      }

      return JSON.stringify({
        markdown,
        metadata: response.metadata || {},
        images,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Firecrawl extraction failed";
      return JSON.stringify({ error: message });
    }
  },
  {
    name: "firecrawl_scrape",
    description: "Scrapes dynamic protected pages requiring interactive JS rendering.",
    schema: z.object({
      url: z.string().describe("The URL to scrape"),
    }),
  }
);

export const TopicCharacterValidatorTool = tool(
  async ({ thread_draft, check_line_breaks }) => {
    const result = validateThreadDraftContent({
      thread_draft,
      check_line_breaks,
      ignoreSoftLimits: true,
    });
    return JSON.stringify(result);
  },
  {
    name: "topic_character_validator",
    description: "Validates thread hard ceilings (500 chars), max 9 posts, and banned formatting. Ignores soft pacing limits.",
    schema: z.object({
      thread_draft: z.array(z.string()).describe("The list of thread posts to validate"),
      check_line_breaks: z.boolean().optional().default(false).describe("Whether to check if line breaks exceed 4 per post"),
    }),
  }
);

export { ContentAuthenticityCheckerTool } from "../news/tools.js";

