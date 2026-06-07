"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { ThreadsAuthAPI } from "../lib/ThreadsAPI";

/**
 * Action to retrieve the latest token, check if it's near expiry (less than 24 hrs),
 * and refresh it via Threads API if needed, updating the database.
 */
export const refreshThreadsToken = internalAction({
  args: {},
  handler: async (ctx): Promise<{ tokenId: Id<"accessTokens">; expiresIn: number; refreshed: boolean }> => {
    // 1. Retrieve the latest token
    const latestTokenDoc: Doc<"accessTokens"> | null = await ctx.runQuery(
      internal.queries.tokensQueries.getLatestToken,
      { platform: "threads", type: "long lived" }
    );

    if (!latestTokenDoc) {
      throw new Error("No active Threads access token found in the database to refresh.");
    }

    // 2. Check if the token is near expiry (less than 24 hours)
    const now = Date.now();
    const timeRemaining = latestTokenDoc.expiredIn - now;
    const nearExpiryLimit = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (timeRemaining > nearExpiryLimit) {
      // Not near expiry, return the existing token details
      return {
        tokenId: latestTokenDoc._id,
        expiresIn: Math.round(timeRemaining / 1000),
        refreshed: false,
      };
    }

    // 3. Use Threads API module to refresh it
    const refreshResult = await ThreadsAuthAPI.refreshAccessToken(latestTokenDoc.token);

    // 4. Update the database with the new token
    const newTokenId: Id<"accessTokens"> = await ctx.runMutation(
      internal.mutations.tokensMutations.updateToken,
      {
        oldTokenId: latestTokenDoc._id,
        userId: latestTokenDoc.userId,
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
  },
});
