import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const saveThreadDraft = internalMutation({
  args: {
    url: v.string(),
    raw_markdown: v.string(),
    core_hooks: v.array(v.string()),
    selected_hook: v.string(),
    thread_draft: v.array(v.string()),
    critique: v.union(v.string(), v.null()),
    iterations: v.number(),
    is_approved: v.boolean(),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Id<"threadDrafts">> => {
    return await ctx.db.insert("threadDrafts", {
      ...args,
      is_published: false,
      generation_status: "success",
    });
  },
});

export const initializeThreadDraft = internalMutation({
  args: {
    url: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Id<"threadDrafts">> => {
    return await ctx.db.insert("threadDrafts", {
      url: args.url,
      userId: args.userId,
      is_approved: false,
      is_published: false,
      generation_status: "processing",
    });
  },
});

export const updateThreadDraftStatus = internalMutation({
  args: {
    id: v.id("threadDrafts"),
    generation_status: v.union(v.literal("success"), v.literal("failed")),
    raw_markdown: v.optional(v.string()),
    core_hooks: v.optional(v.array(v.string())),
    selected_hook: v.optional(v.union(v.string(), v.null())),
    thread_draft: v.optional(v.array(v.string())),
    critique: v.optional(v.union(v.string(), v.null())),
    iterations: v.optional(v.number()),
    is_approved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch("threadDrafts", id, updates);
  },
});

export const markAsPublished = internalMutation({
  args: { id: v.id("threadDrafts"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch("threadDrafts", args.id, { is_published: true });
  },
});
