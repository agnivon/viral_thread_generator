import { v } from "convex/values";
import { query, internalQuery, internalMutation } from "./_generated/server";
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
      generation_status: "processing" as const,
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
