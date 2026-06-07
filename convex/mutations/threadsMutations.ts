import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const saveThreadFactoryState = internalMutation({
  args: {
    url: v.string(),
    raw_markdown: v.string(),
    core_hooks: v.array(v.string()),
    selected_hook: v.string(),
    thread_draft: v.array(v.string()),
    critique: v.string(),
    iterations: v.number(),
    is_approved: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"threadFactoryStates">> => {
    return await ctx.db.insert("threadFactoryStates", args);
  },
});
