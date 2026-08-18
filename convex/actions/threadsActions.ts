"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { isInterrupted, Command } from "@langchain/langgraph";
import { action, internalAction, ActionCtx } from "../_generated/server";
import { v, Infer } from "convex/values";
import { internal } from "../_generated/api";
import { threadDraftInputValidator, commonThreadDraftArgs } from "../schema";
import { Id } from "../_generated/dataModel";
import { NewsThreadFactoryGraph } from "../lib/agents/news/graph.js";
import { SocialMediaThreadFactoryGraph } from "../lib/agents/social_media/graph.js";
import { TopicThreadFactoryGraph } from "../lib/agents/topic/graph.js";
import { ThreadsAPI } from "../lib/threads/api.js";
import { generationPool, publicationPool } from "../lib/workpool/index.js";

async function requireAuthUserId(ctx: ActionCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

type ThreadInput = Infer<typeof threadDraftInputValidator>;

interface InitialStateArgs {
  input_field: ThreadInput;
  guidance?: string;
  manual_hook_selection?: boolean;
  search_query_generation?: boolean;
}

function createInitialState(args: InitialStateArgs) {
  const base = {
    guidance: args.guidance,
    manual_hook_selection: args.manual_hook_selection ?? false,
    search_query_generation: args.search_query_generation ?? false,
    iterations: 0,
    is_approved: false,
  };

  if (args.input_field.agent === "topic") {
    return { ...base, topic: args.input_field.topic, description: args.input_field.description };
  }
  return { ...base, url: args.input_field.url };
}

interface LangGraphInstance {
  invoke: (input: unknown, config?: unknown) => Promise<Record<string, unknown>>;
  getState: (config?: unknown) => Promise<{ next: string[]; values?: Record<string, unknown> }>;
  getStateHistory: (config?: unknown) => AsyncIterable<{
    next?: string[];
    values: { iterations: number; [key: string]: unknown };
    config: { configurable?: { checkpoint_id?: string } };
  }>;
}

function getGraph(agent?: string): LangGraphInstance {
  if (agent === "topic") return TopicThreadFactoryGraph as unknown as LangGraphInstance;
  if (agent === "social_media") return SocialMediaThreadFactoryGraph as unknown as LangGraphInstance;
  return NewsThreadFactoryGraph as unknown as LangGraphInstance;
}

async function handleGraphCompletion(
  ctx: ActionCtx,
  recordId: Id<"threadDrafts">,
  finalState: Record<string, unknown>,
  agent?: string
): Promise<{ recordId: Id<"threadDrafts"> }> {
  const actualAgent = agent || "news";
  const graph = getGraph(actualAgent);
  const interrupted =
    isInterrupted(finalState) ||
    (await graph.getState({ configurable: { thread_id: recordId } })).next.length > 0;

  const url = typeof finalState.url === "string" ? finalState.url : undefined;
  const rawDraft = Array.isArray(finalState.thread_draft) ? (finalState.thread_draft as string[]) : undefined;
  let thread_draft = rawDraft;
  if (!interrupted && actualAgent === "news" && thread_draft && url) {
    thread_draft = [...thread_draft, url];
  }

  const stateToSave: Record<string, unknown> = {
    id: recordId,
    raw_markdown: finalState.raw_markdown,
    core_hooks: finalState.core_hooks,
    selected_hook: finalState.selected_hook,
    thread_draft,
    images: finalState.images,
    critique: finalState.critique,
    virality_score: finalState.virality_score,
    post_critiques: finalState.post_critiques,
    iterations: finalState.iterations,
    is_approved: finalState.is_approved,
    search_queries: finalState.search_queries,
    guidance: finalState.guidance,
    manual_hook_selection: finalState.manual_hook_selection,
    search_query_generation: finalState.search_query_generation,
    generation_status: interrupted ? ("hook selection" as const) : ("success" as const),
  };

  if (actualAgent === "topic" && finalState.research_dossier) {
    stateToSave.research_context = finalState.research_dossier;
  }

  await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, stateToSave as Parameters<typeof ctx.runMutation>[1]);
  console.log(`[handleGraphCompletion] State saved with ID: ${recordId}. Interrupted: ${interrupted}`);

  await awaitAllCallbacks();
  return { recordId };
}

