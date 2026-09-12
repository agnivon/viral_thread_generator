/// <reference types="vite/client" />
"use node";

import { convexTest } from "convex-test";
import { expect, test, vi, afterEach } from "vitest";
import schema from "../schema";
import { internal } from "../_generated/api";
import { evaluateEmergence } from "../actions/trendAlerts";

const modules = import.meta.glob("../**/*.ts");

afterEach(() => {
  vi.restoreAllMocks();
});

test("evaluateEmergence correctly classifies explosive breakout trends", () => {
  const now = Date.now();
  const breakoutTrend = {
    keyword: "deepseek-v4",
    traffic: 100_000,
    trafficGrowthRate: 1000,
    startedAtMs: now - 45 * 60 * 1000, // 45m ago
    relatedKeywords: ["deepseek", "ai release", "benchmarks", "open source", "coding model", "llm"],
    rank: 1,
  };

  const result = evaluateEmergence(breakoutTrend, now);
  expect(result.isEmerging).toBe(true);
  expect(result.tier).toBe("breakout");
  expect(result.score).toBeGreaterThanOrEqual(0.75);
});

test("evaluateEmergence includes moderate-momentum trends in threshold default", () => {
  const now = Date.now();
  const moderateTrend = {
    keyword: "anthropic claude updates",
    traffic: 30_000,
    trafficGrowthRate: 180, // Moderate velocity (+180%)
    startedAtMs: now - 150 * 60 * 1000, // 2.5 hours ago
    relatedKeywords: ["claude 3.7", "sonnet update", "ai tooling"],
    rank: 8,
  };

  const result = evaluateEmergence(moderateTrend, now);
  expect(result.isEmerging).toBe(true);
  expect(result.tier).toBe("momentum");
  expect(result.score).toBeGreaterThanOrEqual(0.45);
});

test("evaluateEmergence rejects stale or low-velocity trends", () => {
  const now = Date.now();
  const staleTrend = {
    keyword: "old archived topic",
    traffic: 10_000,
    trafficGrowthRate: 20,
    startedAtMs: now - 24 * 60 * 60 * 1000, // 24 hours ago
    relatedKeywords: ["archive"],
    rank: 45,
  };

  const result = evaluateEmergence(staleTrend, now);
  expect(result.isEmerging).toBe(false);
});

