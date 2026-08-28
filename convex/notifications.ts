import { v } from "convex/values";
import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

async function requireAuthUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export const list = query({
  args: {
    limit: v.optional(v.number()),
    includeDismissed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const limit = args.limit ?? 50;

    let items;
    if (args.includeDismissed) {
      items = await ctx.db
        .query("notifications")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit);
    } else {
      items = await ctx.db
        .query("notifications")
        .withIndex("by_userId_active", (q) =>
          q.eq("userId", userId).eq("isDismissed", false)
        )
        .order("desc")
        .take(limit);
    }

    return items.map((doc) => ({
      _id: doc._id,
      targetId: doc.userId,
      kind: doc.kind,
      data: doc.data,
      source: doc.source,
      dedupeKey: doc.dedupeKey,
      isSeen: doc.isSeen,
      isDismissed: doc.isDismissed,
      seenAt: doc.seenAt,
      dismissedAt: doc.dismissedAt,
      createdAt: doc.createdAt,
    }));
  },
});

export const unseenCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);
    const unseenDocs = await ctx.db
      .query("notifications")
      .withIndex("by_userId_unseen", (q) =>
        q.eq("userId", userId).eq("isDismissed", false).eq("isSeen", false)
      )
      .collect();

    return unseenDocs.length;
  },
});

export const counts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);

    const allDocs = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const total = allDocs.length;
    const active = allDocs.filter((d) => !d.isDismissed).length;
    const unseen = allDocs.filter((d) => !d.isDismissed && !d.isSeen).length;

    return { total, active, unseen };
  },
});

export const markSeen = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const notification = await ctx.db.get("notifications", args.notificationId);

    if (!notification || notification.userId !== userId) {
      return { success: false };
    }

    if (notification.isSeen) {
      return { success: true };
    }

    const now = Date.now();
    await ctx.db.patch("notifications", args.notificationId, {
      isSeen: true,
      seenAt: now,
    });

    return { success: true };
  },
});

export const markAllSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);

    const unseenDocs = await ctx.db
      .query("notifications")
      .withIndex("by_userId_unseen", (q) =>
        q.eq("userId", userId).eq("isDismissed", false).eq("isSeen", false)
      )
      .collect();

    const now = Date.now();
    for (const doc of unseenDocs) {
      await ctx.db.patch("notifications", doc._id, {
        isSeen: true,
        seenAt: now,
      });
    }

    return { touched: unseenDocs.length };
  },
});

export const dismiss = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const notification = await ctx.db.get("notifications", args.notificationId);

    if (!notification || notification.userId !== userId) {
      return { success: false };
    }

    if (notification.isDismissed) {
      return { success: true };
    }

    const now = Date.now();
    await ctx.db.patch("notifications", args.notificationId, {
      isDismissed: true,
      isSeen: true,
      dismissedAt: now,
      seenAt: notification.seenAt ?? now,
    });

    return { success: true };
  },
});

export const dismissAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);

    const activeDocs = await ctx.db
      .query("notifications")
      .withIndex("by_userId_active", (q) =>
        q.eq("userId", userId).eq("isDismissed", false)
      )
      .collect();

    const now = Date.now();
    for (const doc of activeDocs) {
      await ctx.db.patch("notifications", doc._id, {
        isDismissed: true,
        isSeen: true,
        dismissedAt: now,
        seenAt: doc.seenAt ?? now,
      });
    }

    return { touched: activeDocs.length };
  },
});

export const purgeDismissed = internalMutation({
  args: {
    retentionDays: v.optional(v.number()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const retentionDays = args.retentionDays ?? 7;
    const batchSize = args.batchSize ?? 100;
    const cutoffTimestamp = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const staleDocs = await ctx.db
      .query("notifications")
      .withIndex("by_dismissed_at", (q) =>
        q.eq("isDismissed", true).lt("dismissedAt", cutoffTimestamp)
      )
      .take(batchSize);

    for (const doc of staleDocs) {
      await ctx.db.delete("notifications", doc._id);
    }

    if (staleDocs.length === batchSize) {
      await ctx.scheduler.runAfter(0, internal.notifications.purgeDismissed, {
        retentionDays,
        batchSize,
      });
    }

    return { purged: staleDocs.length };
  },
});