async function runGraphWithLifecycle(
  ctx: ActionCtx,
  recordId: Id<"threadDrafts">,
  agent: string,
  runner: (graph: ReturnType<typeof getGraph>) => Promise<Record<string, unknown>>
): Promise<{ recordId: Id<"threadDrafts"> }> {
  try {
    const graph = getGraph(agent);
    const finalState = await runner(graph);
    console.log(
      `[runGraphWithLifecycle] Graph finished for ${recordId}. Iterations: ${String(finalState.iterations)}, Approved: ${String(finalState.is_approved)}`
    );
    return await handleGraphCompletion(ctx, recordId, finalState, agent);
  } catch (e) {
    await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
      id: recordId,
      generation_status: "failed",
    });
    throw e;
  }
}

async function restartGraphFromScratch(
  ctx: ActionCtx,
  recordId: Id<"threadDrafts">,
  userId: Id<"users">,
  overrides?: {
    guidance?: string;
    manual_hook_selection?: boolean;
    search_query_generation?: boolean;
  },
  agentOverride?: string
): Promise<Record<string, unknown>> {
  const draft = await ctx.runQuery(internal.queries.threadsQueries.getThreadDraftInternal, { id: recordId, userId });
  if (!draft || !draft.input_field) {
    throw new Error("Draft not found or missing input_field");
  }

  const agent = agentOverride || draft.agent || "news";
  const graph = getGraph(agent);
  const config = { configurable: { thread_id: recordId } };
  const initialState = createInitialState({
    input_field: draft.input_field,
    guidance: overrides?.guidance ?? draft.guidance,
    manual_hook_selection: overrides?.manual_hook_selection ?? draft.manual_hook_selection,
    search_query_generation: overrides?.search_query_generation ?? draft.search_query_generation,
  });

  return await graph.invoke(initialState, config);
}

// ─────────────────────────────────────────────────────────────
// Enqueue Generation Actions
// ─────────────────────────────────────────────────────────────

export const enqueueThreadGeneration = action({
  args: {
    requests: v.array(v.object({
      input_field: threadDraftInputValidator,
      ...commonThreadDraftArgs,
    }))
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    await Promise.all(
      args.requests.map((req) =>
        generationPool.enqueueAction(
          ctx,
          internal.actions.threadsActions.generateThreadInternal,
          {
            input_field: req.input_field,
            guidance: req.guidance,
            manual_hook_selection: req.manual_hook_selection,
            search_query_generation: req.search_query_generation,
            userId,
            agent: req.input_field.agent,
          },
          {
            onComplete: internal.notifications.onComplete.onGenerationComplete,
            context: {
              userId,
              title: req.input_field.agent === "topic" ? req.input_field.topic : req.input_field.url,
            },
          }
        )
      )
    );
  },
});

export const enqueueNewsThreadGeneration = action({
  args: {
    requests: v.array(v.object({
      url: v.string(),
      ...commonThreadDraftArgs,
    }))
  },
  handler: async (ctx, args) => {
    const requests = args.requests.map((req) => ({
      ...req,
      input_field: { agent: "news" as const, url: req.url },
    }));
    await ctx.runAction(internal.actions.threadsActions.enqueueThreadGenerationWrapper, { requests });
  },
});

export const enqueueSocialMediaThreadGeneration = action({
  args: {
    requests: v.array(v.object({
      url: v.string(),
      ...commonThreadDraftArgs,
    }))
  },
  handler: async (ctx, args) => {
    const requests = args.requests.map((req) => ({
      ...req,
      input_field: { agent: "social_media" as const, url: req.url },
    }));
    await ctx.runAction(internal.actions.threadsActions.enqueueThreadGenerationWrapper, { requests });
  },
});

