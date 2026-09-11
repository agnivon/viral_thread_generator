import { v } from "convex/values";
import { internalMutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { notifications } from "./notifications/client";
import { getAuthUserId } from "@convex-dev/auth/server";
import { matchesUserPreferences } from "./lib/nicheClassifier.js";

export interface CandidateTrendPayload {
  keyword: string;
  geo: string;
  traffic: number;
  trafficGrowthRate: number;
  startedAtMs: number;
  emergenceScore: number;
  tier: "breakout" | "momentum";
  relatedKeywords: string[];
  rank: number;
}

function formatVolumeLabel(traffic: number): string {
  if (traffic >= 1_000_000) {
    return `${(traffic / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
  }
  if (traffic >= 1_000) {
    return `${Math.round(traffic / 1_000)}K+`;
  }
  return traffic > 0 ? `${traffic}` : "Rising";
}

function formatGrowthLabel(growth: number): string {
  if (growth >= 1000) {
    return "Breakout (+1000%)";
  }
  return `+${growth}%`;
}

function formatTimeAgo(startedAtMs: number): string {
  if (!startedAtMs || isNaN(startedAtMs)) return "recently";
  const diffMinutes = Math.max(1, Math.floor((Date.now() - startedAtMs) / (1000 * 60)));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Persists evaluated candidate trends into trendTracker and dispatches
 * emerging_trend_alert notifications to all users with cycle deduplication.
 */
export const recordAndDistributeAlerts = internalMutation({
  args: {
    trends: v.array(
      v.object({
        keyword: v.string(),
        geo: v.string(),
        traffic: v.number(),
        trafficGrowthRate: v.number(),
        startedAtMs: v.number(),
        emergenceScore: v.number(),
        tier: v.string(),
        relatedKeywords: v.array(v.string()),
        rank: v.number(),
      })
    ),
  },
  handler: async (ctx: MutationCtx, args) => {
    const now = Date.now();
    // Pre-fetch all user filter settings once; only iterate over users with alerts enabled
    const allSettings = await ctx.db.query("trendFilterSettings").collect();
    const enabledSettings = allSettings.filter((s) => s.enabled);
    let notificationsDispatched = 0;

    for (const item of args.trends) {
      // 1. Check or update trendTracker record
      const existingTracker = await ctx.db
        .query("trendTracker")
        .withIndex("by_keyword_geo", (q) =>
          q.eq("keyword", item.keyword).eq("geo", item.geo)
        )
        .first();

      let trackerId;
      if (existingTracker) {
        trackerId = existingTracker._id;
        await ctx.db.patch("trendTracker", trackerId, {
          traffic: item.traffic,
          trafficGrowthRate: item.trafficGrowthRate,
          lastEvaluatedAt: now,
          emergenceScore: item.emergenceScore,
          tier: item.tier,
          relatedKeywords: item.relatedKeywords,
          notifiedAt: existingTracker.notifiedAt ?? now,
        });
      } else {
        trackerId = await ctx.db.insert("trendTracker", {
          keyword: item.keyword,
          geo: item.geo,
          traffic: item.traffic,
          trafficGrowthRate: item.trafficGrowthRate,
          startedAtMs: item.startedAtMs,
          firstSeenAt: now,
          lastEvaluatedAt: now,
          emergenceScore: item.emergenceScore,
          tier: item.tier,
          notifiedAt: now,
          relatedKeywords: item.relatedKeywords,
        });
      }

      // 2. Prepare dedupe key and pre-seed href for 1-click thread creation
      // Cycle dedupe key ensures each user receives at most one alert per trend spike cycle.
      // Use existingTracker's original startedAtMs if available to maintain cycle stability across cron runs.
      const stableStartMs = existingTracker?.startedAtMs ?? item.startedAtMs;
      const cycleKey = `trend_${item.keyword.toLowerCase().trim()}_${stableStartMs}`;
      const volText = formatVolumeLabel(item.traffic);
      const growthText = formatGrowthLabel(item.trafficGrowthRate);
      const timeAgoText = formatTimeAgo(stableStartMs);

      const title =
        item.tier === "breakout"
          ? `⚡ Breakout Trend: ${item.keyword}`
          : `🔥 Emerging Trend: ${item.keyword}`;

      const queriesContext =
        item.relatedKeywords.length > 0
          ? ` Related queries: ${item.relatedKeywords.slice(0, 3).join(", ")}.`
          : "";

      const body = `${volText} searches • ${growthText} spike • Started ${timeAgoText}.${queriesContext}`;

      // 3. Dispatch notification to active users whose filter settings match this trend
      for (const userSettings of enabledSettings) {
        const isMatch = matchesUserPreferences(
          {
            keyword: item.keyword,
            trafficGrowthRate: item.trafficGrowthRate,
            relatedKeywords: item.relatedKeywords,
          },
          {
            enabled: userSettings.enabled,
            minGrowthRate: userSettings.minGrowthRate,
            selectedNiches: userSettings.selectedNiches,
            whitelistKeywords: userSettings.whitelistKeywords,
            blacklistKeywords: userSettings.blacklistKeywords,
          }
        );

        if (!isMatch) {
          continue;
        }

        const result = await notifications.create(ctx, {
          targetId: userSettings.userId,
          kind: "emerging_trend_alert",
          data: {
            title,
            body,
            trendKeyword: item.keyword,
            traffic: item.traffic,
            growthRate: item.trafficGrowthRate,
          },
          dedupeKey: cycleKey,
        });

        if (result.created) {
          notificationsDispatched++;
        }
      }
    }

    return {
      evaluatedCount: args.trends.length,
      notificationsDispatched,
    };
  },
});

/**
 * Prunes stale trendTracker rows older than 48 hours to prevent database accumulation.
 */
export const pruneStaleTrendTrackers = internalMutation({
  args: {
    retentionHours: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const hours = args.retentionHours ?? 48;
    const limit = args.limit ?? 100;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    const staleDocs = await ctx.db
      .query("trendTracker")
      .withIndex("by_last_evaluated", (q) => q.lt("lastEvaluatedAt", cutoff))
      .take(limit);

    for (const doc of staleDocs) {
      await ctx.db.delete("trendTracker", doc._id);
    }

    return { pruned: staleDocs.length };
  },
});

/**
 * Lists recently tracked emerging trends for authenticated dashboard users.
 */
export const listRecentEmergingTrends = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx: QueryCtx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const limit = args.limit ?? 25;
    return await ctx.db
      .query("trendTracker")
      .withIndex("by_last_evaluated")
      .order("desc")
      .take(limit);
  },
});
