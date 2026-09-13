/// <reference types="vite/client" />
"use node";

import { convexTest } from "convex-test";
import { expect, test, vi, afterEach } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import { evaluateEmergence } from "../actions/trendAlerts";
import googleTrends from "@alkalisummer/google-trends-js";

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

test("detectAndNotifyEmergingTrends action rejects unauthenticated callers and authorizes authenticated users", async () => {
  const t = convexTest(schema, modules);

  // 1. Unauthenticated invocation must fail with Unauthorized
  await expect(
    t.action(api.actions.trendAlerts.detectAndNotifyEmergingTrends, { geo: "US", maxCandidates: 10 })
  ).rejects.toThrow("Unauthorized");

  // 2. Authenticated invocation succeeds
  const user = await t.mutation(async (ctx) => ctx.db.insert("users", {}));
  const tAuthed = t.withIdentity({ subject: user });

  vi.spyOn(googleTrends, "realTimeTrends").mockResolvedValue({
    error: null,
    data: [],
  } as any);

  const result = await tAuthed.action(api.actions.trendAlerts.detectAndNotifyEmergingTrends, {
    geo: "US",
    maxCandidates: 10,
  });

  expect(result).toEqual({ candidateCount: 0, dispatched: 0 });
});

test("evaluateEmergence applies acceleration boost and deceleration penalty", () => {
  const now = Date.now();
  const baseItem = {
    keyword: "accelerating trend",
    traffic: 30000,
    trafficGrowthRate: 180,
    startedAtMs: now - 60 * 60 * 1000,
    relatedKeywords: ["ai", "models"],
    rank: 5,
  };

  const normalRes = evaluateEmergence(baseItem, now);
  const boostedRes = evaluateEmergence({ ...baseItem, acceleration: 120 }, now);
  const penalizedRes = evaluateEmergence({ ...baseItem, acceleration: -150 }, now);

  expect(boostedRes.score).toBeGreaterThan(normalRes.score);
  expect(penalizedRes.score).toBeLessThan(normalRes.score);
});

test("recordAndDistributeAlerts suppresses alerts for decaying trends while updating tracker", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  const user = await t.mutation(async (ctx) => {
    const u = await ctx.db.insert("users", {});
    await ctx.db.insert("trendFilterSettings", {
      userId: u,
      enabled: true,
      minGrowthRate: 100,
      selectedNiches: ["tech_ai"],
      whitelistKeywords: [],
      blacklistKeywords: [],
      desktopPushEnabled: true,
      quietHoursEnabled: false,
      updatedAt: now,
    });
    return u;
  });

  // Pre-seed an existing mature trend that peaked earlier
  const startedAt = now - 3 * 60 * 60 * 1000; // 3 hours ago
  await t.mutation(async (ctx) => {
    await ctx.db.insert("trendTracker", {
      keyword: "Fading Tech News",
      geo: "US",
      traffic: 45000,
      trafficGrowthRate: 300,
      startedAtMs: startedAt,
      firstSeenAt: startedAt,
      lastEvaluatedAt: now - 15 * 60 * 1000,
      emergenceScore: 0.65,
      tier: "momentum",
      peakGrowthRate: 800,
      velocityHistory: [
        { evaluatedAt: startedAt + 30 * 60 * 1000, traffic: 30000, growthRate: 800 },
        { evaluatedAt: now - 15 * 60 * 1000, traffic: 45000, growthRate: 300 },
      ],
      notifiedAt: startedAt,
    });
  });

  // Candidate trend has decelerated sharply to +100% (decaying)
  const decayingCandidate = [
    {
      keyword: "Fading Tech News",
      geo: "US",
      traffic: 46000,
      trafficGrowthRate: 100, // Dropped from 800 peak to 100 (< 50% of peak, negative delta)
      startedAtMs: startedAt,
      emergenceScore: 0.45,
      tier: "momentum" as const,
      relatedKeywords: ["tech"],
      rank: 10,
    },
  ];

  const res = await t.mutation(internal.trendAlerts.recordAndDistributeAlerts, {
    trends: decayingCandidate,
  });

  // Should NOT dispatch notification due to decay suppression
  expect(res.notificationsDispatched).toBe(0);

  // But trendTracker should be updated with decaying trajectory status
  const tracker = await t.query(async (ctx) => {
    return await ctx.db
      .query("trendTracker")
      .withIndex("by_keyword_geo", (q) =>
        q.eq("keyword", "Fading Tech News").eq("geo", "US")
      )
      .first();
  });

  expect(tracker?.trajectoryStatus).toBe("decaying");
  expect(tracker?.peakGrowthRate).toBe(800);
  expect(tracker?.velocityHistory).toHaveLength(3);

  // User notifications should remain empty
  const notifs = await t.query(async (ctx) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user))
      .collect();
  });
  expect(notifs).toHaveLength(0);
});

