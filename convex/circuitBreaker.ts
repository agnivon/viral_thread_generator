import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Fetches all currently active circuit breaker trips where trippedUntil > now.
 */
export const getActiveTrips = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const trips = await ctx.db
      .query("circuitBreaker")
      .withIndex("by_trippedUntil", (q) => q.gt("trippedUntil", now))
      .collect();

    return trips.map((trip) => ({
      type: trip.type,
      target: trip.target,
      trippedUntil: trip.trippedUntil,
      reason: trip.reason,
      category: trip.category,
    }));
  },
});

/**
 * Upserts a trip record for a key or model.
 */
export const recordTrip = internalMutation({
  args: {
    type: v.union(v.literal("key"), v.literal("model"), v.literal("key_model")),
    target: v.string(),
    trippedUntil: v.number(),
    reason: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("circuitBreaker")
      .withIndex("by_type_target", (q) => q.eq("type", args.type).eq("target", args.target))
      .first();

    if (existing) {
      const finalTrippedUntil = Math.max(existing.trippedUntil, args.trippedUntil);
      const isNewerOrLonger = args.trippedUntil >= existing.trippedUntil || existing.trippedUntil <= now;
      await ctx.db.patch("circuitBreaker", existing._id, {
        trippedUntil: finalTrippedUntil,
        reason: isNewerOrLonger ? args.reason : existing.reason,
        category: isNewerOrLonger ? args.category : existing.category,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("circuitBreaker", {
        type: args.type,
        target: args.target,
        trippedUntil: args.trippedUntil,
        reason: args.reason,
        category: args.category,
        updatedAt: now,
      });
    }
  },
});

/**
 * Removes a trip record for a key or model when it recovers.
 */
export const clearTrip = internalMutation({
  args: {
    type: v.union(v.literal("key"), v.literal("model"), v.literal("key_model")),
    target: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("circuitBreaker")
      .withIndex("by_type_target", (q) => q.eq("type", args.type).eq("target", args.target))
      .collect();

    for (const doc of existing) {
      await ctx.db.delete("circuitBreaker", doc._id);
    }
  },
});

/**
 * Periodically cleans up expired circuit breaker records.
 */
export const cleanupExpiredTrips = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("circuitBreaker")
      .withIndex("by_trippedUntil", (q) => q.lte("trippedUntil", now))
      .take(100);

    for (const doc of expired) {
      await ctx.db.delete("circuitBreaker", doc._id);
    }
    return expired.length;
  },
});
