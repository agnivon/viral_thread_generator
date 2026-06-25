"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { isInterrupted, Command } from "@langchain/langgraph";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { NewsThreadFactoryGraph } from "../lib/agents/graph.js";
import { ThreadsAPI } from "../lib/threads/api.js";
import { generationPool, publicationPool } from "../lib/workpool/index.js";

async function requireAuthUserId(ctx: any): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

function createInitialState(args: { url: string; guidance?: string; manual_hook_selection?: boolean }) {
  return {
    url: args.url,
    guidance: args.guidance,
    manual_hook_selection: args.manual_hook_selection ?? false,
    raw_markdown: "",
    core_hooks: [],
    selected_hook: "",
    thread_draft: [],
    critique: "",
    iterations: 0,
    is_approved: false,
  };
}

async function handleGraphCompletion(ctx: any, recordId: Id<"threadDrafts">, finalState: any) {
  const {
    url,
    guidance,
    manual_hook_selection,
    parse_success,
    retries,
    is_character_valid,
    character_critique,
    __interrupt__,
    ...stateToSave
  } = finalState;

  const interrupted = isInterrupted(finalState) || (await NewsThreadFactoryGraph.getState({ configurable: { thread_id: recordId } })).next.length > 0;

  await ctx.runMutation(
    internal.mutations.threadsMutations.updateThreadDraft,
    {
      id: recordId,
      ...stateToSave,
      generation_status: interrupted ? "hook selection" : "success",
    }
  );
  console.log(`[handleGraphCompletion] State saved with ID: ${recordId}. Interrupted: ${interrupted}`);

  await awaitAllCallbacks();
  return { recordId };
}

export const enqueueNewsThreadGeneration = action({
  args: {
    requests: v.array(v.object({
      url: v.string(),
      guidance: v.optional(v.string()),
      manual_hook_selection: v.optional(v.boolean()),
    }))
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const payload = args.requests.map(req => ({
      url: req.url,
      guidance: req.guidance,
      manual_hook_selection: req.manual_hook_selection,
      userId,
    }));

    await generationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.generateNewsThread, payload);
  },
});

export const generateNewsThread = internalAction({
  args: {
    url: v.string(),
    guidance: v.optional(v.string()),
    manual_hook_selection: v.optional(v.boolean()),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    let recordId: Id<"threadDrafts"> | undefined;
    try {
      console.log(`[generateNewsThread] Started for URL: ${args.url}`);

      recordId = await ctx.runMutation(
        internal.mutations.threadsMutations.initializeThreadDraft,
        {
          url: args.url,
          userId: args.userId,
          guidance: args.guidance,
          manual_hook_selection: args.manual_hook_selection,
        }
      );

      const initialState = createInitialState(args);

      console.log("[generateNewsThread] Invoking NewsThreadFactoryGraph from scratch...");

      const finalState = await NewsThreadFactoryGraph.invoke(initialState, {
        configurable: { thread_id: recordId }
      });

      console.log(`[generateNewsThread] NewsThreadFactoryGraph finished. Iterations: ${finalState.iterations}, Approved: ${finalState.is_approved}`);
      return await handleGraphCompletion(ctx, recordId, finalState);
    } catch (e) {
      if (recordId) {
        await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
          id: recordId,
          generation_status: "failed",
        });
      }
      throw e;
    }
  },
});

export const regenerateNewsThread = internalAction({
  args: {
    url: v.string(),
    guidance: v.optional(v.string()),
    manual_hook_selection: v.optional(v.boolean()),
    userId: v.id("users"),
    recordId: v.id("threadDrafts"),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    try {
      console.log(`[regenerateNewsThread] Started for URL: ${args.url}, Record: ${args.recordId}`);

      await ctx.runMutation(
        internal.mutations.threadsMutations.updateThreadDraft,
        {
          id: args.recordId,
          generation_status: "processing",
          is_approved: false,
          iterations: 0,
          guidance: args.guidance,
          manual_hook_selection: args.manual_hook_selection,
        }
      );

      console.log(`[regenerateNewsThread] Regenerating thread ${args.recordId}. Time traveling to after ScraperNode...`);
      const config = { configurable: { thread_id: args.recordId } };
      let pastState = null;
      for await (const state of NewsThreadFactoryGraph.getStateHistory(config)) {
        if (state.next && state.next.includes("HookStrategistNode")) {
          pastState = state;
          break;
        }
      }

      let finalState;
      if (pastState) {
        console.log(`[regenerateNewsThread] Found past state before HookStrategistNode. Forking...`);
        const forkConfig = await NewsThreadFactoryGraph.updateState(pastState.config, {
           guidance: args.guidance,
           manual_hook_selection: args.manual_hook_selection ?? false,
           is_approved: false,
           iterations: 0,
        });
        finalState = await NewsThreadFactoryGraph.invoke(null, forkConfig);
      } else {
        console.log(`[regenerateNewsThread] Could not find past state before HookStrategistNode. Restarting from scratch...`);
        const initialState = createInitialState(args);
        finalState = await NewsThreadFactoryGraph.invoke(initialState, config);
      }

      console.log(`[regenerateNewsThread] NewsThreadFactoryGraph finished. Iterations: ${finalState.iterations}, Approved: ${finalState.is_approved}`);
      return await handleGraphCompletion(ctx, args.recordId, finalState);
    } catch (e) {
      await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
        id: args.recordId,
        generation_status: "failed",
      });
      throw e;
    }
  },
});

