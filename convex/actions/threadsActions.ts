"use node";

import { v } from "convex/values";
import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { ThreadFactoryGraph } from "../lib/agents/graph.js";
import { ThreadsAPI } from "../lib/ThreadsAPI.js";

export const generateThread = internalAction({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"threadFactoryStates">> => {
    console.log(`[generateThread] Started for URL: ${args.url}`);
    const initialState = {
      url: args.url,
      raw_markdown: "",
      core_hooks: [],
      selected_hook: "",
      thread_draft: [],
      critique: "",
      iterations: 0,
      is_approved: false,
    };

    console.log("[generateThread] Invoking ThreadFactoryGraph...");
    const finalState = await ThreadFactoryGraph.invoke(initialState);
    console.log(`[generateThread] ThreadFactoryGraph finished. Iterations: ${finalState.iterations}, Approved: ${finalState.is_approved}`);

    console.log("[generateThread] Saving final state to database...");
    const recordId = await ctx.runMutation(
      internal.mutations.threadsMutations.saveThreadFactoryState,
      {
        url: finalState.url,
        raw_markdown: finalState.raw_markdown,
        core_hooks: finalState.core_hooks,
        selected_hook: finalState.selected_hook,
        thread_draft: finalState.thread_draft,
        critique: finalState.critique,
        iterations: finalState.iterations,
        is_approved: finalState.is_approved,
      }
    );
    console.log(`[generateThread] Final state saved with ID: ${recordId}`);

    return recordId;
  },
});

export const publishThread = action({
  args: {
    id: v.id("threadFactoryStates"),
  },
  handler: async (ctx, args): Promise<{ postIds: string[] }> => {
    console.log(`[publishThread] Action started for state ID: ${args.id}`);

    // 1. Retrieve the latest threads long-lived token
    console.log("[publishThread] Retrieving the latest Threads access token...");
    const tokenDoc = await ctx.runQuery(
      internal.queries.tokensQueries.getLatestToken,
      { platform: "threads", type: "long lived" }
    );
    if (!tokenDoc) {
      console.error("[publishThread] No active Threads access token found in the database.");
      throw new Error("No active Threads access token found in the database.");
    }
    console.log(`[publishThread] Found access token for user ID: ${tokenDoc.userId}`);

    // 2. Retrieve the corresponding threads factory state
    console.log(`[publishThread] Retrieving thread factory state for ID: ${args.id}`);
    const state = await ctx.runQuery(
      internal.queries.threadsQueries.getThreadFactoryState,
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
    const api = new ThreadsAPI(tokenDoc.token, "me");

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
        replyToId = await api.createPost({ text: postText });
      } else {
        replyToId = await api.createReply(replyToId!, { text: postText });
      }
      
      console.log(`[publishThread] [Post ${i + 1}/${postsToPublish.length}] Successfully published! Post ID: ${replyToId}`);
      postIds.push(replyToId);
    }

    console.log("[publishThread] All posts published successfully. Post IDs:", postIds);
    return { postIds };
  },
});
