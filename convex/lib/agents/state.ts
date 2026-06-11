import { StateSchema } from "@langchain/langgraph";
import { z } from "zod";

export const ThreadFactoryState = new StateSchema({
  url: z.string(),
  raw_markdown: z.string().default(""),
  core_hooks: z.array(z.string()).default(() => []),
  selected_hook: z.string().default(""),
  thread_draft: z.array(z.string()).default(() => []),
  critique: z.string().default(""),
  iterations: z.number().default(0),
  is_approved: z.boolean().default(false),
  is_character_valid: z.boolean().default(true),
  parse_success: z.boolean().default(true),
  retries: z.object({
    scraper: z.number().default(0),
    hook: z.number().default(0),
    writer: z.number().default(0),
    critic: z.number().default(0),
  }).default({ scraper: 0, hook: 0, writer: 0, critic: 0 }),
});

export type ThreadFactoryStateType = typeof ThreadFactoryState.State;
