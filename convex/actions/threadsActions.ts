"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { NewsThreadFactoryGraph } from "../lib/agents/graph.js";
import { ThreadsAPI } from "../lib/threads/api.js";
import { generationPool, publicationPool } from "../lib/workpool/index.js";

export const enqueueNewsThreadGeneration = action({
  args: {
    requests: v.array(v.object({
      url: v.string(),
      guidance: v.optional(v.string()),
    }))
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const payload = args.requests.map(req => ({
      url: req.url,
      guidance: req.guidance,
      userId,
    }));

    await generationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.generateNewsThread, payload);
  },
});

export const generateNewsThread = internalAction({
  args: {
    url: v.string(),
    guidance: v.optional(v.string()),
    userId: v.id("users"),
    recordId: v.optional(v.id("threadDrafts")),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    console.log(`[generateNewsThread] Started for URL: ${args.url}`);

    let recordId = args.recordId;
    if (!recordId) {
      recordId = await ctx.runMutation(
        internal.mutations.threadsMutations.initializeThreadDraft,
        {
          url: args.url,
          userId: args.userId,
          guidance: args.guidance,
        }
      );
    } else {
      await ctx.runMutation(
        internal.mutations.threadsMutations.updateThreadDraftStatus,
        {
          id: recordId,
          generation_status: "processing",
          is_approved: false,
          iterations: 0,
          guidance: args.guidance,
        }
      );
    }


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

    console.log("[generateNewsThread] Invoking NewsThreadFactoryGraph...");

    const finalState = await NewsThreadFactoryGraph.invoke(initialState);

    console.log(`[generateNewsThread] NewsThreadFactoryGraph finished. Iterations: ${finalState.iterations}, Approved: ${finalState.is_approved}`);

    console.log("[generateNewsThread] Saving final state to database...");
    const { url, guidance, parse_success, retries, is_character_valid, character_critique, ...stateToSave } = finalState;
    
    try {
      await ctx.runMutation(
        internal.mutations.threadsMutations.updateThreadDraftStatus,
        {
          id: recordId,
          ...stateToSave,
          generation_status: "success",
        }
      );
      console.log(`[generateNewsThread] Final state saved with ID: ${recordId}`);
    } catch (e) {
      await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraftStatus, {
        id: recordId,
        generation_status: "failed",
      });
      throw e;
    }
    
    await awaitAllCallbacks();
    return { recordId };
  },
});

export const enqueueThreadRegeneration = action({
  args: {
    ids: v.array(v.id("threadDrafts")),
    guidance: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const payload = [];
    for (const id of args.ids) {
      const draft = await ctx.runQuery(internal.queries.threadsQueries.getThreadDraftInternal, { id, userId });
      if (!draft) {
        throw new Error(`Draft ${id} not found or unauthorized`);
      }
      const guidance = args.guidance !== undefined ? args.guidance : draft.guidance;
      payload.push({
        url: draft.url,
        guidance: guidance,
        userId,
        recordId: id,
      });
    }

    await generationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.generateNewsThread, payload);
  },
});

export const enqueueThreadPublication = action({
  args: {
    ids: v.array(v.id("threadDrafts")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const payload = args.ids.map(id => ({ id, userId }));

    await publicationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.publishThread, payload);
  },
});

export const publishThread = internalAction({
  args: {
    id: v.id("threadDrafts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ postIds: string[] }> => {
    const userId = args.userId;

    console.log(`[publishThread] Action started for state ID: ${args.id}`);

    try {
      await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraftStatus, {
        id: args.id,
        publication_status: "publishing",
      });

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
      internal.queries.threadsQueries.getThreadDraftInternal,
      { id: args.id, userId: args.userId }
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
      console.log(`[publishThread] [Post ${i + 1}/${postsToPublish.length}] Successfully published! Post ID: ${replyToId}`);
      postIds.push(replyToId);
    }

    await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraftStatus, {
      id: args.id,
      publication_status: "success",
      is_published: true,
    });

    console.log("[publishThread] All posts published successfully. Post IDs:", postIds);
    return { postIds };
    } catch (e) {
      await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraftStatus, {
        id: args.id,
        publication_status: "failed",
      });
      throw e;
    }
  },
});
