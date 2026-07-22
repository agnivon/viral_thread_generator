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
  async ({ query }) => {
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const response = await client.search(query, {
      searchDepth: "advanced",
      includeAnswer: true,
    });

    return JSON.stringify({
      answer: response.answer,
      results: response.results.slice(0, 5) // more context than the authenticity checker
    });
  },
  {
    name: "background_dossier_builder",
    description: "Searches the web to build a comprehensive background dossier on a topic, extracting core entities, claims, or events.",
    schema: z.object({
      query: z.string().describe("The search query to research"),
    }),
  }
);
