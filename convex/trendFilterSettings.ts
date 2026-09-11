import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  NICHE_DEFINITIONS,
  classifyTrendNiches,
  matchesUserPreferences,
  TrendFilterSettingsInput,
} from "./lib/nicheClassifier.js";

async function requireAuthUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export const DEFAULT_TREND_SETTINGS: TrendFilterSettingsInput = {
  enabled: false, // User requested: Master toggle OFF by default
  minGrowthRate: 150,
  selectedNiches: NICHE_DEFINITIONS.map((n) => n.id),
  whitelistKeywords: [],
  blacklistKeywords: [],
  desktopPushEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
};

/**
 * Returns the creator's trend alert preferences, or sensible defaults if not yet configured.
 */
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);

    const doc = await ctx.db
      .query("trendFilterSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!doc) {
      return {
        ...DEFAULT_TREND_SETTINGS,
        isCustomized: false,
      };
    }

    return {
      _id: doc._id,
      enabled: doc.enabled,
      minGrowthRate: doc.minGrowthRate,
      selectedNiches: doc.selectedNiches,
      whitelistKeywords: doc.whitelistKeywords,
      blacklistKeywords: doc.blacklistKeywords,
      desktopPushEnabled: doc.desktopPushEnabled,
      quietHoursEnabled: doc.quietHoursEnabled,
      quietHoursStart: doc.quietHoursStart,
      quietHoursEnd: doc.quietHoursEnd,
      updatedAt: doc.updatedAt,
      isCustomized: true,
    };
  },
});

/**
 * Updates or creates the user's trend alert and niche preferences.
 */
export const updateSettings = mutation({
  args: {
    enabled: v.boolean(),
    minGrowthRate: v.number(),
    selectedNiches: v.array(v.string()),
    whitelistKeywords: v.array(v.string()),
    blacklistKeywords: v.array(v.string()),
    desktopPushEnabled: v.optional(v.boolean()),
    quietHoursEnabled: v.optional(v.boolean()),
    quietHoursStart: v.optional(v.string()),
    quietHoursEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const now = Date.now();

    // Clean up keywords: trim whitespace, filter empty, deduplicate
    const cleanWhitelist = Array.from(
      new Set(
        args.whitelistKeywords
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const cleanBlacklist = Array.from(
      new Set(
        args.blacklistKeywords
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const existing = await ctx.db
      .query("trendFilterSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const payload = {
      userId,
      enabled: args.enabled,
      minGrowthRate: args.minGrowthRate,
      selectedNiches: args.selectedNiches,
      whitelistKeywords: cleanWhitelist,
      blacklistKeywords: cleanBlacklist,
      desktopPushEnabled: args.desktopPushEnabled ?? existing?.desktopPushEnabled ?? true,
      quietHoursEnabled: args.quietHoursEnabled ?? existing?.quietHoursEnabled ?? false,
      quietHoursStart: args.quietHoursStart ?? existing?.quietHoursStart ?? "22:00",
      quietHoursEnd: args.quietHoursEnd ?? existing?.quietHoursEnd ?? "08:00",
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch("trendFilterSettings", existing._id, payload);
      return { success: true, settingsId: existing._id };
    } else {
      const settingsId = await ctx.db.insert("trendFilterSettings", payload);
      return { success: true, settingsId };
    }
  },
});

/**
 * Returns the list of standard niche definitions.
 */
export const getNichesList = query({
  args: {},
  handler: async () => {
    return NICHE_DEFINITIONS;
  },
});

/**
 * Previews which currently tracked active trends match the user's active filter settings.
 */
export const previewMatchingTrends = query({
  args: {
    overrideSettings: v.optional(
      v.object({
        enabled: v.boolean(),
        minGrowthRate: v.number(),
        selectedNiches: v.array(v.string()),
        whitelistKeywords: v.array(v.string()),
        blacklistKeywords: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    let settings: TrendFilterSettingsInput;
    if (args.overrideSettings) {
      settings = {
        ...DEFAULT_TREND_SETTINGS,
        ...args.overrideSettings,
      };
    } else {
      const doc = await ctx.db
        .query("trendFilterSettings")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

      settings = doc
        ? {
            enabled: doc.enabled,
            minGrowthRate: doc.minGrowthRate,
            selectedNiches: doc.selectedNiches,
            whitelistKeywords: doc.whitelistKeywords,
            blacklistKeywords: doc.blacklistKeywords,
          }
        : DEFAULT_TREND_SETTINGS;
    }

    // Get recent active trends from trendTracker
    const recentTracked = await ctx.db
      .query("trendTracker")
      .withIndex("by_last_evaluated")
      .order("desc")
      .take(50);

    const matches = recentTracked
      .filter((trend) =>
        matchesUserPreferences(
          {
            keyword: trend.keyword,
            trafficGrowthRate: trend.trafficGrowthRate,
            relatedKeywords: trend.relatedKeywords,
          },
          // For preview purposes, pretend enabled is true so user can see what WOULD match
          { ...settings, enabled: true }
        )
      )
      .map((trend) => ({
        ...trend,
        classifiedNiches: classifyTrendNiches(
          trend.keyword,
          trend.relatedKeywords || []
        ),
      }));

    return {
      totalTracked: recentTracked.length,
      matchedCount: matches.length,
      matches: matches.slice(0, 15),
    };
  },
});
