"use node";

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import FirecrawlApp from "@mendable/firecrawl-js";
import { tavily } from "@tavily/core";
import "dotenv/config";
import { JinaClient } from "../../jina/api";
import { YoutubeTranscript } from "youtube-transcript-plus";

// 1. WebScraperTool (Firecrawl API)
export const WebScraperTool = tool(
  async ({ url }) => {
    try {
      const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
      const scrapeResult = await app.scrape(url, { onlyMainContent: true, maxAge: 172800000, formats: ["markdown", "images"] });

      const markdown = scrapeResult.markdown || "No content found.";
      let images = scrapeResult.images || [];
      if (images.length === 0 && markdown !== "No content found.") {
        images = Array.from(markdown.matchAll(/!\[.*?\]\((.*?)\)/g)).map((m) => m[1]);
      }
      return JSON.stringify({ markdown, images });
      } catch (_e) {
      console.warn(`[WebScraperTool] Firecrawl failed for ${url}, falling back to Jina Reader...`);
      try {
        const jina = new JinaClient();
        const jinaResult = await jina.read(url, { respondWith: 'markdown' });
        
        let markdown = "No content found.";
        if (typeof jinaResult === 'string') {
          markdown = jinaResult;
        } else if (jinaResult && typeof jinaResult === 'object' && jinaResult !== null) {
          const typedResponse = jinaResult;
          if (typedResponse.data) {
            if (typeof typedResponse.data === 'string') {
              markdown = typedResponse.data;
            } else {
              markdown = typedResponse.data.content || typedResponse.data.text || markdown;
            }
          }
        }
        
        const images = Array.from(markdown.matchAll(/!\[.*?\]\((.*?)\)/g)).map((m) => m[1]);
        return JSON.stringify({ markdown, images });
      } catch (fallbackErr) {
        console.error(`[WebScraperTool] Jina Reader fallback failed for ${url}`, fallbackErr);
        throw fallbackErr;
      }
    }
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
    } catch (e: any) {
      console.error(`[YoutubeScraperTool] Failed to fetch transcript for ${url}`, e);
      throw new Error(`Failed to fetch YouTube transcript: ${e.message}`);
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
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const response = await client.search(query, {
      searchDepth: "basic",
      includeAnswer: false,
      topic: topic as "general" | "news" | undefined,
      days: days,
      maxResults: maxResults,
      includeDomains: includeDomains,
      excludeDomains: excludeDomains,
    });

    return JSON.stringify(response.results);
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
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const response = await client.search(query, {
      searchDepth: "advanced",
      includeAnswer: true,
      topic: topic as "general" | "news" | undefined,
      days: days,
      maxResults: maxResults,
      includeDomains: includeDomains,
      excludeDomains: excludeDomains,
    });

    return JSON.stringify({
      answer: response.answer,
      results: response.results
    });
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