export const enqueueTopicThreadGeneration = action({
  args: {
    requests: v.array(v.object({
      topic: v.string(),
      description: v.optional(v.string()),
      ...commonThreadDraftArgs,
    }))
  },
  handler: async (ctx, args) => {
    const requests = args.requests.map((req) => ({
      ...req,
      input_field: { agent: "topic" as const, topic: req.topic, description: req.description },
    }));
    await ctx.runAction(internal.actions.threadsActions.enqueueThreadGenerationWrapper, { requests });
  },
});

export const enqueueThreadGenerationWrapper = internalAction({
  args: {
    requests: v.array(v.object({
      input_field: threadDraftInputValidator,
      ...commonThreadDraftArgs,
    }))
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    await Promise.all(
      args.requests.map((req) =>
        generationPool.enqueueAction(
          ctx,
          internal.actions.threadsActions.generateThreadInternal,
          {
            input_field: req.input_field,
            guidance: req.guidance,
            manual_hook_selection: req.manual_hook_selection,
            search_query_generation: req.search_query_generation,
            userId,
            agent: req.input_field.agent,
          },
          {
            onComplete: internal.notifications.onComplete.onGenerationComplete,
            context: {
              userId,
              title: req.input_field.agent === "topic" ? req.input_field.topic : req.input_field.url,
            },
          }
        )
      )
    );
  },
});

// ─────────────────────────────────────────────────────────────
// Internal Graph Worker Actions
// ─────────────────────────────────────────────────────────────

export const generateThreadInternal = internalAction({
  args: {
    input_field: threadDraftInputValidator,
    ...commonThreadDraftArgs,
    userId: v.id("users"),
    agent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    let recordId: Id<"threadDrafts"> | undefined = undefined;
    try {
      recordId = await ctx.runMutation(
        internal.mutations.threadsMutations.initializeThreadDraft,
        {
          input_field: args.input_field,
          guidance: args.guidance,
          manual_hook_selection: args.manual_hook_selection,
          search_query_generation: args.search_query_generation,
          userId: args.userId,
          agent: args.agent,
        }
      );

      if (!recordId) {
        throw new Error("Failed to initialize thread draft.");
      }

      const agent = args.agent || args.input_field.agent || "news";
      return await runGraphWithLifecycle(ctx, recordId, agent, async (graph) => {
        console.log(`[generateThreadInternal] Invoking ${agent} graph from scratch for ${recordId}...`);
        const initialState = createInitialState({
          input_field: args.input_field,
          guidance: args.guidance,
          manual_hook_selection: args.manual_hook_selection,
          search_query_generation: args.search_query_generation,
        });
        return await graph.invoke(initialState, { configurable: { thread_id: recordId } });
      });
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

export const resumeThreadInternal = internalAction({
  args: {
    recordId: v.id("threadDrafts"),
    selected_hook: v.string(),
    userId: v.id("users"),
    agent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
      id: args.recordId,
      generation_status: "processing",
      selected_hook: args.selected_hook,
    });

    const agent = args.agent || "news";
    return await runGraphWithLifecycle(ctx, args.recordId, agent, async (graph) => {
      console.log(`[resumeThreadInternal] Resuming graph for thread: ${args.recordId} with selected_hook: ${args.selected_hook}`);
      return await graph.invoke(new Command({ resume: args.selected_hook }), {
        configurable: { thread_id: args.recordId },
      });
    });
  },
});

export const retryThreadInternal = internalAction({
  args: {
    recordId: v.id("threadDrafts"),
    userId: v.id("users"),
    agent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
      id: args.recordId,
      generation_status: "processing",
    });

    const agent = args.agent || "news";
    return await runGraphWithLifecycle(ctx, args.recordId, agent, async (graph) => {
      console.log(`[retryThreadInternal] Retrying graph for thread: ${args.recordId}`);
      const config = { configurable: { thread_id: args.recordId } };
      const state = await graph.getState(config);

      if (!state || !state.values || Object.keys(state.values).length === 0) {
        console.log(`[retryThreadInternal] No prior state found. Restarting from scratch...`);
        return await restartGraphFromScratch(ctx, args.recordId, args.userId, undefined, agent);
      }

      try {
        return await graph.invoke(null, config);
      } catch (e: unknown) {
        const err = e as Error;
        if (
          err.name === "EmptyInputError" ||
          err.message?.includes("EmptyInputError") ||
          err.message?.includes('Received no input writes for "__start__"')
        ) {
          console.log(`[retryThreadInternal] Caught EmptyInputError. Restarting from scratch...`);
          return await restartGraphFromScratch(ctx, args.recordId, args.userId, undefined, agent);
        }
        throw e;
      }
    });
  },
});

