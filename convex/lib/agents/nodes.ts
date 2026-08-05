"use node";

import { z } from "zod";
import { providerStrategy } from "langchain";
import { RunnableConfig } from "@langchain/core/runnables";
import { VISUAL_KEYWORD_STRATEGIST_PROMPT } from "./prompts.js";
import { 
  googleGemini31FlashLiteT02Key1Max2k, 
  googleGemini31FlashLiteT02Key2Max2k, 
  openAiGpt54MiniT02Max2kTimeout45k 
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
      googleGemini31FlashLiteT02Key1Max2k, 
      googleGemini31FlashLiteT02Key2Max2k, 
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
