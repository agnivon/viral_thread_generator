"use node";

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import FirecrawlApp from "@mendable/firecrawl-js";
import { tavily } from "@tavily/core";
import "dotenv/config";

// 1. WebScraperTool (Firecrawl API)
export const WebScraperTool = tool(
  async ({ url }) => {
    const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
    const scrapeResult = await app.scrapeUrl(url, { formats: ["markdown"] }) as any;
    
    if (!scrapeResult.success && scrapeResult.error) {
      throw new Error(`Failed to scrape: ${scrapeResult.error}`);
    }
    
    return scrapeResult.markdown || "No content found.";
  },
  {
    name: "web_scraper",
    description: "Scrapes a URL and returns clean markdown content.",
    schema: z.object({
      url: z.string().describe("The URL to scrape"),
    }),
  }
);

// 2. CharacterValidatorTool
export const CharacterValidatorTool = tool(
  async ({ thread_draft }) => {
    const offendingIndices: number[] = [];
    thread_draft.forEach((post, index) => {
      // Basic character count; in real world, account for emoji lengths etc.
      if (post.length > 500) {
        offendingIndices.push(index);
      }
    });

    return JSON.stringify({
      isValid: offendingIndices.length === 0,
      offendingIndices,
    });
  },
  {
    name: "character_validator",
    description: "Validates if any post in the thread draft exceeds 500 characters.",
    schema: z.object({
      thread_draft: z.array(z.string()).describe("The list of thread posts to validate"),
    }),
  }
);

// 3. TopicContextExpanderTool
export const TopicContextExpanderTool = tool(
  async ({ query }) => {
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const response = await client.search(query, {
      searchDepth: "basic",
      includeAnswer: false,
    });
    
    return JSON.stringify(response.results);
  },
  {
    name: "topic_context_expander",
    description: "Searches the web for recent context or public sentiment on a topic.",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);