export const regenerateThreadInternal = internalAction({
  args: {
    userId: v.id("users"),
    recordId: v.id("threadDrafts"),
    ...commonThreadDraftArgs,
    agent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    const draft = await ctx.runQuery(internal.queries.threadsQueries.getThreadDraftInternal, { id: args.recordId, userId: args.userId });
    if (!draft || !draft.input_field) {
      throw new Error("Draft not found or missing input_field");
    }

    const agent = args.agent || draft.agent || "news";
    console.log(`[regenerateThreadInternal] Started for Record: ${args.recordId}, Agent: ${agent}`);

    return await runGraphWithLifecycle(ctx, args.recordId, agent, async (graph) => {
      const config = { configurable: { thread_id: args.recordId } };
      let pastStateBeforeHook = null;
      for await (const state of graph.getStateHistory(config)) {
        if (state.next && state.next.includes("HookStrategistNode")) {
          pastStateBeforeHook = state;
          break;
        }
      }

      if (pastStateBeforeHook) {
        console.log(`[regenerateThreadInternal] Found past state at iterations=${pastStateBeforeHook.values.iterations}. Forking...`);
        const forkConfig = {
          configurable: {
            thread_id: args.recordId,
            checkpoint_id: pastStateBeforeHook.config.configurable?.checkpoint_id,
          },
        };
        await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
          id: args.recordId,
          generation_status: "processing",
          is_approved: false,
          iterations: 0,
        });

        const stateUpdate: Record<string, unknown> = { iterations: 0, is_approved: false };
        if (args.guidance !== undefined) stateUpdate.guidance = args.guidance;
        if (args.manual_hook_selection !== undefined) stateUpdate.manual_hook_selection = args.manual_hook_selection;
        if (args.search_query_generation !== undefined) stateUpdate.search_query_generation = args.search_query_generation;

        return await graph.invoke(stateUpdate, forkConfig);
      }

      console.log(`[regenerateThreadInternal] Could not find past state before HookStrategistNode. Restarting from scratch...`);
      return await restartGraphFromScratch(ctx, args.recordId, args.userId, args, agent);
    });
  },
});

// ─────────────────────────────────────────────────────────────
// Enqueue Resume, Retry, Regenerate Actions
// ─────────────────────────────────────────────────────────────

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

    await generationPool.enqueueAction(
      ctx,
      internal.actions.threadsActions.resumeThreadInternal,
      {
        recordId: args.recordId,
        selected_hook: args.selected_hook,
        userId,
        agent: draft.agent,
      },
      {
        onComplete: internal.notifications.onComplete.onGenerationComplete,
        context: { userId, threadId: args.recordId },
      }
    );
  },
});

