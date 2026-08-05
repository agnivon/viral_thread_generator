"use node";
import { StateSchema } from "@langchain/langgraph";
import { z } from "zod";
import { SearchQueriesSchema } from "../nodes.js";

export const TopicThreadFactoryState = new StateSchema({
  topic: z.string(),
  description: z.string().optional(),
  guidance: z.string().optional(),
  manual_hook_selection: z.boolean().default(false),
  research_dossier: z.string().default(""),
  selected_hook: z.string().default(""),
  core_hooks: z.array(z.string()).default(() => []),
  thread_draft: z.array(z.string()).default(() => []),
  virality_score: z.number().optional(),
  critique: z.string().optional(),
  post_critiques: z.array(
    z.object({ 
      post_index: z.number(), 
      critique: z.string(), 
      fix_directive: z.string().optional() 
    })
  ).default(() => []),
  iterations: z.number().default(0),
  urls_to_scrape: z.array(z.string()).default(() => []),
  parse_success: z.boolean().default(true),
  is_approved: z.boolean().default(false),
  is_character_valid: z.boolean().default(true),
  character_critique: z.string().optional(),
  images: z.array(z.string()).default(() => []),
  retries: z.object({
    orchestrator: z.number().default(0),
    scraper: z.number().default(0),
    hook: z.number().default(0),
    writer: z.number().default(0),
    critic: z.number().default(0),
    validator: z.number().default(0),
  }).default({ orchestrator: 0, scraper: 0, hook: 0, writer: 0, critic: 0, validator: 0 }),
  search_queries: SearchQueriesSchema.optional(),
  search_query_generation: z.boolean().default(false),
});

export type TopicThreadFactoryStateType = typeof TopicThreadFactoryState.State;
