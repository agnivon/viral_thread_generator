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
      url: v.string(),
      userId: v.id("users"),
      raw_markdown: v.optional(v.string()),
      core_hooks: v.optional(v.array(v.string())),
      selected_hook: v.optional(v.union(v.string(), v.null())),
      thread_draft: v.optional(v.array(v.string())),
      critique: v.optional(v.union(v.string(), v.null())),
      iterations: v.optional(v.number()),
      is_approved: v.optional(v.boolean()),
      is_published: v.optional(v.boolean()),
      generation_status: v.union(
        v.literal("processing"),
        v.literal("success"),
        v.literal("failed")
      ),
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
