"use node";

import googleTrends from "@alkalisummer/google-trends-js";
import { v } from "convex/values";
import { action, internalAction, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { isTrendCronEnabled } from "../lib/env";

export interface EvaluatedTrend {
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

/**
 * Calculates the Emergence Score (E) factoring velocity, recency, cluster breadth, and volume.
 * Incorporates moderate-momentum trends in alignment with user specifications.
 */
export function evaluateEmergence(
  item: {
    keyword: string;
    traffic: number;
    trafficGrowthRate: number;
    startedAtMs: number;
    relatedKeywords: string[];
    rank: number;
  },
  now: number = Date.now()
): { isEmerging: boolean; score: number; tier: "breakout" | "momentum" } {
  const diffMinutes = Math.max(1, Math.floor((now - item.startedAtMs) / (1000 * 60)));

  // Velocity score (40% weight)
  let velocityScore = 0.2;
  if (item.trafficGrowthRate >= 1000) {
    velocityScore = 1.0;
  } else if (item.trafficGrowthRate >= 500) {
    velocityScore = 0.85;
  } else if (item.trafficGrowthRate >= 200) {
    velocityScore = 0.65;
  } else if (item.trafficGrowthRate >= 150) {
    // Moderate momentum threshold
    velocityScore = 0.5;
  } else if (item.trafficGrowthRate > 0) {
    velocityScore = Math.min(0.45, Math.max(0.1, item.trafficGrowthRate / 300));
  }

  // Recency score (30% weight)
  let recencyScore = 0.15;
  if (diffMinutes <= 60) {
    recencyScore = 1.0;
  } else if (diffMinutes <= 120) {
    recencyScore = 0.85;
  } else if (diffMinutes <= 240) {
    recencyScore = 0.6;
  } else if (diffMinutes <= 360) {
    // Within 6 hours (moderate recency)
    recencyScore = 0.45;
  } else {
    recencyScore = Math.max(0.1, 1 - diffMinutes / (12 * 60));
  }

  // Related query cluster breadth (15% weight)
  const clusterScore =
    item.relatedKeywords.length >= 8
      ? 1.0
      : Math.min(1.0, item.relatedKeywords.length / 8);

  // Volume magnitude (15% weight)
  let magnitudeScore = 0.25;
  if (item.traffic >= 100_000) {
    magnitudeScore = 1.0;
  } else if (item.traffic >= 50_000) {
    magnitudeScore = 0.85;
  } else if (item.traffic >= 20_000) {
    magnitudeScore = 0.65;
  } else if (item.traffic >= 10_000) {
    magnitudeScore = 0.45;
  }

  const score = Number(
    (
      0.4 * velocityScore +
      0.3 * recencyScore +
      0.15 * clusterScore +
      0.15 * magnitudeScore
    ).toFixed(3)
  );

  // Inclusion rules (moderate momentum + breakout):
  // Started within the last 6 hours AND either E >= 0.45, growth >= 150%, or 1000 breakout
  const isWithinWindow = diffMinutes <= 360;
  const hasModerateVelocity =
    item.trafficGrowthRate >= 150 || item.trafficGrowthRate === 1000;
  const hasSubstantialVolume =
    item.traffic >= 20000 && item.trafficGrowthRate >= 100;

  const isEmerging =
    isWithinWindow &&
    (score >= 0.45 || hasModerateVelocity || hasSubstantialVolume);

  const tier: "breakout" | "momentum" =
    score >= 0.75 || item.trafficGrowthRate >= 1000 ? "breakout" : "momentum";

  return { isEmerging, score, tier };
}

export interface ProcessEmergingTrendsResult {
  candidateCount: number;
  dispatched: number;
  candidates?: EvaluatedTrend[];
}

/**
 * Main detection logic: polls Google Trends, scores active items, and alerts users.
 */
async function processEmergingTrends(
  ctx: ActionCtx,
  geo: string = "US",
  maxCandidates: number = 30
): Promise<ProcessEmergingTrendsResult> {
  const response = await googleTrends.realTimeTrends({
    geo,
    trendingHours: 24,
  });

  if (response.error || !response.data) {
    console.error("Error from googleTrends.realTimeTrends in trendAlertActions:", response.error);
    return { candidateCount: 0, dispatched: 0 };
  }

  const now = Date.now();
  const seenKeywords = new Set<string>();
  const candidates: EvaluatedTrend[] = [];

  let rank = 1;
  for (const item of response.data) {
    const keyword = String(item.keyword || "").trim();
    const lower = keyword.toLowerCase();
    if (!keyword || seenKeywords.has(lower)) continue;
    seenKeywords.add(lower);

    const parsedTime = item.activeTime ? new Date(item.activeTime).getTime() : now;
    const startedAtMs = !isNaN(parsedTime) && parsedTime > 0 ? parsedTime : now;
    const traffic = typeof item.traffic === "number" ? item.traffic : 0;
    const trafficGrowthRate =
      typeof item.trafficGrowthRate === "number" ? item.trafficGrowthRate : 0;
    const relatedKeywords = Array.isArray(item.relatedKeywords)
      ? item.relatedKeywords.map(String)
      : [];

    const evaluation = evaluateEmergence(
      {
        keyword,
        traffic,
        trafficGrowthRate,
        startedAtMs,
        relatedKeywords,
        rank,
      },
      now
    );

    if (evaluation.isEmerging) {
      candidates.push({
        keyword,
        geo,
        traffic,
        trafficGrowthRate,
        startedAtMs,
        emergenceScore: evaluation.score,
        tier: evaluation.tier,
        relatedKeywords,
        rank,
      });
    }

    rank++;
  }

  // Sort candidate trends by emergence score descending
  candidates.sort((a, b) => b.emergenceScore - a.emergenceScore);
  const selectedCandidates = candidates.slice(0, maxCandidates);

  if (selectedCandidates.length === 0) {
    return { candidateCount: 0, dispatched: 0 };
  }

  // Record candidate trends and distribute alerts to users
  const dispatchResult: { evaluatedCount: number; notificationsDispatched: number } =
    await ctx.runMutation(internal.trendAlerts.recordAndDistributeAlerts, {
      trends: selectedCandidates,
    });

  // Prune any stale trendTracker rows older than 48 hours
  await ctx.runMutation(internal.trendAlerts.pruneStaleTrendTrackers, {});

  return {
    candidateCount: selectedCandidates.length,
    dispatched: dispatchResult.notificationsDispatched,
    candidates: selectedCandidates,
  };
}

/**
 * Public action callable from the client or admin dashboard.
 */
export const detectAndNotifyEmergingTrends = action({
  args: {
    geo: v.optional(v.string()),
    maxCandidates: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ProcessEmergingTrendsResult> => {
    return await processEmergingTrends(ctx, args.geo || "US", args.maxCandidates || 30);
  },
});

/**
 * Internal action triggered on a scheduled interval by Convex Crons.
 * Bypasses execution in development environments.
 */
export const detectAndNotifyEmergingTrendsCron = internalAction({
  args: {},
  handler: async (ctx): Promise<ProcessEmergingTrendsResult> => {
    if (!isTrendCronEnabled()) {
      console.log(
        "[trendAlertActions] Emerging trend detection cron skipped in development environment."
      );
      return { candidateCount: 0, dispatched: 0 };
    }

    return await processEmergingTrends(ctx, "US", 30);
  },
});