export const enqueueNewsThreadResume = action({
  args: {
    recordId: v.id("threadDrafts"),
    selected_hook: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const payload = [{
      recordId: args.recordId,
      selected_hook: args.selected_hook,
      userId,
    }];

    await generationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.resumeNewsThreadGeneration, payload);
  },
});

export const resumeNewsThreadGeneration = internalAction({
  args: {
    recordId: v.id("threadDrafts"),
    selected_hook: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    try {
      console.log(`[resumeNewsThreadGeneration] Resuming graph for thread: ${args.recordId} with selected_hook: ${args.selected_hook}`);

      await ctx.runMutation(
        internal.mutations.threadsMutations.updateThreadDraft,
        {
          id: args.recordId,
          generation_status: "processing",
          selected_hook: args.selected_hook,
        }
      );

      const finalState = await NewsThreadFactoryGraph.invoke(new Command({ resume: args.selected_hook }), {
        configurable: { thread_id: args.recordId }
      });

      console.log(`[resumeNewsThreadGeneration] Graph resumed and finished. Iterations: ${finalState.iterations}, Approved: ${finalState.is_approved}`);
      return await handleGraphCompletion(ctx, args.recordId, finalState);
    } catch (e) {
      await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
        id: args.recordId,
        generation_status: "failed",
      });
      throw e;
    }
  },
});

export const enqueueThreadRetry = action({
  args: {
    ids: v.array(v.id("threadDrafts")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const payload = args.ids.map(id => ({ recordId: id, userId }));

    await generationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.retryGeneration, payload);
  },
});

export const retryGeneration = internalAction({
  args: {
    recordId: v.id("threadDrafts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    try {
      console.log(`[retryGeneration] Retrying graph for thread: ${args.recordId}`);

      await ctx.runMutation(
        internal.mutations.threadsMutations.updateThreadDraft,
        {
          id: args.recordId,
          generation_status: "processing",
        }
      );

      const finalState = await NewsThreadFactoryGraph.invoke(null, {
        configurable: { thread_id: args.recordId }
      });

      console.log(`[retryGeneration] Graph retried and finished. Iterations: ${finalState.iterations}, Approved: ${finalState.is_approved}`);
      return await handleGraphCompletion(ctx, args.recordId, finalState);
    } catch (e) {
      await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
        id: args.recordId,
        generation_status: "failed",
      });
      throw e;
    }
  },
});

export const enqueueThreadRegeneration = action({
  args: {
    ids: v.array(v.id("threadDrafts")),
    guidance: v.optional(v.string()),
    manual_hook_selection: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const payload = [];
    for (const id of args.ids) {
      const draft = await ctx.runQuery(internal.queries.threadsQueries.getThreadDraftInternal, { id, userId });
      if (!draft) {
        throw new Error(`Draft ${id} not found or unauthorized`);
      }
      const guidance = args.guidance !== undefined ? args.guidance : draft.guidance;
      const manual_hook_selection = args.manual_hook_selection !== undefined ? args.manual_hook_selection : draft.manual_hook_selection;
      payload.push({
        url: draft.url,
        guidance: guidance,
        manual_hook_selection: manual_hook_selection,
        userId,
        recordId: id,
      });
    }

    await generationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.regenerateNewsThread, payload);
  },
});

export const enqueueThreadPublication = action({
  args: {
    requests: v.array(v.object({
      id: v.id("threadDrafts"),
      modified_thread: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const payload = args.requests.map(req => ({
      id: req.id,
      userId,
      modified_thread: req.modified_thread,
    }));

    await publicationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.publishThread, payload);
  },
});

export const publishThread = internalAction({
  args: {
    id: v.id("threadDrafts"),
    userId: v.id("users"),
    modified_thread: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ postIds: string[] }> => {
    const userId = args.userId;

    console.log(`[publishThread] Action started for state ID: ${args.id}`);

    try {
      await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
        id: args.id,
        publication_status: "publishing",
        ...(args.modified_thread ? { thread_draft: args.modified_thread } : {}),
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
      const threadToPublish = args.modified_thread || state.thread_draft;
      const postsToPublish = [...threadToPublish, state.url];
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

      await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
        id: args.id,
        publication_status: "success",
        is_published: true,
      });

      console.log("[publishThread] All posts published successfully. Post IDs:", postIds);
      return { postIds };
    } catch (e) {
      await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
        id: args.id,
        publication_status: "failed",
      });
      throw e;
    }
  },
});

export const deleteThreadDraft = action({
  args: {
    id: v.id("threadDrafts"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const draft = await ctx.runQuery(internal.queries.threadsQueries.getThreadDraftInternal, { id: args.id, userId });
    if (!draft) {
      return;
    }

    try {
      const { pool } = await import("../lib/agents/graph.js");

      const resWrites = await pool.query("DELETE FROM checkpoint_writes WHERE thread_id = $1", [args.id]);
      const resBlobs = await pool.query("DELETE FROM checkpoint_blobs WHERE thread_id = $1", [args.id]);
      const resCheckpoints = await pool.query("DELETE FROM checkpoints WHERE thread_id = $1", [args.id]);

      console.log(`Deleted ${resCheckpoints.rowCount} checkpoints, ${resWrites.rowCount} checkpoint_writes, and ${resBlobs.rowCount} checkpoint_blobs for thread ${args.id}`);
    } catch (e) {
      console.error("Failed to delete postgres checkpoints:", e);
      throw e;
    }

    await ctx.runMutation(internal.mutations.threadsMutations.deleteThreadDraftInternal, { id: args.id });
  }
});
