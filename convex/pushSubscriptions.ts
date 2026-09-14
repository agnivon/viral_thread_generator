import { v } from "convex/values";
import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { requireAuthUserId } from "./auth";

export const saveSubscription = mutation({
  args: {
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (existing) {
      const isUnchanged =
        existing.userId === userId &&
        existing.keys.p256dh === args.keys.p256dh &&
        existing.keys.auth === args.keys.auth &&
        existing.userAgent === args.userAgent;

      if (isUnchanged) {
        return { success: true, id: existing._id };
      }

      await ctx.db.patch("pushSubscriptions", existing._id, {
        userId,
        keys: args.keys,
        userAgent: args.userAgent,
        updatedAt: now,
      });
      return { success: true, id: existing._id };
    }

    const id = await ctx.db.insert("pushSubscriptions", {
      userId,
      endpoint: args.endpoint,
      keys: args.keys,
      userAgent: args.userAgent,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

export const removeSubscription = mutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (existing && existing.userId === userId) {
      await ctx.db.delete("pushSubscriptions", existing._id);
      return { success: true };
    }

    return { success: false };
  },
});

export const listByUserInternal = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const removeDeadSubscriptionInternal = internalMutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (existing) {
      await ctx.db.delete("pushSubscriptions", existing._id);
      return { removed: true };
    }

    return { removed: false };
  },
});

export const getUserPushSettingsInternal = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trendFilterSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const countAllInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db.query("pushSubscriptions").collect();
    return {
      count: subs.length,
      endpoints: subs.map((s) => ({
        endpoint: s.endpoint.slice(0, 40) + "...",
        userId: s.userId,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
      })),
    };
  },
});

