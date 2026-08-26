import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { vOnCompleteArgs } from "@convex-dev/workpool";
import { Id } from "../_generated/dataModel";
import { notifications } from "./client";

const generationContextValidator = v.object({
  userId: v.id("users"),
  threadId: v.optional(v.id("threadDrafts")),
  title: v.optional(v.string()),
});

const publicationContextValidator = v.object({
  userId: v.id("users"),
  threadId: v.id("threadDrafts"),
});

function getRecordId(returnValue: unknown): Id<"threadDrafts"> | undefined {
  if (
    typeof returnValue === "object" &&
    returnValue !== null &&
    "recordId" in returnValue &&
    typeof returnValue.recordId === "string" &&
    returnValue.recordId.length > 0
  ) {
    return returnValue.recordId as Id<"threadDrafts">;
  }
  return undefined;
}

function getPostIds(returnValue: unknown): string[] | undefined {
  if (
    typeof returnValue === "object" &&
    returnValue !== null &&
    "postIds" in returnValue &&
    Array.isArray(returnValue.postIds) &&
    returnValue.postIds.every((item) => typeof item === "string")
  ) {
    return returnValue.postIds;
  }
  return undefined;
}

function getPermalink(returnValue: unknown): string | undefined {
  if (
    typeof returnValue === "object" &&
    returnValue !== null &&
    "permalink" in returnValue &&
    typeof returnValue.permalink === "string" &&
    returnValue.permalink.length > 0
  ) {
    return returnValue.permalink;
  }
  return undefined;
}

export const onGenerationComplete = internalMutation({
  args: vOnCompleteArgs(generationContextValidator),
  handler: async (ctx, { workId, context, result }) => {
    if (result.kind === "canceled") {
      return;
    }

    if (result.kind === "success") {
      const recordId = getRecordId(result.returnValue) ?? context.threadId;
      let body = "Your thread has been generated successfully.";
      let href: string | undefined = undefined;

      if (recordId) {
        href = `/threads/drafts/${recordId}/approve`;
        const draft = await ctx.db.get("threadDrafts", recordId);
        if (draft?.selected_hook) {
          const truncatedHook =
            draft.selected_hook.length > 60
              ? `${draft.selected_hook.substring(0, 60)}...`
              : draft.selected_hook;
          body = `Your thread "${truncatedHook}" is ready for review.`;
        }
      }

      await notifications.create(ctx, {
        targetId: context.userId,
        kind: "thread_generation_success",
        data: {
          threadId: recordId ?? "",
          title: "Thread Generation Succeeded",
          body,
          href,
        },
        source: {
          type: "thread_generation",
          id: recordId ?? workId,
        },
        dedupeKey: `thread_generation_success:${workId}`,
      });
    } else if (result.kind === "failed") {
      if (context.threadId) {
        const draft = await ctx.db.get("threadDrafts", context.threadId);
        if (draft && (!draft.failure_reason || draft.generation_status !== "failed")) {
          await ctx.db.patch("threadDrafts", context.threadId, {
            generation_status: "failed",
            failure_reason: result.error,
          });
        }
      }

      await notifications.create(ctx, {
        targetId: context.userId,
        kind: "thread_generation_failed",
        data: {
          threadId: context.threadId,
          title: "Thread Generation Failed",
          body: `Failed to generate thread: ${result.error}`,
          error: result.error,
        },
        source: {
          type: "thread_generation",
          id: context.threadId ?? workId,
        },
        dedupeKey: `thread_generation_failed:${workId}`,
      });
    }
  },
});

export const onPublicationComplete = internalMutation({
  args: vOnCompleteArgs(publicationContextValidator),
  handler: async (ctx, { workId, context, result }) => {
    if (result.kind === "canceled") {
      return;
    }

    const threadId = context.threadId;

    if (result.kind === "success") {
      const postIds = getPostIds(result.returnValue);
      const permalink = getPermalink(result.returnValue);
      const count = postIds?.length ?? 1;
      const hookPostId = postIds?.[0];
      const href =
        permalink ??
        (hookPostId
          ? `https://www.threads.net/t/${hookPostId}`
          : `/threads/drafts/${threadId}/approve`);

      await notifications.create(ctx, {
        targetId: context.userId,
        kind: "thread_publication_success",
        data: {
          threadId,
          title: "Thread Published Successfully",
          body: `Your thread was published to Threads (${count} ${count === 1 ? "post" : "posts"}).`,
          postIds,
          href,
        },
        source: {
          type: "thread_publication",
          id: threadId,
        },
        dedupeKey: `thread_publication_success:${workId}`,
      });
    } else if (result.kind === "failed") {
      const draft = await ctx.db.get("threadDrafts", threadId);
      if (draft && (!draft.publication_error || draft.publication_status !== "failed")) {
        await ctx.db.patch("threadDrafts", threadId, {
          publication_status: "failed",
          publication_error: result.error,
        });
      }

      await notifications.create(ctx, {
        targetId: context.userId,
        kind: "thread_publication_failed",
        data: {
          threadId,
          title: "Thread Publication Failed",
          body: `Failed to publish thread: ${result.error}`,
          error: result.error,
        },
        source: {
          type: "thread_publication",
          id: threadId,
        },
        dedupeKey: `thread_publication_failed:${workId}`,
      });
    }
  },
});
