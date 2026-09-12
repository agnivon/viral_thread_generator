import { v, Infer } from "convex/values";
import {
  internalQuery,
  query,
  internalMutation,
  MutationCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { platformValidator, tokenTypeValidator } from "./schema";
import { getAuthUserId } from "@convex-dev/auth/server";

type Platform = Infer<typeof platformValidator>;

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
 * Checks if there is an active access token of the specified platform and type for the authenticated user.
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

/**
 * Helper function to delete all tokens for a platform.
 */
async function deleteTokensByPlatformInternal(ctx: MutationCtx, platform: Platform, userId: Id<"users">) {
  const existingTokens = await ctx.db
    .query("accessTokens")
    .withIndex("by_userId_platform_active", (q) =>
      q.eq("userId", userId).eq("platform", platform)
    )
    .collect();

  for (const tokenDoc of existingTokens) {
    await ctx.db.delete("accessTokens", tokenDoc._id);
  }
}

/**
 * Mutation to delete tokens belonging to a particular platform.
 */
export const deleteTokensByPlatform = internalMutation({
  args: {
    platform: platformValidator,
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<void> => {
    await deleteTokensByPlatformInternal(ctx, args.platform, args.userId);
  },
});

/**
 * Updates the database with the new access token.
 * If an old token ID is provided, it is deleted.
 */
export const updateToken = internalMutation({
  args: {
    oldTokenId: v.optional(v.id("accessTokens")),
    userId: v.id("users"),
    platformUserId: v.string(),
    newToken: v.string(),
    expiresIn: v.number(), // in seconds
    platform: platformValidator,
    type: tokenTypeValidator,
  },
  handler: async (ctx, args): Promise<Id<"accessTokens">> => {
    const now = Date.now();

    // 1. Delete the old token if provided
    if (args.oldTokenId) {
      await ctx.db.delete("accessTokens", args.oldTokenId);
    }

    // 2. Insert the new token
    const tokenId = await ctx.db.insert("accessTokens", {
      token: args.newToken,
      userId: args.userId,
      platformUserId: args.platformUserId,
      platform: args.platform,
      type: args.type,
      active: true,
      expiredIn: now + args.expiresIn * 1000,
      lastCreated: now,
      lastUpdated: now,
    });

    return tokenId;
  },
});

/**
 * Stores a single access token in the database.
 */
export const storeAuthToken = internalMutation({
  args: {
    userId: v.id("users"),
    platformUserId: v.string(),
    platform: platformValidator,
    token: v.string(),
    type: tokenTypeValidator,
    active: v.boolean(),
    expiresIn: v.number(), // token expires_in in seconds
  },
  handler: async (ctx, args): Promise<Id<"accessTokens">> => {
    const now = Date.now();
    const tokenId = await ctx.db.insert("accessTokens", {
      token: args.token,
      userId: args.userId,
      platformUserId: args.platformUserId,
      platform: args.platform,
      type: args.type,
      active: args.active,
      expiredIn: now + args.expiresIn * 1000,
      lastCreated: now,
      lastUpdated: now,
    });
    return tokenId;
  },
});
