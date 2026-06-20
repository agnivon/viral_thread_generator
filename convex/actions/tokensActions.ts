"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { ThreadsAuthAPI } from "../lib/threads/api";
import { v } from "convex/values";

/**
 * Action to retrieve the latest token, check if it's near expiry (less than 24 hrs),
 * and refresh it via Threads API if needed, updating the database.
 */
export const refreshThreadsToken = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{ tokenId: Id<"accessTokens">; expiresIn: number; refreshed: boolean }> => {
    const now = Date.now();
    const nearExpiryLimit = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

    // 1. Retrieve the token if it is near expiry
    const tokenToRefresh: Doc<"accessTokens"> | null = await ctx.runQuery(
      internal.queries.tokensQueries.getTokensNearExpiry,
      {
        userId: args.userId,
        platform: "threads",
        type: "long lived",
        now,
        nearExpiryLimit,
      }
    );

    if (tokenToRefresh) {
      // 2. Use Threads API module to refresh it
      const refreshResult = await ThreadsAuthAPI.refreshAccessToken(tokenToRefresh.token);

      // 3. Update the database with the new token
      const newTokenId: Id<"accessTokens"> = await ctx.runMutation(
        internal.mutations.tokensMutations.updateToken,
        {
          oldTokenId: tokenToRefresh._id,
          userId: args.userId,
          platformUserId: tokenToRefresh.platformUserId,
          newToken: refreshResult.access_token,
          expiresIn: refreshResult.expires_in,
          platform: "threads",
          type: "long lived",
        }
      );

      return {
        tokenId: newTokenId,
        expiresIn: refreshResult.expires_in,
        refreshed: true,
      };
    }

    // 4. Not near expiry or no token. Fetch the latest active token to return its remaining duration.
    const latestTokenDoc: Doc<"accessTokens"> | null = await ctx.runQuery(
      internal.queries.tokensQueries.getLatestToken,
      { platform: "threads", type: "long lived", userId: args.userId }
    );

    if (!latestTokenDoc) {
      throw new Error("No active Threads access token found in the database to refresh.");
    }

    const timeRemaining = latestTokenDoc.expiredIn - now;
    return {
      tokenId: latestTokenDoc._id,
      expiresIn: Math.round(timeRemaining / 1000),
      refreshed: false,
    };
  },
});

/**
 * Action to bulk-refresh all Threads long-lived access tokens near expiry (less than 48 hrs).
 */
export const refreshAllThreadsTokens = internalAction({
  args: {},
  handler: async (ctx, _args): Promise<{ refreshedCount: number; errors: string[] }> => {
    const now = Date.now();
    const nearExpiryLimit = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

    const tokensToRefresh: Doc<"accessTokens">[] = await ctx.runQuery(
      internal.queries.tokensQueries.getAllTokensNearExpiry,
      {
        platform: "threads",
        type: "long lived",
        now,
        nearExpiryLimit,
      }
    );

    let refreshedCount = 0;
    const errors: string[] = [];

    for (const tokenToRefresh of tokensToRefresh) {
      try {
        const refreshResult = await ThreadsAuthAPI.refreshAccessToken(tokenToRefresh.token);

        await ctx.runMutation(
          internal.mutations.tokensMutations.updateToken,
          {
            oldTokenId: tokenToRefresh._id,
            userId: tokenToRefresh.userId,
            platformUserId: tokenToRefresh.platformUserId,
            newToken: refreshResult.access_token,
            expiresIn: refreshResult.expires_in,
            platform: "threads",
            type: "long lived",
          }
        );
        refreshedCount++;
      } catch (_e) {
        const errorMsg = _e instanceof Error ? _e.message : String(_e);
        errors.push(`Failed to refresh token for user ${tokenToRefresh.userId}: ${errorMsg}`);
      }
    }

    return {
      refreshedCount,
      errors,
    };
  },
});

