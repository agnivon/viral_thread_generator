"use node";

import { z } from "zod";
import { providerStrategy } from "langchain";
import { RunnableConfig } from "@langchain/core/runnables";
import { SEARCH_QUERY_OPTIMIZER_PROMPT } from "./prompts.js";
import { 
  googleGemini31FlashLiteT01Key1,
  googleGemini31FlashLiteT01Key2,
  deepSeekFlashT01JsonReasoningNone
} from "./models.js";
import { buildAgents, invokeWithFallbacks } from "./utils.js";

export const OptimizedSearchQuerySchema = z.object({
  optimized_query: z.string().describe("finalized boolean search string")
});

export type OptimizedSearchQueryType = z.infer<typeof OptimizedSearchQuerySchema>;

export const searchQueryOptimizerAgents = buildAgents<OptimizedSearchQueryType>(
  [
    googleGemini31FlashLiteT01Key1,
    googleGemini31FlashLiteT01Key2,
    deepSeekFlashT01JsonReasoningNone
  ],
  {
    systemPrompt: SEARCH_QUERY_OPTIMIZER_PROMPT,
    responseFormat: {
      google: providerStrategy(OptimizedSearchQuerySchema),
      deepseek: providerStrategy(OptimizedSearchQuerySchema)
    }
  }
);

export const SearchQueryOptimizerNode = async (
  state: { 
    keyword: string, 
    relatedKeywords: string[], 
    traffic: number, 
    trafficGrowthRate: number 
  },
  config?: RunnableConfig
) => {
  let result;
  let parse_success = false;

  const content = [
    `main_keyword: ${state.keyword}`,
    `related_keywords: ${JSON.stringify(state.relatedKeywords)}`,
    `traffic: ${state.traffic}`,
    `traffic_growth_rate: ${state.trafficGrowthRate}`
  ].join("\n");

  try {
    result = await invokeWithFallbacks(searchQueryOptimizerAgents, {
      messages: [{ role: "user", content: content }]
    }, { ...config, timeout: 45000 });
    parse_success = true;
  } catch (_e) {
    parse_success = false;
  }

  if (parse_success && result?.structuredResponse) {
    const parsed = OptimizedSearchQuerySchema.safeParse(result.structuredResponse);
    if (parsed.success) {
      return {
        optimized_query: parsed.data.optimized_query,
      };
    }
  }
  console.warn("SearchQueryOptimizerNode output failed");
  return {
    optimized_query: undefined
  };
};

export function extractSelectedHook(input: unknown): string {
  if (typeof input === "string") {
    return input.trim();
  }
  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;
    const val = obj.selected_hook ?? obj.selectedHook ?? obj.hook ?? obj.hookText;
    if (typeof val === "string") {
      return val.trim();
    }
  }
  if (typeof input === "number" || typeof input === "boolean") {
    return String(input);
  }
  return "";
}