export const enqueueThreadRetry = action({
  args: {
    ids: v.array(v.id("threadDrafts")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    await Promise.all(
      args.ids.map(async (id) => {
        const draft = await ctx.runQuery(internal.queries.threadsQueries.getThreadDraftInternal, { id, userId });
        if (!draft) {
          throw new Error(`Draft ${id} not found or unauthorized`);
        }
        return generationPool.enqueueAction(
          ctx,
          internal.actions.threadsActions.retryThreadInternal,
          { recordId: id, userId, agent: draft.agent },
          {
            onComplete: internal.notifications.onComplete.onGenerationComplete,
            context: { userId, threadId: id },
          }
        );
      })
    );
  },
});

export const enqueueThreadRegeneration = action({
  args: {
    ids: v.array(v.id("threadDrafts")),
    ...commonThreadDraftArgs,
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    await Promise.all(
      args.ids.map(async (id) => {
        const draft = await ctx.runQuery(internal.queries.threadsQueries.getThreadDraftInternal, { id, userId });
        if (!draft || !draft.input_field) {
          throw new Error(`Draft ${id} not found, unauthorized, or missing input_field`);
        }
        const guidance = args.guidance !== undefined ? args.guidance : draft.guidance;
        const manual_hook_selection = args.manual_hook_selection !== undefined ? args.manual_hook_selection : draft.manual_hook_selection;
        const search_query_generation = args.search_query_generation !== undefined ? args.search_query_generation : draft.search_query_generation;

        return generationPool.enqueueAction(
          ctx,
          internal.actions.threadsActions.regenerateThreadInternal,
          {
            guidance,
            manual_hook_selection,
            search_query_generation,
            userId,
            recordId: id,
            agent: draft.agent,
          },
          {
            onComplete: internal.notifications.onComplete.onGenerationComplete,
            context: { userId, threadId: id },
          }
        );
      })
    );
  },
});

// ─────────────────────────────────────────────────────────────
// Publication & Deletion Actions
// ─────────────────────────────────────────────────────────────

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

    await Promise.all(
      args.requests.map((req) =>
        publicationPool.enqueueAction(
          ctx,
          internal.actions.threadsActions.publishThread,
          {
            id: req.id,
            userId,
            modified_thread: req.modified_thread,
            images: req.images,
            videos: req.videos,
          },
          {
            onComplete: internal.notifications.onComplete.onPublicationComplete,
            context: { userId, threadId: req.id },
          }
        )
      )
    );
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
  handler: async (ctx, args): Promise<{ postIds: string[]; threadId: Id<"threadDrafts"> }> => {
    const userId = args.userId;
    console.log(`[publishThread] Action started for state ID: ${args.id}`);

    try {
      await ctx.runMutation(internal.mutations.threadsMutations.updateThreadDraft, {
        id: args.id,
        publication_status: "publishing",
        ...(args.modified_thread ? { thread_draft: args.modified_thread } : {}),
      });

      console.log("[publishThread] Refreshing Threads token if necessary...");
      await ctx.runAction(internal.actions.tokensActions.refreshThreadsToken, { userId });

      console.log("[publishThread] Retrieving the latest Threads access token...");
      const tokenDoc = await ctx.runQuery(
        internal.queries.tokensQueries.getLatestToken,
        { platform: "threads", type: "long lived", userId }
      );
      if (!tokenDoc) {
        throw new Error("No active Threads access token found in the database.");
      }

      console.log(`[publishThread] Retrieving thread factory state for ID: ${args.id}`);
      const state = await ctx.runQuery(
        internal.queries.threadsQueries.getThreadDraftInternal,
        { id: args.id, userId: args.userId }
      );
      if (!state) {
        throw new Error(`Thread factory state not found for ID: ${args.id}`);
      }

      if (!state.thread_draft || state.thread_draft.length === 0) {
        throw new Error("Thread factory state has no thread draft content to publish.");
      }

      const threadsApi = new ThreadsAPI(tokenDoc.token, "me");
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

        console.log(`[publishThread] [Post ${i + 1}/${postsToPublish.length}] Publishing... Type: ${isFirst ? "Root Post" : `Reply to ${replyToId}`}. Preview: "${snippet}"`);

        const postArgs: Parameters<typeof threadsApi.createPost>[0] = { text: postText };
        if (imageUrl) postArgs.imageUrl = imageUrl;
        if (videoUrl) postArgs.videoUrl = videoUrl;

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
      return { postIds, threadId: args.id };
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
    if (!draft) return;

    try {
      const { pool } = await import("../lib/agents/news/graph.js");
      const resWrites = await pool.query("DELETE FROM checkpoint_writes WHERE thread_id = $1", [args.id]);
      const resBlobs = await pool.query("DELETE FROM checkpoint_blobs WHERE thread_id = $1", [args.id]);
      const resCheckpoints = await pool.query("DELETE FROM checkpoints WHERE thread_id = $1", [args.id]);

      console.log(`Deleted ${resCheckpoints.rowCount} checkpoints, ${resWrites.rowCount} writes, and ${resBlobs.rowCount} blobs for thread ${args.id}`);
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
