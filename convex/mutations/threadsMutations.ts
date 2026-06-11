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
    });
  },
});

export const markAsPublished = internalMutation({
  args: { id: v.id("threadDrafts"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { is_published: true });
  },
});
