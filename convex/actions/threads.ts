"use node";

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
import { ThreadsAPI } from "../lib/clients/threads.js";
import { modelCircuitBreaker } from "../lib/agents/circuitBreaker.js";
import { generationPool, publicationPool } from "../lib/workpool.js";
import { requireAuthUserId } from "../auth";

export { requireAuthUserId };

type ThreadInput = Infer<typeof threadDraftInputValidator>;

export interface UrlMetadata {
  title: string;
  description: string;
  image: string;
}

export interface InitialStateArgs {
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
  updateState: (config: unknown, values: unknown, asNode?: string) => Promise<unknown>;
}

function getGraph(agent?: string): LangGraphInstance {
  if (agent === "topic") return TopicThreadFactoryGraph as unknown as LangGraphInstance;
  if (agent === "social_media") return SocialMediaThreadFactoryGraph as unknown as LangGraphInstance;
  return NewsThreadFactoryGraph as unknown as LangGraphInstance;
}

function formatErrorMessage(error: unknown, maxLen = 2000): string {
  if (error instanceof Error) {
    return error.message.slice(0, maxLen);
  }
  if (typeof error === "string") {
    return error.slice(0, maxLen);
  }
  return "An unexpected error occurred.";
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

  const thread_draft = Array.isArray(finalState.thread_draft) ? (finalState.thread_draft as string[]) : undefined;

  const hasDraft = Array.isArray(thread_draft) && thread_draft.length > 0;
  const generation_status = interrupted
    ? ("hook selection" as const)
    : hasDraft
    ? ("success" as const)
    : ("failed" as const);
  const failure_reason = (!interrupted && !hasDraft)
    ? "Thread generation finished without producing any thread draft."
    : null;

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
    max_iterations: typeof finalState.max_iterations === "number" ? finalState.max_iterations : undefined,
    is_approved: finalState.is_approved,
    search_queries: finalState.search_queries,
    guidance: finalState.guidance,
    manual_hook_selection: finalState.manual_hook_selection,
    search_query_generation: finalState.search_query_generation,
    research_context: finalState.research_context,
    generation_status,
    failure_reason,
  };

  if (actualAgent === "topic" && finalState.research_dossier) {
    stateToSave.research_context = finalState.research_dossier;
  }

  await ctx.runMutation(internal.threads.updateThreadDraft, stateToSave as Parameters<typeof ctx.runMutation>[1]);
  console.log(`[handleGraphCompletion] State saved with ID: ${recordId}. Interrupted: ${interrupted}, Status: ${generation_status}`);

  await awaitAllCallbacks();
  return { recordId };
}

