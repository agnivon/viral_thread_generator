import { MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export type NotificationKind = Doc<"notifications">["kind"];

export type NotificationPayloadData = Doc<"notifications">["data"];

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

    if (ctx.scheduler) {
      const slug = args.data.trendKeyword
        ? args.data.trendKeyword
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
        : undefined;
      const targetHref =
        args.data.href ||
        (slug ? `/trends/${encodeURIComponent(slug)}` : "/dashboard");

      await ctx.scheduler.runAfter(
        0,
        internal.actions.pushNotifications.sendPushToUser,
        {
          userId: args.targetId,
          title: args.data.title,
          body: args.data.body || "",
          href: targetHref,
          tag: dedupeKey || args.kind,
          kind: args.kind,
        }
      );
    }

    return {
      notificationId,
      created: true,
    };
  },
};
