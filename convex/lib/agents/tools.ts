"use node";

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import FirecrawlApp from "@mendable/firecrawl-js";
import { tavily } from "@tavily/core";
import "dotenv/config";

// 1. WebScraperTool (Firecrawl API)
export const WebScraperTool = tool(
  async ({ url }) => {
    try {
      const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
      const scrapeResult = await app.scrapeUrl(url, { formats: ["markdown"] }) as any;
  
      if (!scrapeResult.success && scrapeResult.error) {
        throw new Error(`Failed to scrape: ${scrapeResult.error}`);
      }
  
      return scrapeResult.markdown || "No content found.";
    } catch (_e) {
      console.warn(`[WebScraperTool] Firecrawl failed for ${url}, falling back to Jina Reader...`);
      try {
        const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
          headers: {
            "Authorization": `Bearer ${process.env.JINA_API_KEY}`
          }
        });
        if (!jinaResponse.ok) {
           throw new Error(`Jina Reader failed with status: ${jinaResponse.status}`);
        }
        const text = await jinaResponse.text();
        return text || "No content found.";
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

// 2. CharacterValidatorTool
export const CharacterValidatorTool = tool(
  async ({ thread_draft, check_line_breaks }) => {
    const errors: string[] = [];
    thread_draft.forEach((post, index) => {
      let position = "Body";
      if (index === 0) position = "Hook";
      else if (index === thread_draft.length - 1) position = "CTA";

      if (post.length > 280) {
        errors.push(`Post ${index + 1} (${position}) is ${post.length} characters long. Maximum allowed is 280 characters.`);
      }
      
      if (check_line_breaks !== false) {
        const lineBreaks = (post.match(/\n/g) || []).length;
        if (lineBreaks > 4) {
           errors.push(`Post ${index + 1} (${position}) has ${lineBreaks} line breaks. Maximum allowed is 4 line breaks.`);
        }
      }
    });

    return JSON.stringify({
      isValid: errors.length === 0,
      errors
    });
  },
  {
    name: "character_validator",
    description: "Validates if any post exceeds 280 characters. Optionally checks for maximum of 4 line breaks.",
    schema: z.object({
      thread_draft: z.array(z.string()).describe("The list of thread posts to validate"),
      check_line_breaks: z.boolean().optional().default(false).describe("Whether to check if line breaks exceed 4 per post"),
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

// 4. ContentAuthenticityCheckerTool
export const ContentAuthenticityCheckerTool = tool(
  async ({ query }) => {
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const response = await client.search(query, {
      searchDepth: "advanced",
      includeAnswer: true,
    });

    return JSON.stringify({
      answer: response.answer,
      results: response.results.slice(0, 3)
    });
  },
  {
    name: "content_authenticity_checker",
    description: "Searches the web to verify if a specific claim or data point in a drafted thread is factually accurate and authentic.",
    schema: z.object({
      query: z.string().describe("The factual claim to verify against the web"),
    }),
  }
);
