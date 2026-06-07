// NOTE: You can remove this file. Declaring the shape
// of the database is entirely optional in Convex.
// See https://docs.convex.dev/database/schemas.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Export validators for reuse throughout the codebase
export const platformValidator = v.union(v.literal("threads"));

export const tokenTypeValidator = v.union(
  v.literal("short lived"),
  v.literal("long lived"),
  v.literal("app")
);

export default defineSchema(
  {
    accessTokens: defineTable({
      token: v.string(),
      userId: v.string(),
      platform: platformValidator,
      type: tokenTypeValidator,
      active: v.boolean(),
      expiredIn: v.number(),
      lastCreated: v.number(),
      lastUpdated: v.number(),
    })
      .index("by_token", ["token"])
      .index("by_platform_and_active", ["platform", "active"]),
    threadFactoryStates: defineTable({
      url: v.string(),
      raw_markdown: v.string(),
      core_hooks: v.array(v.string()),
      selected_hook: v.string(),
      thread_draft: v.array(v.string()),
      critique: v.string(),
      iterations: v.number(),
      is_approved: v.boolean(),
    }),
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