async function runGraphWithLifecycle(
  ctx: ActionCtx,
  recordId: Id<"threadDrafts">,
  agent: string,
  runner: (graph: ReturnType<typeof getGraph>) => Promise<Record<string, unknown>>
): Promise<{ recordId: Id<"threadDrafts"> }> {
  return await modelCircuitBreaker.runWithContext(ctx, async () => {
    try {
      const graph = getGraph(agent);
      const finalState = await runner(graph);
      console.log(
        `[runGraphWithLifecycle] Graph finished for ${recordId}. Iterations: ${String(finalState.iterations)}, Approved: ${String(finalState.is_approved)}`
      );
      return await handleGraphCompletion(ctx, recordId, finalState, agent);
    } catch (e) {
      const failure_reason = formatErrorMessage(e);
      await ctx.runMutation(internal.threads.updateThreadDraft, {
        id: recordId,
        generation_status: "failed",
        failure_reason,
      });
      throw e;
    }
  });
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
  await ctx.runMutation(internal.threads.updateThreadDraft, {
    id: recordId,
    generation_status: "processing",
    failure_reason: null,
  });

  const draft = await ctx.runQuery(internal.threads.getThreadDraftInternal, { id: recordId, userId });
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

export type EnqueueThreadRequest = InitialStateArgs;

async function enqueueThreadGenerationHelper(
  ctx: ActionCtx,
  requests: EnqueueThreadRequest[]
) {
  const userId = await requireAuthUserId(ctx);

  await Promise.all(
    requests.map((req) =>
      generationPool.enqueueAction(
        ctx,
        internal.actions.threads.generateThreadInternal,
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
}

export const enqueueThreadGeneration = action({
  args: {
    requests: v.array(v.object({
      input_field: threadDraftInputValidator,
      ...commonThreadDraftArgs,
    }))
  },
  handler: async (ctx, args) => {
    await enqueueThreadGenerationHelper(ctx, args.requests);
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
    await enqueueThreadGenerationHelper(ctx, requests);
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
    await enqueueThreadGenerationHelper(ctx, requests);
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
    await enqueueThreadGenerationHelper(ctx, requests);
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
        internal.threads.initializeThreadDraft,
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
        const failure_reason = formatErrorMessage(e);
        await ctx.runMutation(internal.threads.updateThreadDraft, {
          id: recordId,
          generation_status: "failed",
          failure_reason,
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
    await ctx.runMutation(internal.threads.updateThreadDraft, {
      id: args.recordId,
      generation_status: "processing",
      selected_hook: args.selected_hook,
      failure_reason: null,
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
    await ctx.runMutation(internal.threads.updateThreadDraft, {
      id: args.recordId,
      generation_status: "processing",
      failure_reason: null,
    });

    const agent = args.agent || "news";
    return await runGraphWithLifecycle(ctx, args.recordId, agent, async (graph) => {
      console.log(`[retryThreadInternal] Retrying graph for thread: ${args.recordId}`);
      const config = { configurable: { thread_id: args.recordId } };
      const state = await graph.getState(config);

      if (!state || !state.values || Object.keys(state.values).length === 0 || !state.next || state.next.length === 0) {
        console.log(`[retryThreadInternal] No prior state or pending tasks found (next: ${state?.next?.length || 0}). Restarting from scratch...`);
        return await restartGraphFromScratch(ctx, args.recordId, args.userId, undefined, agent);
      }

      try {
        const resumedState = await graph.invoke(null, config);
        const hasDraft = Array.isArray(resumedState?.thread_draft) && (resumedState.thread_draft as string[]).length > 0;
        const interrupted = isInterrupted(resumedState) || (await graph.getState(config)).next.length > 0;

        if (!interrupted && !hasDraft) {
          console.log(`[retryThreadInternal] Resumed graph completed without generating a thread draft. Restarting from scratch...`);
          return await restartGraphFromScratch(ctx, args.recordId, args.userId, undefined, agent);
        }
        return resumedState;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(`[retryThreadInternal] Resuming failed with error: ${message}. Restarting from scratch...`);
        return await restartGraphFromScratch(ctx, args.recordId, args.userId, undefined, agent);
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
    const draft = await ctx.runQuery(internal.threads.getThreadDraftInternal, { id: args.recordId, userId: args.userId });
    if (!draft || !draft.input_field) {
      throw new Error("Draft not found or missing input_field");
    }

    // Immediately mark draft as processing so it never stays stuck on queued in the backend
    await ctx.runMutation(internal.threads.updateThreadDraft, {
      id: args.recordId,
      generation_status: "processing",
      is_approved: false,
      iterations: 0,
      max_iterations: 3,
      failure_reason: null,
      guidance: args.guidance,
      manual_hook_selection: args.manual_hook_selection,
      search_query_generation: args.search_query_generation,
    });

    const agent = args.agent || draft.agent || draft.input_field.agent || "news";
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

        const stateUpdate: Record<string, unknown> = { iterations: 0, is_approved: false, max_iterations: 3 };
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

export const iterateThreadInternal = internalAction({
  args: {
    userId: v.id("users"),
    recordId: v.id("threadDrafts"),
    guidance: v.optional(v.string()),
    modified_thread: v.optional(v.array(v.string())),
    agent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ recordId: Id<"threadDrafts"> }> => {
    const draft = await ctx.runQuery(internal.threads.getThreadDraftInternal, { id: args.recordId, userId: args.userId });
    if (!draft || !draft.input_field) {
      throw new Error("Draft not found or missing input_field");
    }
    const inputField = draft.input_field;

    const currentIterations = draft.iterations || 1;
    const targetMaxIterations = currentIterations + 1;

    const trimmedGuidance = args.guidance?.trim();
    const directiveTag = trimmedGuidance
      ? `[Iteration ${targetMaxIterations} Directive]: ${trimmedGuidance}`
      : undefined;

    const effectiveGuidance = directiveTag
      ? (draft.guidance ? `${draft.guidance}\n\n${directiveTag}` : directiveTag)
      : draft.guidance;

    // Immediately mark draft as processing
    await ctx.runMutation(internal.threads.updateThreadDraft, {
      id: args.recordId,
      generation_status: "processing",
      is_approved: false,
      failure_reason: null,
      guidance: effectiveGuidance,
      max_iterations: targetMaxIterations,
    });

    const agent = args.agent || draft.agent || inputField.agent || "news";
    console.log(`[iterateThreadInternal] Started for Record: ${args.recordId}, Agent: ${agent}, Iteration: ${targetMaxIterations}`);

    return await runGraphWithLifecycle(ctx, args.recordId, agent, async (graph) => {
      const config = { configurable: { thread_id: args.recordId } };

      const stateUpdate: Record<string, unknown> = {
        thread_draft: args.modified_thread || draft.thread_draft || [],
        critique: draft.critique || "",
        post_critiques: draft.post_critiques || [],
        guidance: effectiveGuidance,
        iterations: currentIterations,
        max_iterations: targetMaxIterations,
        is_approved: false,
        is_character_valid: true,
        parse_success: true,
        retries: { scraper: 0, researcher: 0, hook: 0, writer: 0, critic: 0, validator: 0 },
        selected_hook: draft.selected_hook || "",
        raw_markdown: draft.raw_markdown || "",
        core_hooks: draft.core_hooks || [],
        research_context: draft.research_context || "",
        images: draft.images || [],
        search_query_generation: draft.search_query_generation ?? false,
      };

      if (agent === "topic") {
        if (inputField.agent === "topic") {
          stateUpdate.topic = inputField.topic;
          if (inputField.description !== undefined) {
            stateUpdate.description = inputField.description;
          }
        }
        if (draft.research_context) {
          stateUpdate.research_dossier = draft.research_context;
        }
      } else {
        if (inputField.agent === "news" || inputField.agent === "social_media") {
          stateUpdate.url = inputField.url;
        }
      }

      await graph.updateState(config, stateUpdate, "ManualHookSelectionNode");
      return await graph.invoke(null, config);
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
    const draft = await ctx.runQuery(internal.threads.getThreadDraftInternal, { id: args.recordId, userId });
    if (!draft) {
      throw new Error(`Draft ${args.recordId} not found or unauthorized`);
    }

    await generationPool.enqueueAction(
      ctx,
      internal.actions.threads.resumeThreadInternal,
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
        const draft = await ctx.runQuery(internal.threads.getThreadDraftInternal, { id, userId });
        if (!draft) {
          throw new Error(`Draft ${id} not found or unauthorized`);
        }

        // Optimistically set status to "queued" so the UI immediately reflects it as queued
        await ctx.runMutation(internal.threads.updateThreadDraft, {
          id,
          generation_status: "queued",
          failure_reason: null,
        });

        return generationPool.enqueueAction(
          ctx,
          internal.actions.threads.retryThreadInternal,
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
        const draft = await ctx.runQuery(internal.threads.getThreadDraftInternal, { id, userId });
        if (!draft || !draft.input_field) {
          throw new Error(`Draft ${id} not found, unauthorized, or missing input_field`);
        }
        const guidance = args.guidance !== undefined ? args.guidance : draft.guidance;
        const manual_hook_selection = args.manual_hook_selection !== undefined ? args.manual_hook_selection : draft.manual_hook_selection;
        const search_query_generation = args.search_query_generation !== undefined ? args.search_query_generation : draft.search_query_generation;

        // Optimistically set the status to "queued" so the UI immediately reflects it as queued
        await ctx.runMutation(internal.threads.updateThreadDraft, {
          id: id,
          generation_status: "queued",
        });

        return generationPool.enqueueAction(
          ctx,
          internal.actions.threads.regenerateThreadInternal,
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

export const enqueueThreadIteration = action({
  args: {
    id: v.id("threadDrafts"),
    guidance: v.optional(v.string()),
    modified_thread: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const draft = await ctx.runQuery(internal.threads.getThreadDraftInternal, { id: args.id, userId });
    if (!draft || !draft.input_field) {
      throw new Error(`Draft ${args.id} not found, unauthorized, or missing input_field`);
    }

    if (draft.generation_status === "processing" || draft.generation_status === "queued") {
      throw new Error("Draft is already currently processing or queued");
    }

    if (draft.is_published || draft.publication_status === "publishing" || draft.publication_status === "queued") {
      throw new Error("Cannot iterate on an already published or publishing draft");
    }

    const hasExistingDraft = Array.isArray(draft.thread_draft) && draft.thread_draft.length > 0;
    const hasModifiedDraft = Array.isArray(args.modified_thread) && args.modified_thread.length > 0;
    if (!hasExistingDraft && !hasModifiedDraft) {
      throw new Error("Cannot iterate on an empty draft. Please generate or regenerate the draft first.");
    }

    // Optimistically set status to queued
    await ctx.runMutation(internal.threads.updateThreadDraft, {
      id: args.id,
      generation_status: "queued",
      failure_reason: null,
    });

    await generationPool.enqueueAction(
      ctx,
      internal.actions.threads.iterateThreadInternal,
      {
        recordId: args.id,
        userId,
        guidance: args.guidance,
        modified_thread: args.modified_thread,
        agent: draft.agent || draft.input_field.agent || "news",
      },
      {
        onComplete: internal.notifications.onComplete.onGenerationComplete,
        context: { userId, threadId: args.id },
      }
    );

    return { success: true };
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
      append_source_url: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    await Promise.all(
      args.requests.map(async (req) => {
        const draft = await ctx.runQuery(internal.threads.getThreadDraftInternal, { id: req.id, userId });
        if (!draft) {
          throw new Error(`Draft ${req.id} not found or unauthorized`);
        }

        // Optimistically set the status to "queued" so the UI immediately reflects it as queued
        await ctx.runMutation(internal.threads.updateThreadDraft, {
          id: req.id,
          publication_status: "queued",
        });

        return publicationPool.enqueueAction(
          ctx,
          internal.actions.threads.publishThread,
          {
            id: req.id,
            userId,
            modified_thread: req.modified_thread,
            images: req.images,
            videos: req.videos,
            append_source_url: req.append_source_url,
          },
          {
            onComplete: internal.notifications.onComplete.onPublicationComplete,
            context: { userId, threadId: req.id },
          }
        );
      })
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
    append_source_url: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ postIds: string[]; threadId: Id<"threadDrafts">; permalink?: string }> => {
    const userId = args.userId;
    console.log(`[publishThread] Action started for state ID: ${args.id}`);

    try {
      await ctx.runMutation(internal.threads.updateThreadDraft, {
        id: args.id,
        publication_status: "publishing",
        publication_error: null,
        ...(args.modified_thread ? { thread_draft: args.modified_thread } : {}),
      });

      console.log("[publishThread] Refreshing Threads token if necessary...");
      await ctx.runAction(internal.actions.tokens.refreshThreadsToken, { userId });

      console.log("[publishThread] Retrieving the latest Threads access token...");
      const tokenDoc = await ctx.runQuery(
        internal.tokens.getLatestToken,
        { platform: "threads", type: "long lived", userId }
      );
      if (!tokenDoc) {
        throw new Error("No active Threads access token found in the database.");
      }

      console.log(`[publishThread] Retrieving thread factory state for ID: ${args.id}`);
      const state = await ctx.runQuery(
        internal.threads.getThreadDraftInternal,
        { id: args.id, userId: args.userId }
      );
      if (!state) {
        throw new Error(`State with ID ${args.id} does not exist`);
      }

      console.log(`[publishThread] Extracted thread posts: ${JSON.stringify(state.thread_draft)}`);
      const rawPosts = args.modified_thread || state.thread_draft;

      if (!rawPosts || rawPosts.length === 0) {
        throw new Error("Cannot publish an empty thread.");
      }

      const postsToPublish = [...rawPosts];
      if (args.append_source_url && state.input_field?.agent !== "topic" && state.input_field?.url) {
        const sourceUrl = state.input_field.url.trim();
        if (!postsToPublish.some((p) => p.includes(sourceUrl))) {
          postsToPublish.push(sourceUrl);
        }
      }

      const threadsApi = new ThreadsAPI(tokenDoc.token, "me");
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

      let permalink: string | undefined = undefined;
      if (postIds.length > 0) {
        permalink = await threadsApi.getPostPermalink(postIds[0]);
      }

      await ctx.runMutation(internal.threads.updateThreadDraft, {
        id: args.id,
        publication_status: "success",
        publication_error: null,
        is_published: true,
      });

      console.log("[publishThread] All posts published successfully. Post IDs:", postIds, "Permalink:", permalink);
      return { postIds, threadId: args.id, permalink };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`[publishThread] Error publishing thread with state ID ${args.id}:`, errorMessage);

      await ctx.runMutation(internal.threads.updateThreadDraft, {
        id: args.id,
        is_published: false,
        publication_status: "failed",
        publication_error: errorMessage,
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
    const draft = await ctx.runQuery(internal.threads.getThreadDraftInternal, { id: args.id, userId });
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

    await ctx.runMutation(internal.threads.deleteThreadDraftInternal, { id: args.id, userId });
  }
});

/**
 * Derives a clean, human-readable title from a URL path slug.
 * Useful for Reuters links and pages where access is blocked by WAF/anti-bot.
 */
export function deriveTitleFromUrl(targetUrl: string): string {
  try {
    const parsed = new URL(targetUrl.startsWith("http://") || targetUrl.startsWith("https://") ? targetUrl : `https://${targetUrl}`);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      let selectedPart = pathParts[pathParts.length - 1];
      if (/^\d+$/.test(selectedPart) && pathParts.length > 1) {
        selectedPart = pathParts[pathParts.length - 2];
      }

      // Strip file extensions (.html, .php, etc.)
      let cleaned = decodeURIComponent(selectedPart).replace(/\.[^/.]+$/, "");
      // Strip trailing ISO dates (e.g. -2024-01-26, -2026-09-17)
      cleaned = cleaned.replace(/-\d{4}-\d{2}-\d{2}$/, "");
      // Strip trailing Reuters / AP article IDs (e.g. -idUSKBN..., -idUS...)
      cleaned = cleaned.replace(/-id[A-Za-z0-9]+$/i, "");
      // Replace hyphens, underscores, pluses with spaces
      cleaned = cleaned.replace(/[-_+]+/g, " ").trim();

      if (cleaned.length > 0) {
        return cleaned
          .split(/\s+/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    }

    const rawHostname = parsed.hostname.replace(/^www\./i, "");
    const domainParts = rawHostname.split(".");
    const mainDomain = domainParts.length > 1 ? domainParts[0] : rawHostname;
    return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
  } catch {
    return targetUrl;
  }
}

/**
 * Detects if a title indicates an access-denied/WAF block page or is just a generic site domain.
 */
export function isAccessDeniedOrGenericTitle(titleToCheck: string | undefined | null, targetUrl: string): boolean {
  if (!titleToCheck) return true;
  const trimmed = titleToCheck.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();

  const blockedPatterns = [
    "access to this page has been denied",
    "access denied",
    "403 forbidden",
    "forbidden",
    "401 unauthorized",
    "just a moment",
    "attention required",
    "cloudflare",
    "security check",
    "robot or human",
    "are you a human",
    "verify you are human",
    "blocked",
    "shieldsquare",
    "perimeterx",
    "ddos-guard",
    "enable javascript and cookies",
    "enable cookies",
    "captcha",
    "page not found",
    "404 not found",
    "502 bad gateway",
    "503 service unavailable",
    "504 gateway timeout",
  ];

  if (blockedPatterns.some((pattern) => lower.includes(pattern))) {
    return true;
  }

  try {
    const parsed = new URL(targetUrl.startsWith("http://") || targetUrl.startsWith("https://") ? targetUrl : `https://${targetUrl}`);
    const rawHost = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    const domainName = rawHost.split(".")[0];

    // For Reuters links, generic titles like "reuters.com" or "Reuters" should be treated as generic
    if (rawHost === "reuters.com" || rawHost.endsWith(".reuters.com")) {
      if (
        lower === "reuters.com" ||
        lower === "reuters" ||
        lower.startsWith("reuters |") ||
        lower.includes("breaking international news")
      ) {
        return true;
      }
    }

    // If title matches hostname or site domain when path slug is present
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      if (lower === rawHost || lower === domainName || lower === `${domainName}.com`) {
        return true;
      }
    }
  } catch {
    // ignore URL parse errors
  }

  return false;
}

export const getUrlMetadata = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx);

    try {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(args.url);
      } catch {
        return { title: "", description: "", image: "" };
      }

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return { title: "", description: "", image: "" };
      }

      const rawHostname = parsedUrl.hostname.toLowerCase();
      const hostname = rawHostname.startsWith("[") && rawHostname.endsWith("]")
        ? rawHostname.slice(1, -1)
        : rawHostname;

      const isPrivateIp =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "0.0.0.0" ||
        hostname === "::1" ||
        hostname === "::" ||
        hostname === "169.254.169.254" ||
        hostname.startsWith("127.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("192.168.") ||
        (hostname.startsWith("172.") && (() => {
          const second = parseInt(hostname.split(".")[1] || "0", 10);
          return second >= 16 && second <= 31;
        })()) ||
        hostname.endsWith(".internal") ||
        hostname.endsWith(".local");

      if (isPrivateIp) {
        return { title: "", description: "", image: "" };
      }

      // Reuters links aggressively block bot user agents and return generic titles.
      // Derive title directly from the URL slug as requested.
      const normalizedHost = hostname.replace(/^www\./i, "");
      const isReuters = normalizedHost === "reuters.com" || normalizedHost.endsWith(".reuters.com");
      if (isReuters) {
        return {
          title: deriveTitleFromUrl(args.url),
          description: "",
          image: "",
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(args.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      clearTimeout(timeoutId);

      // If access is denied (401, 403, 429, etc.), derive the title from the URL slug
      if (response.ok === false || (typeof response.status === "number" && (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 400))) {
        return {
          title: deriveTitleFromUrl(args.url),
          description: "",
          image: "",
        };
      }

      const html = await response.text();

      const getMetaTag = (property: string) => {
        const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
        const match = html.match(regex);
        if (match) return match[1];

        const reverseRegex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i");
        const reverseMatch = html.match(reverseRegex);
        return reverseMatch ? reverseMatch[1] : null;
      };

      const decodeHtmlEntities = (str: string): string => {
        return str
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;|&apos;|&#x27;/g, "'")
          .replace(/&mdash;/g, "—")
          .replace(/&ndash;/g, "–")
          .replace(/&nbsp;/g, " ")
          .replace(/&#(\d+);/g, (_, code) => {
            const num = parseInt(code, 10);
            return !isNaN(num) && num > 0 ? String.fromCharCode(num) : "";
          })
          .trim();
      };

      const getHtmlTitle = (): string => {
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return match ? match[1].trim() : "";
      };

      const rawTitle = getMetaTag("og:title") || getMetaTag("twitter:title") || getHtmlTitle() || "";
      const rawDescription = getMetaTag("og:description") || getMetaTag("twitter:description") || getMetaTag("description") || "";
      const rawImage = getMetaTag("og:image") || getMetaTag("twitter:image") || "";

      let title = decodeHtmlEntities(rawTitle);
      const description = decodeHtmlEntities(rawDescription);
      const image = rawImage.trim();

      // If the extracted title indicates an access-denied block page or generic domain name, derive from URL
      if (isAccessDeniedOrGenericTitle(title, args.url)) {
        title = deriveTitleFromUrl(args.url);
      }

      return { title, description, image };
    } catch (e) {
      console.error("Failed to fetch URL metadata:", e);
      return { title: deriveTitleFromUrl(args.url), description: "", image: "" };
    }
  },
});