test("recordAndDistributeAlerts dispatches 2nd-wave catalyst re-spike alerts with dedicated cycle key", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  const user = await t.mutation(async (ctx) => {
    const u = await ctx.db.insert("users", {});
    await ctx.db.insert("trendFilterSettings", {
      userId: u,
      enabled: true,
      minGrowthRate: 100,
      selectedNiches: ["tech_ai"],
      whitelistKeywords: [],
      blacklistKeywords: [],
      desktopPushEnabled: true,
      quietHoursEnabled: false,
      updatedAt: now,
    });
    return u;
  });

  const startedAt = now - 2 * 60 * 60 * 1000; // 2 hours ago

  // Pre-seed an existing trend that had subsided to 120%
  await t.mutation(async (ctx) => {
    await ctx.db.insert("trendTracker", {
      keyword: "Autonomous Agent Breakthrough",
      geo: "US",
      traffic: 30000,
      trafficGrowthRate: 120,
      startedAtMs: startedAt,
      firstSeenAt: startedAt,
      lastEvaluatedAt: now - 20 * 60 * 1000,
      emergenceScore: 0.5,
      tier: "momentum",
      peakGrowthRate: 400,
      velocityHistory: [
        { evaluatedAt: startedAt + 15 * 60 * 1000, traffic: 20000, growthRate: 400 },
        { evaluatedAt: now - 20 * 60 * 1000, traffic: 30000, growthRate: 120 },
      ],
      notifiedAt: startedAt,
    });

    // Also pre-seed the initial notification that the user already received earlier
    await ctx.db.insert("notifications", {
      userId: user,
      kind: "emerging_trend_alert",
      data: {
        title: "🔥 Emerging Trend: Autonomous Agent Breakthrough",
        body: "Initial alert",
        trendKeyword: "Autonomous Agent Breakthrough",
      },
      dedupeKey: `trend_autonomous agent breakthrough_${startedAt}`,
      isSeen: true,
      isDismissed: false,
      createdAt: startedAt,
    });
  });

  // Sudden catalyst re-spike: growth jumps from 120 to 500 (+380% delta)
  const respikeCandidate = [
    {
      keyword: "Autonomous Agent Breakthrough",
      geo: "US",
      traffic: 75000,
      trafficGrowthRate: 500,
      startedAtMs: startedAt,
      emergenceScore: 0.85,
      tier: "breakout" as const,
      relatedKeywords: ["agentic ai", "benchmark", "autonomous"],
      rank: 2,
    },
  ];

  const res = await t.mutation(internal.trendAlerts.recordAndDistributeAlerts, {
    trends: respikeCandidate,
  });

  // Re-spike notification SHOULD be dispatched
  expect(res.notificationsDispatched).toBe(1);

  // Check the notification content
  const notifs = await t.query(async (ctx) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user))
      .collect();
  });

  // Now user has 2 notifications (initial + re-spike)
  expect(notifs).toHaveLength(2);
  const respikeNotif = notifs.find((n) => n.data.title.includes("⚡ Catalyst Re-Spike"));
  expect(respikeNotif).toBeDefined();
  expect(respikeNotif?.data.trajectoryStatus).toBe("re_spiking");
  expect(respikeNotif?.data.acceleration).toBeGreaterThan(0);
  expect(respikeNotif?.data.body).toContain("2nd-wave catalyst surge");

  // Trend tracker is updated with re_spiking status
  const tracker = await t.query(async (ctx) => {
    return await ctx.db
      .query("trendTracker")
      .withIndex("by_keyword_geo", (q) =>
        q.eq("keyword", "Autonomous Agent Breakthrough").eq("geo", "US")
      )
      .first();
  });

  expect(tracker?.trajectoryStatus).toBe("re_spiking");
  expect(tracker?.tier).toBe("breakout");
  expect(tracker?.peakGrowthRate).toBe(500);
});

