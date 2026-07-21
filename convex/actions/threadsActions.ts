"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { isInterrupted, Command } from "@langchain/langgraph";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { NewsThreadFactoryGraph } from "../lib/agents/news/graph.js";
import { SocialMediaThreadFactoryGraph } from "../lib/agents/social_media/graph.js";
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

function getGraph(agent?: string) {
  if (agent === "social_media") {
    return SocialMediaThreadFactoryGraph;
  }
  return NewsThreadFactoryGraph;
}

async function handleGraphCompletion(ctx: any, recordId: Id<"threadDrafts">, finalState: any, agent?: string) {
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

  const graph = getGraph(agent);
  const interrupted = isInterrupted(finalState) || (await graph.getState({ configurable: { thread_id: recordId } })).next.length > 0;

  if (!interrupted && agent !== "social_media" && stateToSave.thread_draft) {
    stateToSave.thread_draft = [...stateToSave.thread_draft, url];
  }

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
      agent: "news",
    }));

    await generationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.generateThreadInternal, payload);
  },
});

export const enqueueSocialMediaThreadGeneration = action({
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
      agent: "social_media",
    }));

    await generationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.generateThreadInternal, payload);
  },
});

export const enqueueThreadGeneration = action({
  args: {
    requests: v.array(v.object({
      url: v.string(),
      guidance: v.optional(v.string()),
      manual_hook_selection: v.optional(v.boolean()),
      agent: v.optional(v.string()),
    }))
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const payload = args.requests.map(req => ({
      url: req.url,
      guidance: req.guidance,
      manual_hook_selection: req.manual_hook_selection,
      userId,
      agent: req.agent || "news",
    }));

    await generationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.generateThreadInternal, payload);
  },
});

export const generateThreadInternal = internalAction({
  args: {
    url: v.string(),
    guidance: v.optional(v.string()),
    manual_hook_selection: v.optional(v.boolean()),
    userId: v.id("users"),
    agent: v.optional(v.string()),
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
          agent: args.agent,
        }
      );

      const initialState = createInitialState(args);
      const graph = getGraph(args.agent);

      console.log(`[generateThreadInternal] Invoking ${args.agent || 'news'} graph from scratch...`);

      const finalState = await (graph as any).invoke(initialState, {
        configurable: { thread_id: recordId }
      });

      console.log(`[generateThreadInternal] Graph finished. Iterations: ${finalState.iterations}, Approved: ${finalState.is_approved}`);
      return await handleGraphCompletion(ctx, recordId, finalState, args.agent);
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

export const regenerateThreadInternal = internalAction({
  args: {
    url: v.string(),
    guidance: v.optional(v.string()),
    manual_hook_selection: v.optional(v.boolean()),
    userId: v.id("users"),
    recordId: v.id("threadDrafts"),
    agent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    try {
      console.log(`[regenerateThreadInternal] Started for URL: ${args.url}, Record: ${args.recordId}, Agent: ${args.agent}`);

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

      console.log(`[regenerateThreadInternal] Regenerating thread ${args.recordId}. Time traveling to after ScraperNode...`);
      const config = { configurable: { thread_id: args.recordId } };
      const graph = getGraph(args.agent);
      
      let pastState = null;
      for await (const state of graph.getStateHistory(config)) {
        if (state.next && state.next.includes("HookStrategistNode")) {
          pastState = state;
          break;
        }
      }

      let finalState;
      if (pastState) {
        console.log(`[regenerateThreadInternal] Found past state before HookStrategistNode. Forking...`);
        const forkConfig = await graph.updateState(pastState.config, {
           guidance: args.guidance,
           manual_hook_selection: args.manual_hook_selection ?? false,
           is_approved: false,
           iterations: 0,
        });
        finalState = await (graph as any).invoke(null, forkConfig);
      } else {
        console.log(`[regenerateThreadInternal] Could not find past state before HookStrategistNode. Restarting from scratch...`);
        const initialState = createInitialState(args);
        finalState = await (graph as any).invoke(initialState, config);
      }

      console.log(`[regenerateThreadInternal] Graph finished. Iterations: ${finalState.iterations}, Approved: ${finalState.is_approved}`);
      return await handleGraphCompletion(ctx, args.recordId, finalState, args.agent);
    } catch (e) {
      await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
        id: args.recordId,
        generation_status: "failed",
      });
      throw e;
    }
  },
});

export const enqueueThreadResume = action({
  args: {
    recordId: v.id("threadDrafts"),
    selected_hook: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const draft = await ctx.runQuery(internal.queries.threadsQueries.getThreadDraftInternal, { id: args.recordId, userId });
    if (!draft) {
      throw new Error(`Draft ${args.recordId} not found or unauthorized`);
    }

    const payload = [{
      recordId: args.recordId,
      selected_hook: args.selected_hook,
      userId,
      agent: draft.agent,
    }];

    await generationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.resumeThreadInternal, payload);
  },
});

