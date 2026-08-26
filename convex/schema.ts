// NOTE: You can remove this file. Declaring the shape
// of the database is entirely optional in Convex.
// See https://docs.convex.dev/database/schemas.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Export validators for reuse throughout the codebase
export const platformValidator = v.union(v.literal("threads"));

export const tokenTypeValidator = v.union(
  v.literal("short lived"),
  v.literal("long lived"),
  v.literal("app")
);

const NewsInput = v.object({
  agent: v.literal("news"),
  url: v.string(),
});

const SocialMediaInput = v.object({
  agent: v.literal("social_media"),
  url: v.string(),
});

const TopicInput = v.object({
  agent: v.literal("topic"),
  topic: v.string(),
  description: v.optional(v.string()),
});

export const threadDraftInputValidator = v.union(NewsInput, SocialMediaInput, TopicInput);

export const commonThreadDraftArgs = {
  guidance: v.optional(v.string()),
  manual_hook_selection: v.optional(v.boolean()),
  search_query_generation: v.optional(v.boolean()),
};

export default defineSchema(
  {
    ...authTables,
    accessTokens: defineTable({
      token: v.string(),
      userId: v.id("users"),
      platformUserId: v.string(),
      platform: platformValidator,
      type: tokenTypeValidator,
      active: v.boolean(),
      expiredIn: v.number(),
      lastCreated: v.number(),
      lastUpdated: v.number(),
    })
      .index("by_token", ["token"])
      .index("by_platform_and_active", ["platform", "active"])
      .index("by_userId_platform_active", ["userId", "platform", "active"]),
    threadDrafts: defineTable({
      input_field: v.optional(threadDraftInputValidator),
      agent: v.optional(v.string()),
      userId: v.id("users"),
      raw_markdown: v.optional(v.string()),
      research_context: v.optional(v.string()),
      ...commonThreadDraftArgs,
      core_hooks: v.optional(v.array(v.string())),
      selected_hook: v.optional(v.union(v.string(), v.null())),
      thread_draft: v.optional(v.array(v.string())),
      images: v.optional(v.array(v.string())),
      critique: v.optional(v.union(v.string(), v.null())),
      virality_score: v.optional(v.number()),
      post_critiques: v.optional(v.array(v.object({
        post_index: v.number(),
        critique: v.string(),
        fix_directive: v.optional(v.string())
      }))),
      iterations: v.optional(v.number()),
      is_approved: v.optional(v.boolean()),
      is_published: v.optional(v.boolean()),
      search_queries: v.optional(v.object({
        hero_visual_query: v.string(),
        post_visual_queries: v.array(
          v.object({
            post_index: v.number(),
            image_search_query: v.string(),
            video_search_query: v.string(),
          })
        )
      })),
      generation_status: v.union(
        v.literal("processing"),
        v.literal("hook selection"),
        v.literal("success"),
        v.literal("failed")
      ),
      failure_reason: v.optional(v.string()),
      publication_status: v.optional(v.union(
        v.literal("not_published"),
        v.literal("publishing"),
        v.literal("success"),
        v.literal("failed")
      )),
      publication_error: v.optional(v.string()),
    }).index("by_userId", ["userId"]),
  },
  // If you ever get an error about schema mismatch
  // between your data and your schema, and you cannot
  // change the schema to match the current data in your database,
  // you can:
  //  1. Use the dashboard to delete tables or individual documents
  //     that are causing the error.
  //  2. Change this option to `false` and make changes to the data
  //     freely, ignoring the schema. Don't forget to change back to `true`!
  { schemaValidation: true }
);
