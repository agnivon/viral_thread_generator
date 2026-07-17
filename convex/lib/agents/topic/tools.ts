"use node";

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { tavily } from "@tavily/core";
import "dotenv/config";

import { JinaClient, JinaResponse, FormattedPageDto } from "../../jina/api.js";
import FirecrawlApp from "@mendable/firecrawl-js";

export const TavilySearchTool = tool(
  async ({ query }) => {
    try {
      const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
      const response = await client.search(query, {
        searchDepth: "advanced",
        includeAnswer: true,
      });

      return JSON.stringify({
        answer: response.answer,
        results: response.results.slice(0, 5)
      });
    } catch (e: any) {
      return JSON.stringify({ error: e.message || "Tavily search failed" });
    }
  },
  {
    name: "tavily_search",
    description: "Searches the web using Tavily to fetch LLM-optimized summaries and synthesize factual answers.",
    schema: z.object({
      query: z.string().describe("The search query to research"),
    }),
  }
);

import { search as ddgSearch, SafeSearchType } from "duck-duck-scrape";

export const DuckDuckGoSearchTool = tool(
  async ({ query }) => {
    try {
      const response = await ddgSearch(query, {
        safeSearch: SafeSearchType.MODERATE,
      });
      return JSON.stringify(response.results.slice(0, 5));
    } catch (e: any) {
      return JSON.stringify({ error: e.message || "DuckDuckGo search failed" });
    }
  },
  {
    name: "duckduckgo_search",
    description: "Executes DuckDuckGo Search to discover high-volume entity metadata and breaking references.",
    schema: z.object({
      query: z.string().describe("The search query for entity discovery"),
    }),
  }
);

export const JinaReaderTool = tool(
  async ({ url }) => {
    try {
      const jina = new JinaClient();
      const response = await jina.read(url, { respondWith: 'markdown' });

      let markdown = "";
      let title = "";

      if (typeof response === 'string') {
        markdown = response;
      } else if (response && typeof response === 'object') {
        const typedResponse = response as JinaResponse<FormattedPageDto | string>;
        const data = typedResponse.data;
        if (data) {
          if (typeof data === 'string') {
            markdown = data;
          } else {
            markdown = data.content || data.text || "";
            title = data.title || "";
          }
        }
      }

      return JSON.stringify({
        markdown,
        title,
      });
    } catch (e: any) {
      return JSON.stringify({ error: e.message || "Jina Reader extraction failed" });
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
      const response = await app.scrape(url, { formats: ["markdown"] });

      if (!(response as any).success && (response as any).error) {
        throw new Error((response as any).error || "Firecrawl failed");
      }

      return JSON.stringify({
        markdown: response.markdown || "",
        metadata: response.metadata || {}
      });
    } catch (e: any) {
      return JSON.stringify({ error: e.message || "Firecrawl extraction failed" });
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
