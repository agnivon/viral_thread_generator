import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import { DataModel } from "./_generated/dataModel.js";
import { internalMutation } from "./_generated/server.js";
import { notifications } from "./notifications/client.js";

export const migrations = new Migrations<DataModel>(components.migrations);

export const fixAndRemoveTopLevelUrl = migrations.define({
  table: "threadDrafts",
  migrateOne: async (ctx, draft) => {
    const rawDraft = draft as Record<string, unknown>;
    const url = rawDraft.url as string | undefined;
    const topic = rawDraft.topic as string | undefined;
    const description = rawDraft.description as string | undefined;

    let input_field = draft.input_field;

    if (input_field === undefined) {
      if (draft.agent === "topic") {
        input_field = {
          agent: "topic" as const,
          topic: topic || url || "",
          description: description,
        };
      } else if (draft.agent === "social_media") {
        input_field = {
          agent: "social_media" as const,
          url: url || "",
        };
      } else {
        input_field = {
          agent: "news" as const,
          url: url || "",
        };
      }
    }

    // @ts-expect-error - we are deleting fields that no longer exist in the schema
    await ctx.db.patch("threadDrafts", draft._id, { input_field, url: undefined, topic: undefined, description: undefined });
  },
});

export const backfillNotificationsFromDrafts = migrations.define({
  table: "threadDrafts",
  migrateOne: async (ctx, draft) => {
    // 1. Generation status notifications
    if (draft.generation_status === "success") {
      const truncatedHook = draft.selected_hook
        ? draft.selected_hook.length > 60
          ? `${draft.selected_hook.substring(0, 60)}...`
          : draft.selected_hook
        : undefined;

      await notifications.create(ctx, {
        targetId: draft.userId,
        kind: "thread_generation_success",
        data: {
          threadId: draft._id,
          title: "Thread Generation Succeeded",
          body: truncatedHook
            ? `Your thread "${truncatedHook}" is ready for review.`
            : "Your thread has been generated successfully.",
          href: `/threads/drafts/${draft._id}/approve`,
        },
        source: {
          type: "thread_generation",
          id: draft._id,
        },
        dedupeKey: `thread_generation_success:${draft._id}`,
      });
    } else if (draft.generation_status === "failed") {
      await notifications.create(ctx, {
        targetId: draft.userId,
        kind: "thread_generation_failed",
        data: {
          threadId: draft._id,
          title: "Thread Generation Failed",
          body: draft.failure_reason
            ? `Failed to generate thread: ${draft.failure_reason}`
            : "Failed to generate thread.",
          error: draft.failure_reason,
        },
        source: {
          type: "thread_generation",
          id: draft._id,
        },
        dedupeKey: `thread_generation_failed:${draft._id}`,
      });
    }

    // 2. Publication status notifications
    if (draft.publication_status === "success" || draft.is_published === true) {
      const count = draft.thread_draft?.length ?? 1;
      await notifications.create(ctx, {
        targetId: draft.userId,
        kind: "thread_publication_success",
        data: {
          threadId: draft._id,
          title: "Thread Published Successfully",
          body: `Your thread was published to Threads (${count} ${count === 1 ? "post" : "posts"}).`,
          postIds: [],
          href: `/threads/drafts/${draft._id}/approve`,
        },
        source: {
          type: "thread_publication",
          id: draft._id,
        },
        dedupeKey: `thread_publication_success:${draft._id}`,
      });
    } else if (draft.publication_status === "failed") {
      await notifications.create(ctx, {
        targetId: draft.userId,
        kind: "thread_publication_failed",
        data: {
          threadId: draft._id,
          title: "Thread Publication Failed",
          body: draft.publication_error
            ? `Failed to publish thread: ${draft.publication_error}`
            : "Failed to publish thread.",
          error: draft.publication_error,
        },
        source: {
          type: "thread_publication",
          id: draft._id,
        },
        dedupeKey: `thread_publication_failed:${draft._id}`,
      });
    }
  },
});

export const runBackfillAllNotifications = internalMutation({
  args: {},
  handler: async (ctx) => {
    const drafts = await ctx.db.query("threadDrafts").collect();
    let createdCount = 0;

    for (const draft of drafts) {
      // 1. Generation status notifications
      if (draft.generation_status === "success") {
        const truncatedHook = draft.selected_hook
          ? draft.selected_hook.length > 60
            ? `${draft.selected_hook.substring(0, 60)}...`
            : draft.selected_hook
          : undefined;

        const res = await notifications.create(ctx, {
          targetId: draft.userId,
          kind: "thread_generation_success",
          data: {
            threadId: draft._id,
            title: "Thread Generation Succeeded",
            body: truncatedHook
              ? `Your thread "${truncatedHook}" is ready for review.`
              : "Your thread has been generated successfully.",
            href: `/threads/drafts/${draft._id}/approve`,
          },
          source: {
            type: "thread_generation",
            id: draft._id,
          },
          dedupeKey: `thread_generation_success:${draft._id}`,
        });
        if (res.created) createdCount++;
      } else if (draft.generation_status === "failed") {
        const res = await notifications.create(ctx, {
          targetId: draft.userId,
          kind: "thread_generation_failed",
          data: {
            threadId: draft._id,
            title: "Thread Generation Failed",
            body: draft.failure_reason
              ? `Failed to generate thread: ${draft.failure_reason}`
              : "Failed to generate thread.",
            error: draft.failure_reason,
          },
          source: {
            type: "thread_generation",
            id: draft._id,
          },
          dedupeKey: `thread_generation_failed:${draft._id}`,
        });
        if (res.created) createdCount++;
      }

      // 2. Publication status notifications
      if (draft.publication_status === "success" || draft.is_published === true) {
        const count = draft.thread_draft?.length ?? 1;
        const res = await notifications.create(ctx, {
          targetId: draft.userId,
          kind: "thread_publication_success",
          data: {
            threadId: draft._id,
            title: "Thread Published Successfully",
            body: `Your thread was published to Threads (${count} ${count === 1 ? "post" : "posts"}).`,
            postIds: [],
            href: `/threads/drafts/${draft._id}/approve`,
          },
          source: {
            type: "thread_publication",
            id: draft._id,
          },
          dedupeKey: `thread_publication_success:${draft._id}`,
        });
        if (res.created) createdCount++;
      } else if (draft.publication_status === "failed") {
        const res = await notifications.create(ctx, {
          targetId: draft.userId,
          kind: "thread_publication_failed",
          data: {
            threadId: draft._id,
            title: "Thread Publication Failed",
            body: draft.publication_error
              ? `Failed to publish thread: ${draft.publication_error}`
              : "Failed to publish thread.",
            error: draft.publication_error,
          },
          source: {
            type: "thread_publication",
            id: draft._id,
          },
          dedupeKey: `thread_publication_failed:${draft._id}`,
        });
        if (res.created) createdCount++;
      }
    }

    return { totalDrafts: drafts.length, createdNotifications: createdCount };
  },
});
