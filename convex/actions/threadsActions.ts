"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ThreadFactoryGraph } from "../lib/agents/graph.js";
import { ThreadsAPI } from "../lib/ThreadsAPI.js";

export const generateThread = action({
  args: {
    url: v.string(),
    guidance: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"threadDrafts">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    console.log(`[generateThread] Started for URL: ${args.url}`);
    const recordId = await ctx.runMutation(
      internal.mutations.threadsMutations.initializeThreadDraft,
      {
        url: args.url,
        userId: userId,
        guidance: args.guidance,
      }
    );

    const initialState = {
      url: args.url,
      guidance: args.guidance,
      raw_markdown: "",
      core_hooks: [],
      selected_hook: "",
      thread_draft: [],
      critique: "",
      iterations: 0,
      is_approved: false,
    };

    try {
      console.log("[generateThread] Invoking ThreadFactoryGraph...");
      const finalState = await ThreadFactoryGraph.invoke(initialState);
      console.log(`[generateThread] ThreadFactoryGraph finished. Iterations: ${finalState.iterations}, Approved: ${finalState.is_approved}`);

      console.log("[generateThread] Saving final state to database...");
      const { url, guidance, parse_success, retries, is_character_valid, character_critique, ...stateToSave } = finalState;
      await ctx.runMutation(
        internal.mutations.threadsMutations.updateThreadDraftStatus,
        {
          id: recordId,
          generation_status: "success",
          ...stateToSave,
        }
      );
      console.log(`[generateThread] Final state saved with ID: ${recordId}`);
    } catch (err) {
      console.error(`[generateThread] ThreadFactoryGraph failed:`, err);
      await ctx.runMutation(
        internal.mutations.threadsMutations.updateThreadDraftStatus,
        {
          id: recordId,
          generation_status: "failed",
        }
      );
      throw err;
    }

    return recordId;
  },
});

export const publishThread = action({
  args: {
    id: v.id("threadDrafts"),
  },
  handler: async (ctx, args): Promise<{ postIds: string[] }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    console.log(`[publishThread] Action started for state ID: ${args.id}`);

    console.log("[publishThread] Refreshing Threads token if necessary...");
    await ctx.runAction(internal.actions.tokensActions.refreshThreadsToken, { userId: userId });

    // 1. Retrieve the latest threads long-lived token
    console.log("[publishThread] Retrieving the latest Threads access token...");
    const tokenDoc = await ctx.runQuery(
      internal.queries.tokensQueries.getLatestToken,
      { platform: "threads", type: "long lived", userId: userId }
    );
    if (!tokenDoc) {
      console.error("[publishThread] No active Threads access token found in the database.");
      throw new Error("No active Threads access token found in the database.");
    }
    console.log(`[publishThread] Found access token for user ID: ${tokenDoc.userId}`);

    // 2. Retrieve the corresponding threads factory state
    console.log(`[publishThread] Retrieving thread factory state for ID: ${args.id}`);
    const state = await ctx.runQuery(
      api.queries.threadsQueries.getThreadDraft,
      { id: args.id }
    );
    if (!state) {
      console.error(`[publishThread] Thread factory state not found for ID: ${args.id}`);
      throw new Error(`Thread factory state not found for ID: ${args.id}`);
    }

    if (!state.thread_draft || state.thread_draft.length === 0) {
      console.error("[publishThread] Thread factory state has no thread draft content to publish.");
      throw new Error("Thread factory state has no thread draft content to publish.");
    }
    console.log(`[publishThread] Thread factory state loaded. URL: ${state.url}, draft posts count: ${state.thread_draft.length}`);

    // 3. Initialize ThreadsAPI
    console.log("[publishThread] Initializing ThreadsAPI with 'me' as userId...");
    const threadsApi = new ThreadsAPI(tokenDoc.token, "me");

    // 4. Publish the posts in sequence
    // A post containing the url should be appended to the end
    const postsToPublish = [...state.thread_draft, state.url];
    const postIds: string[] = [];
    let replyToId: string | undefined = undefined;

    console.log(`[publishThread] Starting sequence to publish ${postsToPublish.length} posts...`);
    for (let i = 0; i < postsToPublish.length; i++) {
      const postText = postsToPublish[i];
      const isFirst = !replyToId;
      const snippet = postText.length > 60 ? postText.substring(0, 60) + "..." : postText;

      console.log(`[publishThread] [Post ${i + 1}/${postsToPublish.length}] Publishing... Type: ${isFirst ? 'Root Post' : `Reply to ${replyToId}`}. Content preview: "${snippet}"`);
      
      if (isFirst) {
        replyToId = await threadsApi.createPost({ text: postText });
      } else {
        replyToId = await threadsApi.createReply(replyToId!, { text: postText });
      }
      
      console.log(`[publishThread] [Post ${i + 1}/${postsToPublish.length}] Successfully published! Post ID: ${replyToId}`);
      postIds.push(replyToId);
    }

    console.log("[publishThread] All posts published successfully. Post IDs:", postIds);
    await ctx.runMutation(internal.mutations.threadsMutations.markAsPublished, { id: args.id, userId: userId });
    return { postIds };
  },
});
