import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

export const getThreadFactoryState = internalQuery({
  args: {
    id: v.id("threadFactoryStates"),
  },
  handler: async (ctx, args): Promise<Doc<"threadFactoryStates"> | null> => {
    return await ctx.db.get("threadFactoryStates", args.id);
  },
});
