import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type NotificationKind =
  | "thread_generation_success"
  | "thread_generation_failed"
  | "thread_publication_success"
  | "thread_publication_failed";

export interface NotificationPayloadData {
  threadId?: string;
  title: string;
  body?: string;
  href?: string;
  error?: string;
  postIds?: string[];
}

export interface CreateNotificationArgs {
  targetId: Id<"users">;
  kind: NotificationKind;
  data: NotificationPayloadData;
  source?: {
    type: string;
    id: string;
  };
  dedupeKey?: string;
}

export const notifications = {
  create: async (
    ctx: MutationCtx,
    args: CreateNotificationArgs
  ): Promise<{ notificationId: Id<"notifications">; created: boolean }> => {
    const dedupeKey = args.dedupeKey?.trim() || undefined;
    if (dedupeKey) {
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_userId_dedupe", (q) =>
          q.eq("userId", args.targetId).eq("dedupeKey", dedupeKey)
        )
        .first();

      if (existing) {
        return {
          notificationId: existing._id,
          created: false,
        };
      }
    }

    const now = Date.now();
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.targetId,
      kind: args.kind,
      data: args.data,
      source: args.source,
      dedupeKey,
      isSeen: false,
      isDismissed: false,
      createdAt: now,
    });

    return {
      notificationId,
      created: true,
    };
  },
};
