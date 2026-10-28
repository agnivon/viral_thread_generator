import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireAuthUserId } from "./auth";
import { paginationOptsValidator } from "convex/server";
import {
  threadDraftInputValidator,
  commonThreadDraftArgs,
  generationStatusValidator,
  publicationStatusValidator,
} from "./schema";

/**
 * Public query: Retrieves a specific thread draft for the authenticated user.
 */
export const getThreadDraft = query({
  args: {
    id: v.id("threadDrafts"),
  },
  handler: async (ctx, args): Promise<Doc<"threadDrafts"> | null> => {
    const userId = await requireAuthUserId(ctx);
    const draft = await ctx.db.get("threadDrafts", args.id);
    if (draft && draft.userId !== userId) {
      throw new Error("Unauthorized");
    }
    return draft;
  },
});

/**
 * Public query: Retrieves paginated thread drafts belonging to the authenticated user.
 */
export const getPaginatedThreadDrafts = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    return await ctx.db
      .query("threadDrafts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Internal query: Retrieves a thread draft verifying ownership against an explicitly passed userId.
 */
export const getThreadDraftInternal = internalQuery({
  args: {
    id: v.id("threadDrafts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Doc<"threadDrafts"> | null> => {
    const draft = await ctx.db.get("threadDrafts", args.id);
    if (draft && draft.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    return draft;
  },
});

/**
 * Internal mutation: Initializes a new thread draft record in the processing state.
 */
export const initializeThreadDraft = internalMutation({
  args: {
    userId: v.id("users"),
    ...commonThreadDraftArgs,
    agent: v.optional(v.string()),
    input_field: v.optional(threadDraftInputValidator),
    generation_status: v.optional(generationStatusValidator),
  },
  handler: async (ctx, args): Promise<Id<"threadDrafts">> => {
    const insertFields = {
      input_field: args.input_field,
      userId: args.userId,
      guidance: args.guidance,
      manual_hook_selection: args.manual_hook_selection,
      search_query_generation: args.search_query_generation,
      agent: args.agent || "news",
      is_approved: false,
      is_published: false,
      generation_status: args.generation_status || ("processing" as const),
      publication_status: "not_published" as const,
    };
    return await ctx.db.insert("threadDrafts", insertFields);
  },
});

/**
 * Internal mutation: Updates the state, status, or publication fields of a thread draft.
 */
export const updateThreadDraft = internalMutation({
  args: {
    id: v.id("threadDrafts"),
    input_field: v.optional(threadDraftInputValidator),
    generation_status: v.optional(generationStatusValidator),
    failure_reason: v.optional(v.union(v.string(), v.null())),
    publication_status: v.optional(publicationStatusValidator),
    publication_error: v.optional(v.union(v.string(), v.null())),
    ...commonThreadDraftArgs,
    raw_markdown: v.optional(v.string()),
    core_hooks: v.optional(v.array(v.string())),
    selected_hook: v.optional(v.union(v.string(), v.null())),
    thread_draft: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())),
    critique: v.optional(v.union(v.string(), v.null())),
    virality_score: v.optional(v.number()),
    post_critiques: v.optional(
      v.array(
        v.object({
          post_index: v.number(),
          critique: v.string(),
          fix_directive: v.optional(v.string()),
        })
      )
    ),
    research_context: v.optional(v.string()),
    iterations: v.optional(v.number()),
    max_iterations: v.optional(v.number()),
    is_approved: v.optional(v.boolean()),
    is_published: v.optional(v.boolean()),
    search_queries: v.optional(
      v.object({
        hero_visual_query: v.string(),
        post_visual_queries: v.array(
          v.object({
            post_index: v.number(),
            image_search_query: v.string(),
            video_search_query: v.string(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { id, failure_reason, publication_error, ...updates } = args;
    const patchFields: Record<string, unknown> = { ...updates };
    if (failure_reason !== undefined) {
      patchFields.failure_reason = failure_reason === null ? undefined : failure_reason;
    }
    if (publication_error !== undefined) {
      patchFields.publication_error = publication_error === null ? undefined : publication_error;
    }
    await ctx.db.patch("threadDrafts", id, patchFields);
  },
});

/**
 * Internal mutation: Deletes a thread draft after verifying ownership.
 */
export const deleteThreadDraftInternal = internalMutation({
  args: {
    id: v.id("threadDrafts"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = args.userId ?? (await requireAuthUserId(ctx));
    const draft = await ctx.db.get("threadDrafts", args.id);
    if (draft && draft.userId !== userId) {
      throw new Error("Unauthorized");
    }
    if (draft) {
      await ctx.db.delete("threadDrafts", args.id);
    }
  },
});

/**
 * Internal mutation: Finds drafts stuck in 'processing' or 'queued' for longer than thresholdMs
 * (default 15 minutes, well beyond any action execution window) and marks them as failed.
 */
export const markStuckDraftsAsFailed = internalMutation({
  args: {
    thresholdMs: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const threshold = args.thresholdMs ?? 15 * 60 * 1000;
    const cutoff = Date.now() - threshold;

    let allDrafts: Doc<"threadDrafts">[];
    if (args.userId) {
      allDrafts = await ctx.db
        .query("threadDrafts")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId!))
        .collect();
    } else {
      allDrafts = await ctx.db.query("threadDrafts").collect();
    }

    const updatedIds: Id<"threadDrafts">[] = [];
    for (const draft of allDrafts) {
      const isStuck =
        (draft.generation_status === "processing" || draft.generation_status === "queued") &&
        draft._creationTime <= cutoff;

      if (isStuck) {
        await ctx.db.patch("threadDrafts", draft._id, {
          generation_status: "failed",
          failure_reason: "Function execution timed out",
        });
        updatedIds.push(draft._id);
      }
    }

    return {
      updatedCount: updatedIds.length,
      updatedIds,
    };
  },
});

/**
 * Public mutation: Cleans up stuck generation drafts for the authenticated user.
 */
export const cleanupStuckDrafts = mutation({
  args: {
    thresholdMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const threshold = args.thresholdMs ?? 15 * 60 * 1000;
    const cutoff = Date.now() - threshold;

    const drafts = await ctx.db
      .query("threadDrafts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const updatedIds: Id<"threadDrafts">[] = [];
    for (const draft of drafts) {
      const isStuck =
        (draft.generation_status === "processing" || draft.generation_status === "queued") &&
        draft._creationTime <= cutoff;

      if (isStuck) {
        await ctx.db.patch("threadDrafts", draft._id, {
          generation_status: "failed",
          failure_reason: "Function execution timed out",
        });
        updatedIds.push(draft._id);
      }
    }

    return {
      updatedCount: updatedIds.length,
      updatedIds,
    };
  },
});
