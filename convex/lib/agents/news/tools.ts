"use node";

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import FirecrawlApp from "@mendable/firecrawl-js";
import { tavily } from "@tavily/core";
import "dotenv/config";
import { JinaClient } from "../../clients/jina.js";
import { isAccessDeniedOrGenericTitle } from "../../urlMetadata.js";
import { YoutubeTranscript } from "youtube-transcript-plus";
import {
  extractJinaContent,
  extractMarkdownImages,
  FIRECRAWL_EXCLUDE_TAGS,
  isBlockedOrThinScrape,
  JINA_READER_OPTIONS,
  sanitizeScrapedMarkdown,
} from "../scrapeUtils.js";

// 1. WebScraperTool (Firecrawl API)
export const WebScraperTool = tool(
  async ({ url }) => {
    let firecrawlMarkdown = "";
    let firecrawlImages: string[] = [];
    let title = "";
    let safeFirecrawlTitle = "";
    let description = "";
    let firecrawlThrew = false;

    try {
      const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
      const scrapeResult = await app.scrape(url, {
        onlyMainContent: true,
        blockAds: true,
        removeBase64Images: true,
        excludeTags: FIRECRAWL_EXCLUDE_TAGS,
        maxAge: 172800000,
        formats: ["markdown", "images"],
      });

      const metadata = (scrapeResult.metadata || {}) as {
        title?: string;
        ogTitle?: string;
        description?: string;
        ogDescription?: string;
      };
      title = (metadata.ogTitle || metadata.title || "").trim();
      safeFirecrawlTitle = title && !isAccessDeniedOrGenericTitle(title, url) ? title : "";
      description = (metadata.ogDescription || metadata.description || "").trim();
      firecrawlMarkdown = sanitizeScrapedMarkdown(scrapeResult.markdown || "");
      firecrawlImages = scrapeResult.images || [];
      if (firecrawlImages.length === 0 && firecrawlMarkdown) {
        firecrawlImages = extractMarkdownImages(firecrawlMarkdown);
      }

      if (firecrawlMarkdown && !isBlockedOrThinScrape(firecrawlMarkdown, title, url)) {
        return JSON.stringify({
          markdown: firecrawlMarkdown,
          images: firecrawlImages,
          ...(safeFirecrawlTitle ? { title: safeFirecrawlTitle } : {}),
          ...(description ? { description } : {}),
        });
      }

      console.warn(
        `[WebScraperTool] Firecrawl returned blocked or thin content for ${url}, falling back to Jina Reader...`
      );
    } catch (_e) {
      firecrawlThrew = true;
      console.warn(`[WebScraperTool] Firecrawl failed for ${url}, falling back to Jina Reader...`);
    }

    try {
      const jina = new JinaClient();
      const jinaResult = await jina.read(url, JINA_READER_OPTIONS);
      const { markdown: rawJinaMarkdown, title: jinaTitle } = extractJinaContent(jinaResult);
      const jinaMarkdown = sanitizeScrapedMarkdown(rawJinaMarkdown);
      const safeJinaTitle = jinaTitle && !isAccessDeniedOrGenericTitle(jinaTitle, url) ? jinaTitle : "";
      const resolvedTitle = safeJinaTitle || safeFirecrawlTitle;

      if (jinaMarkdown && (!isBlockedOrThinScrape(jinaMarkdown, resolvedTitle, url) || firecrawlThrew || !firecrawlMarkdown)) {
        const images = extractMarkdownImages(jinaMarkdown);
        return JSON.stringify({
          markdown: jinaMarkdown,
          images: images.length > 0 ? images : firecrawlImages,
          ...(resolvedTitle ? { title: resolvedTitle } : {}),
          ...(description ? { description } : {}),
        });
      }
    } catch (fallbackErr) {
      if (firecrawlThrew || !firecrawlMarkdown) {
        console.error(`[WebScraperTool] Jina Reader fallback failed for ${url}`, fallbackErr);
        throw fallbackErr;
      }
      console.warn(`[WebScraperTool] Jina Reader fallback failed for ${url}; returning sanitized Firecrawl output.`);
    }

    const markdown = firecrawlMarkdown || "No content found.";
    return JSON.stringify({
      markdown,
      images: firecrawlImages,
      ...(safeFirecrawlTitle ? { title: safeFirecrawlTitle } : {}),
      ...(description ? { description } : {}),
    });
  },
  {
    name: "web_scraper",
    description: "Scrapes a URL and returns clean markdown content.",
    schema: z.object({
      url: z.string().describe("The URL to scrape"),
    }),
  }
);

// 2. YoutubeScraperTool
export const YoutubeScraperTool = tool(
  async ({ url }) => {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(url);
      const markdown = transcript.map(t => t.text).join(' ');
      const images: string[] = []; // No images for YouTube transcripts yet
      return JSON.stringify({ markdown, images });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[YoutubeScraperTool] Failed to fetch transcript for ${url}`, e);
      throw new Error(`Failed to fetch YouTube transcript: ${message}`);
    }
  },
  {
    name: "youtube_scraper",
    description: "Scrapes a YouTube URL and returns the video transcript as markdown.",
    schema: z.object({
      url: z.string().describe("The YouTube URL to scrape"),
    }),
  }
);

// 3. TopicContextExpanderTool
export const TopicContextExpanderTool = tool(
  async ({ query, topic, days, maxResults, includeDomains, excludeDomains }) => {
    try {
      const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
      const response = await client.search(query, {
        searchDepth: "basic",
        includeAnswer: false,
        topic,
        days: days,
        maxResults: maxResults,
        includeDomains: includeDomains,
        excludeDomains: excludeDomains,
      });

      return JSON.stringify(response.results);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Tavily search failed";
      return JSON.stringify({ error: message });
    }
  },
  {
    name: "topic_context_expander",
    description: "Searches the web for recent context or public sentiment on a topic.",
    schema: z.object({
      query: z.string().describe("The search query"),
      topic: z.enum(["general", "news"]).optional().default("general").describe("Topic of search, use 'news' for recent events"),
      days: z.number().optional().describe("Number of days back to search"),
      maxResults: z.number().optional().default(5).describe("Number of results to return"),
      includeDomains: z.array(z.string()).optional().describe("List of domains to exclusively search from"),
      excludeDomains: z.array(z.string()).optional().describe("List of domains to exclude from results")
    }),
  }
);

// 4. ContentAuthenticityCheckerTool
export const ContentAuthenticityCheckerTool = tool(
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
    name: "content_authenticity_checker",
    description: "Searches the web to verify if a specific claim or data point in a drafted thread is factually accurate and authentic.",
    schema: z.object({
      query: z.string().describe("The factual claim to verify against the web"),
      topic: z.enum(["general", "news"]).optional().default("general").describe("Topic of search, use 'news' for recent events"),
      days: z.number().optional().describe("Number of days back to search"),
      maxResults: z.number().optional().default(3).describe("Number of results to return"),
      includeDomains: z.array(z.string()).optional().describe("List of reputable domains to exclusively search from"),
      excludeDomains: z.array(z.string()).optional().describe("List of domains to exclude from results")
    }),
  }
);

// 5. BackgroundDossierTool
export const BackgroundDossierTool = tool(
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
    name: "background_dossier_builder",
    description: "Searches the web to build a comprehensive background dossier on a topic, extracting core entities, claims, or events.",
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
