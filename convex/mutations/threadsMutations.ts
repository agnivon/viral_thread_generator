import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { vOnCompleteArgs } from "@convex-dev/workpool";
import { Id } from "../_generated/dataModel";

export const saveThreadDraft = internalMutation({
  args: {
    url: v.string(),
    raw_markdown: v.string(),
    core_hooks: v.array(v.string()),
    selected_hook: v.string(),
    thread_draft: v.array(v.string()),
    critique: v.union(v.string(), v.null()),
    virality_score: v.optional(v.number()),
    post_critiques: v.optional(v.array(v.object({
      post_index: v.number(),
      critique: v.string(),
      fix_directive: v.optional(v.string())
    }))),
    research_context: v.optional(v.string()),
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
    guidance: v.optional(v.string()),
    manual_hook_selection: v.optional(v.boolean()),
    agent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"threadDrafts">> => {
    return await ctx.db.insert("threadDrafts", {
      url: args.url,
      userId: args.userId,
      guidance: args.guidance,
      manual_hook_selection: args.manual_hook_selection,
      agent: args.agent || "news",
      is_approved: false,
      is_published: false,
      generation_status: "processing",
      publication_status: "not_published",
    });
  },
});

export const updateThreadDraft = internalMutation({
  args: {
    id: v.id("threadDrafts"),
    generation_status: v.optional(v.union(v.literal("success"), v.literal("failed"), v.literal("processing"), v.literal("hook selection"))),
    publication_status: v.optional(v.union(v.literal("not_published"), v.literal("publishing"), v.literal("success"), v.literal("failed"))),
    manual_hook_selection: v.optional(v.boolean()),
    raw_markdown: v.optional(v.string()),
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
    research_context: v.optional(v.string()),
    iterations: v.optional(v.number()),
    is_approved: v.optional(v.boolean()),
    is_published: v.optional(v.boolean()),
    guidance: v.optional(v.string()),
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

export const deleteThreadDraftInternal = internalMutation({
  args: {
    id: v.id("threadDrafts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const draft = await ctx.db.get(args.id);
    if (draft && draft.userId !== userId) {
      throw new Error("Unauthorized");
    }
    if (draft) {
      await ctx.db.delete(args.id);
    }
  },
});
