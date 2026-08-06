"use node";

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { tavily } from "@tavily/core";
import "dotenv/config";

export { 
  WebScraperTool, 
  TopicContextExpanderTool, 
  ContentAuthenticityCheckerTool 
} from "../news/tools.js";

export const BackgroundDossierTool = tool(
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
      results: response.results // more context than the authenticity checker
    });
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