export const resumeThreadInternal = internalAction({
  args: {
    recordId: v.id("threadDrafts"),
    selected_hook: v.string(),
    userId: v.id("users"),
    agent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    try {
      console.log(`[resumeThreadInternal] Resuming graph for thread: ${args.recordId} with selected_hook: ${args.selected_hook}`);

      await ctx.runMutation(
        internal.mutations.threadsMutations.updateThreadDraft,
        {
          id: args.recordId,
          generation_status: "processing",
          selected_hook: args.selected_hook,
        }
      );

      const graph = getGraph(args.agent);
      const finalState = await (graph as any).invoke(new Command({ resume: args.selected_hook }), {
        configurable: { thread_id: args.recordId }
      });

      console.log(`[resumeThreadInternal] Graph resumed and finished. Iterations: ${finalState.iterations}, Approved: ${finalState.is_approved}`);
      return await handleGraphCompletion(ctx, args.recordId, finalState, args.agent);
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

    const payload = [];
    for (const id of args.ids) {
      const draft = await ctx.runQuery(internal.queries.threadsQueries.getThreadDraftInternal, { id, userId });
      if (!draft) {
        throw new Error(`Draft ${id} not found or unauthorized`);
      }
      payload.push({ recordId: id, userId, agent: draft.agent });
    }

    await generationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.retryThreadInternal, payload);
  },
});

export const retryThreadInternal = internalAction({
  args: {
    recordId: v.id("threadDrafts"),
    userId: v.id("users"),
    agent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    try {
      console.log(`[retryThreadInternal] Retrying graph for thread: ${args.recordId}`);

      await ctx.runMutation(
        internal.mutations.threadsMutations.updateThreadDraft,
        {
          id: args.recordId,
          generation_status: "processing",
        }
      );

      const graph = getGraph(args.agent);
      const finalState = await (graph as any).invoke(null, {
        configurable: { thread_id: args.recordId }
      });

      console.log(`[retryThreadInternal] Graph retried and finished. Iterations: ${finalState.iterations}, Approved: ${finalState.is_approved}`);
      return await handleGraphCompletion(ctx, args.recordId, finalState, args.agent);
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
        agent: draft.agent,
      });
    }

    await generationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.regenerateThreadInternal, payload);
  },
});

export const enqueueThreadPublication = action({
  args: {
    requests: v.array(v.object({
      id: v.id("threadDrafts"),
      modified_thread: v.optional(v.array(v.string())),
      images: v.optional(v.record(v.string(), v.string())),
      videos: v.optional(v.record(v.string(), v.string())),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const payload = args.requests.map(req => ({
      id: req.id,
      userId,
      modified_thread: req.modified_thread,
      images: req.images,
      videos: req.videos,
    }));

    await publicationPool.enqueueActionBatch(ctx, internal.actions.threadsActions.publishThread, payload);
  },
});

export const publishThread = internalAction({
  args: {
    id: v.id("threadDrafts"),
    userId: v.id("users"),
    modified_thread: v.optional(v.array(v.string())),
    images: v.optional(v.record(v.string(), v.string())),
    videos: v.optional(v.record(v.string(), v.string())),
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
      const postsToPublish = args.modified_thread || state.thread_draft;
      const postIds: string[] = [];
      let replyToId: string | undefined = undefined;

      console.log(`[publishThread] Starting sequence to publish ${postsToPublish.length} posts...`);
      for (let i = 0; i < postsToPublish.length; i++) {
        const postText = postsToPublish[i];
        const isFirst = !replyToId;
        const snippet = postText.length > 60 ? postText.substring(0, 60) + "..." : postText;

        const imageUrl = args.images?.[i.toString()];
        const videoUrl = args.videos?.[i.toString()];

        console.log(`[publishThread] [Post ${i + 1}/${postsToPublish.length}] Publishing... Type: ${isFirst ? 'Root Post' : `Reply to ${replyToId}`}. Content preview: "${snippet}"`);

        const postArgs: any = { text: postText };
        if (imageUrl) {
          postArgs.imageUrl = imageUrl;
        }
        if (videoUrl) {
          postArgs.videoUrl = videoUrl;
        }

        if (isFirst) {
          replyToId = await threadsApi.createPost(postArgs);
        } else {
          replyToId = await threadsApi.createReply(replyToId!, postArgs);
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
      const { pool } = await import("../lib/agents/news/graph.js");

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

export const getUrlMetadata = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(args.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const html = await response.text();

      // Helper to extract content from meta tags
      const getMetaTag = (property: string) => {
        const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
        const match = html.match(regex);
        if (match) return match[1];

        const reverseRegex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i");
        const reverseMatch = html.match(reverseRegex);
        return reverseMatch ? reverseMatch[1] : null;
      };

      const title = getMetaTag("og:title") || getMetaTag("twitter:title") || "";
      const description = getMetaTag("og:description") || getMetaTag("twitter:description") || getMetaTag("description") || "";
      const image = getMetaTag("og:image") || getMetaTag("twitter:image") || "";

      return { title, description, image };
    } catch (e) {
      console.error("Failed to fetch URL metadata:", e);
      return { title: "", description: "", image: "" };
    }
  },
});
