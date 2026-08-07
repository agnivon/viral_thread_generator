import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { threadDraftInputValidator, commonThreadDraftArgs } from "../schema";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";

export const saveThreadDraft = internalMutation({
  args: {
    input_field: v.optional(threadDraftInputValidator),
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
      generation_status: "success" as const,
    });
  },
});

export const initializeThreadDraft = internalMutation({
  args: {
    userId: v.id("users"),
    ...commonThreadDraftArgs,
    agent: v.optional(v.string()),
    input_field: v.optional(threadDraftInputValidator),
  },
  handler: async (ctx, args): Promise<Id<"threadDrafts">> => {
    const insertFields = {
      input_field: args.input_field,
      userId: args.userId,
      guidance: args.guidance,
      manual_hook_selection: args.manual_hook_selection,
      search_query_generation: args.search_query_generation,
      agent: args.agent || "news",
      is_approved: false,
      is_published: false,
      generation_status: "processing" as const,
      publication_status: "not_published" as const,
    };
    return await ctx.db.insert("threadDrafts", insertFields);
  },
});

export const updateThreadDraft = internalMutation({
  args: {
    id: v.id("threadDrafts"),
    input_field: v.optional(threadDraftInputValidator),
    generation_status: v.optional(v.union(v.literal("success"), v.literal("failed"), v.literal("processing"), v.literal("hook selection"))),
    publication_status: v.optional(v.union(v.literal("not_published"), v.literal("publishing"), v.literal("success"), v.literal("failed"))),
    ...commonThreadDraftArgs,
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
    const draft = await ctx.db.get("threadDrafts", args.id);
    if (draft && draft.userId !== userId) {
      throw new Error("Unauthorized");
    }
    if (draft) {
      await ctx.db.delete("threadDrafts", args.id);
    }
  },
});
