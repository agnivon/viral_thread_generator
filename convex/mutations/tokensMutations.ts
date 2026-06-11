import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { platformValidator, tokenTypeValidator } from "../schema";

/**
 * Helper function to delete all tokens for a platform.
 */
async function deleteTokensByPlatformInternal(ctx: any, platform: string, userId: string) {
  const existingTokens = await ctx.db
    .query("accessTokens")
    .withIndex("by_userId_platform_active", (q: any) =>
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
      platform: args.platform as any,
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
      platform: args.platform as any,
      type: args.type,
      active: args.active,
      expiredIn: now + args.expiresIn * 1000,
      lastCreated: now,
      lastUpdated: now,
    });
    return tokenId;
  },
});
