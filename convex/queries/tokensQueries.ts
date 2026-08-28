import { internalQuery, query } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { platformValidator, tokenTypeValidator } from "../schema";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Retrieves the latest active access token of the specified platform and type.
 */
export const getLatestToken = internalQuery({
  args: {
    platform: platformValidator,
    type: tokenTypeValidator,
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Doc<"accessTokens"> | null> => {
    return await ctx.db
      .query("accessTokens")
      .withIndex("by_userId_platform_active", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform).eq("active", true)
      )
      .order("desc")
      // eslint-disable-next-line @convex-dev/no-filter-in-query
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();
  },
});

/**
 * Checks if there is an active access token of the specified platform and type.
 */
export const hasActiveToken = query({
  args: {
    platform: platformValidator,
    type: tokenTypeValidator,
  },
  handler: async (ctx, args): Promise<boolean> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const token = await ctx.db
      .query("accessTokens")
      .withIndex("by_userId_platform_active", (q) =>
        q.eq("userId", userId).eq("platform", args.platform).eq("active", true)
      )
      .order("desc")
      // eslint-disable-next-line @convex-dev/no-filter-in-query
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();
      
    return !!token;
  },
});

/**
 * Retrieves the active access token of the specified platform and type for a user,
 * only if it is near expiry (less than the specified threshold).
 */
export const getTokensNearExpiry = internalQuery({
  args: {
    userId: v.id("users"),
    platform: platformValidator,
    type: tokenTypeValidator,
    now: v.number(),
    nearExpiryLimit: v.number(), // in milliseconds
  },
  handler: async (ctx, args): Promise<Doc<"accessTokens"> | null> => {
    const threshold = args.now + args.nearExpiryLimit;
    const token = await ctx.db
      .query("accessTokens")
      .withIndex("by_userId_platform_active", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform).eq("active", true)
      )
      .order("desc")
      // eslint-disable-next-line @convex-dev/no-filter-in-query
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();

    if (token && token.expiredIn < threshold) {
      return token;
    }
    return null;
  },
});

/**
 * Retrieves all active access tokens of the specified platform and type that are near expiry.
 */
export const getAllTokensNearExpiry = internalQuery({
  args: {
    platform: platformValidator,
    type: tokenTypeValidator,
    now: v.number(),
    nearExpiryLimit: v.number(), // in milliseconds
  },
  handler: async (ctx, args): Promise<Doc<"accessTokens">[]> => {
    const threshold = args.now + args.nearExpiryLimit;
    const tokens = await ctx.db
      .query("accessTokens")
      .withIndex("by_platform_and_active", (q) =>
        q.eq("platform", args.platform).eq("active", true)
      )
      .collect();

    return tokens.filter((token) => token.type === args.type && token.expiredIn < threshold);
  },
});