test("recordAndDistributeAlerts creates trendTracker records and dispatches alerts to users with deduplication", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  // Create two users with enabled trend alerts
  const user1 = await t.mutation(async (ctx) => {
    const u = await ctx.db.insert("users", {});
    await ctx.db.insert("trendFilterSettings", {
      userId: u,
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: ["tech_ai", "finance_crypto"],
      whitelistKeywords: [],
      blacklistKeywords: [],
      desktopPushEnabled: true,
      quietHoursEnabled: false,
      updatedAt: now,
    });
    return u;
  });
  const _user2 = await t.mutation(async (ctx) => {
    const u = await ctx.db.insert("users", {});
    await ctx.db.insert("trendFilterSettings", {
      userId: u,
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: ["tech_ai", "finance_crypto"],
      whitelistKeywords: [],
      blacklistKeywords: [],
      desktopPushEnabled: true,
      quietHoursEnabled: false,
      updatedAt: now,
    });
    return u;
  });

  const candidateTrends = [
    {
      keyword: "Gemma 4 Launch",
      geo: "US",
      traffic: 50000,
      trafficGrowthRate: 1000,
      startedAtMs: now - 30 * 60 * 1000,
      emergenceScore: 0.88,
      tier: "breakout" as const,
      relatedKeywords: ["gemma 4", "google ai", "open weights"],
      rank: 1,
    },
    {
      keyword: "Tech Stocks Rally",
      geo: "US",
      traffic: 25000,
      trafficGrowthRate: 220,
      startedAtMs: now - 120 * 60 * 1000,
      emergenceScore: 0.58,
      tier: "momentum" as const,
      relatedKeywords: ["nasdaq", "nvidia", "earnings"],
      rank: 4,
    },
  ];

  // Run alert distribution
  const res1 = await t.mutation(internal.trendAlerts.recordAndDistributeAlerts, {
    trends: candidateTrends,
  });

  expect(res1.evaluatedCount).toBe(2);
  // 2 trends * 2 users = 4 notifications
  expect(res1.notificationsDispatched).toBe(4);

  // Check trendTracker persistence
  const trackers = await t.query(async (ctx) => {
    return await ctx.db.query("trendTracker").collect();
  });
  expect(trackers).toHaveLength(2);
  const gemmaTracker = trackers.find((t) => t.keyword === "Gemma 4 Launch");
  expect(gemmaTracker).toBeDefined();
  expect(gemmaTracker?.tier).toBe("breakout");
  expect(gemmaTracker?.trafficGrowthRate).toBe(1000);

  // Check notifications created for user1
  const user1Notifs = await t.query(async (ctx) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user1))
      .collect();
  });
  expect(user1Notifs).toHaveLength(2);
  const breakoutNotif = user1Notifs.find(
    (n) => n.data.trendKeyword === "Gemma 4 Launch"
  );
  expect(breakoutNotif).toBeDefined();
  expect(breakoutNotif?.data.trendKeyword).toBe("Gemma 4 Launch");
  expect(breakoutNotif?.data.traffic).toBe(50000);
  expect(breakoutNotif?.data.growthRate).toBe(1000);
  expect(breakoutNotif?.kind).toBe("emerging_trend_alert");
  expect(breakoutNotif?.data.title).toContain("⚡ Breakout Trend");
  expect(breakoutNotif?.data.href).toBeUndefined();

  // Re-running the exact same candidate trends within the cycle should be deduplicated (0 new notifications)
  const res2 = await t.mutation(internal.trendAlerts.recordAndDistributeAlerts, {
    trends: candidateTrends,
  });
  expect(res2.notificationsDispatched).toBe(0);

  // Notifications count for user1 should remain 2
  const user1NotifsAfter = await t.query(async (ctx) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user1))
      .collect();
  });
  expect(user1NotifsAfter).toHaveLength(2);
});

test("pruneStaleTrendTrackers removes trackers older than 48 hours", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  // Insert one recent tracker and one stale tracker (> 48h old)
  await t.mutation(async (ctx) => {
    await ctx.db.insert("trendTracker", {
      keyword: "Recent Trend",
      geo: "US",
      traffic: 10000,
      trafficGrowthRate: 200,
      startedAtMs: now - 3600000,
      firstSeenAt: now - 3600000,
      lastEvaluatedAt: now,
      emergenceScore: 0.6,
      tier: "momentum",
    });

    await ctx.db.insert("trendTracker", {
      keyword: "Stale Trend",
      geo: "US",
      traffic: 5000,
      trafficGrowthRate: 50,
      startedAtMs: now - 72 * 3600000,
      firstSeenAt: now - 72 * 3600000,
      lastEvaluatedAt: now - 50 * 3600000, // 50h ago (> 48h)
      emergenceScore: 0.3,
      tier: "momentum",
    });
  });

  const pruneResult = await t.mutation(internal.trendAlerts.pruneStaleTrendTrackers, {
    retentionHours: 48,
  });
  expect(pruneResult.pruned).toBe(1);

  const remaining = await t.query(async (ctx) => {
    return await ctx.db.query("trendTracker").collect();
  });
  expect(remaining).toHaveLength(1);
  expect(remaining[0].keyword).toBe("Recent Trend");
});

test("detectAndNotifyEmergingTrendsCron skips execution in development environment", async () => {
  const t = convexTest(schema, modules);

  const prevDeployment = process.env.CONVEX_DEPLOYMENT;
  try {
    process.env.CONVEX_DEPLOYMENT = "dev:test-deployment";
    const result = await t.action(
      internal.actions.trendAlerts.detectAndNotifyEmergingTrendsCron,
      {}
    );
    expect(result).toEqual({ candidateCount: 0, dispatched: 0 });
  } finally {
    process.env.CONVEX_DEPLOYMENT = prevDeployment;
  }
});

