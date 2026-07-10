import { StateSchema } from "@langchain/langgraph";
import { z } from "zod";

export const SocialMediaThreadFactoryState = new StateSchema({
  url: z.string(),
  guidance: z.string().optional(),
  manual_hook_selection: z.boolean().default(false),
  raw_markdown: z.string().default(""),
  research_context: z.string().default(""),
  core_hooks: z.array(z.string()).default(() => []),
  selected_hook: z.string().default(""),
  thread_draft: z.array(z.string()).default(() => []),
  images: z.array(z.string()).optional(),
  critique: z.string().default(""),
  virality_score: z.number().optional(),
  post_critiques: z.array(z.object({ post_index: z.number(), critique: z.string(), fix_directive: z.string().optional() })).default(() => []),
  character_critique: z.string().default(""),
  iterations: z.number().default(0),
  is_approved: z.boolean().default(false),
  is_character_valid: z.boolean().default(true),
  parse_success: z.boolean().default(true),
  retries: z.object({
    scraper: z.number().default(0),
    researcher: z.number().default(0),
    hook: z.number().default(0),
    writer: z.number().default(0),
    critic: z.number().default(0),
    validator: z.number().default(0),
  }).default({ scraper: 0, researcher: 0, hook: 0, writer: 0, critic: 0, validator: 0 }),
});

export type SocialMediaThreadFactoryStateType = typeof SocialMediaThreadFactoryState.State;
