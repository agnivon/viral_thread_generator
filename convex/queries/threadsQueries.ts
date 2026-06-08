import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getThreadDraft = query({
  args: {
    id: v.id("threadDrafts"),
  },
  handler: async (ctx, args): Promise<Doc<"threadDrafts"> | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    return await ctx.db.get("threadDrafts", args.id);
  },
});

export const getAllThreadDrafts = query({
  args: {},
  handler: async (ctx): Promise<Doc<"threadDrafts">[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    return await ctx.db.query("threadDrafts").order("desc").collect();
  },
});
