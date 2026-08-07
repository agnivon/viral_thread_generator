import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";

export const getThreadDraft = query({
  args: {
    id: v.id("threadDrafts"),
  },
  handler: async (ctx, args): Promise<Doc<"threadDrafts"> | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const draft = await ctx.db.get("threadDrafts", args.id);
    if (draft && draft.userId !== userId) {
      throw new Error("Unauthorized");
    }
    return draft;
  },
});

export const getAllThreadDrafts = query({
  args: {},
  handler: async (ctx): Promise<Doc<"threadDrafts">[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    return await ctx.db
      .query("threadDrafts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getPaginatedThreadDrafts = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    return await ctx.db
      .query("threadDrafts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getThreadDraftInternal = internalQuery({
  args: {
    id: v.id("threadDrafts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Doc<"threadDrafts"> | null> => {
    const draft = await ctx.db.get("threadDrafts", args.id);
    if (draft && draft.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    return draft;
  },
});
