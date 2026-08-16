"use node";

import { z } from "zod";
import { providerStrategy } from "langchain";
import { RunnableConfig } from "@langchain/core/runnables";
import { VISUAL_KEYWORD_STRATEGIST_PROMPT, SEARCH_QUERY_OPTIMIZER_PROMPT } from "./prompts.js";
import { 
  googleGemini31FlashLiteT02Key1Max3k, 
  googleGemini31FlashLiteT02Key2Max3k, 
  openAiGpt54MiniT02Max2kTimeout45k,
  googleGemini31FlashLiteT01Key1Max3k,
  googleGemini31FlashLiteT01Key2Max3k,
  openRouterFreeT01
} from "./models.js";
import { buildAgents, invokeWithFallbacks } from "./utils.js";

export const SearchQueriesSchema = z.object({
  hero_visual_query: z.string().describe("concrete 2-4 word query for cover image"),
  post_visual_queries: z.array(
    z.object({
      post_index: z.number(),
      image_search_query: z.string().describe("concrete 2-4 word image query"),
      video_search_query: z.string().describe("concrete 2-4 word stock video query"),
    })
  )
});

export type SearchQueriesType = z.infer<typeof SearchQueriesSchema>;

export const VisualKeywordStrategistNode = async (
  state: { thread_draft: string[] },
  config?: RunnableConfig
) => {
  const agents = buildAgents(
    [
      googleGemini31FlashLiteT02Key1Max3k, 
      googleGemini31FlashLiteT02Key2Max3k, 
      openAiGpt54MiniT02Max2kTimeout45k
    ],
    {
      systemPrompt: VISUAL_KEYWORD_STRATEGIST_PROMPT,
      responseFormat: providerStrategy(SearchQueriesSchema)
    }
  );

  let result;
  let parse_success = false;

  try {
    result = await invokeWithFallbacks(agents, {
      messages: [{ role: "user", content: `<THREAD_DRAFT>\n${state.thread_draft.join("\n\n")}\n</THREAD_DRAFT>` }]
    }, config);
    parse_success = true;
  } catch (_e) {
    parse_success = false;
  }

  if (parse_success && result?.structuredResponse) {
    return {
      search_queries: result.structuredResponse as SearchQueriesType,
    };
  } else {
    console.warn("VisualKeywordStrategistNode output failed");
    return {
      search_queries: undefined
    };
  }
};

export const OptimizedSearchQuerySchema = z.object({
  optimized_query: z.string().describe("finalized boolean search string")
});

export type OptimizedSearchQueryType = z.infer<typeof OptimizedSearchQuerySchema>;

export const SearchQueryOptimizerNode = async (
  state: { 
    keyword: string, 
    relatedKeywords: string[], 
    traffic: number, 
    trafficGrowthRate: number 
  },
  config?: RunnableConfig
) => {
  const agents = buildAgents(
    [
      googleGemini31FlashLiteT01Key1Max3k,
      googleGemini31FlashLiteT01Key2Max3k,
      openRouterFreeT01
    ],
    {
      systemPrompt: SEARCH_QUERY_OPTIMIZER_PROMPT,
      responseFormat: providerStrategy(OptimizedSearchQuerySchema)
    }
  );

  let result;
  let parse_success = false;

  const content = [
    `main_keyword: ${state.keyword}`,
    `related_keywords: ${JSON.stringify(state.relatedKeywords)}`,
    `traffic: ${state.traffic}`,
    `traffic_growth_rate: ${state.trafficGrowthRate}`
  ].join("\n");

  try {
    result = await invokeWithFallbacks(agents, {
      messages: [{ role: "user", content: content }]
    }, config);
    parse_success = true;
  } catch (_e) {
    parse_success = false;
  }

  if (parse_success && result?.structuredResponse) {
    return {
      optimized_query: (result.structuredResponse as OptimizedSearchQueryType).optimized_query,
    };
  } else {
    console.warn("SearchQueryOptimizerNode output failed");
    return {
      optimized_query: undefined
    };
  }
};
