import { internalQuery } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { platformValidator, tokenTypeValidator } from "../schema";

/**
 * Retrieves the latest active access token of the specified platform and type.
 */
export const getLatestToken = internalQuery({
  args: {
    platform: platformValidator,
    type: tokenTypeValidator,
  },
  handler: async (ctx, args): Promise<Doc<"accessTokens"> | null> => {
    return await ctx.db
      .query("accessTokens")
      .withIndex("by_platform_and_active", (q) =>
        q.eq("platform", args.platform as any).eq("active", true)
      )
      .order("desc")
      // eslint-disable-next-line @convex-dev/no-filter-in-query
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();
  },
});
