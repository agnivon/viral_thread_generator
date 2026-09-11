/// <reference types="vite/client" />
"use node";

import { convexTest } from "convex-test";
import { expect, test, vi, afterEach } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import {
  classifyTrendNiches,
  matchesUserPreferences,
} from "./lib/nicheClassifier";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => {
  vi.restoreAllMocks();
});

test("classifyTrendNiches maps keywords to appropriate creator niches", () => {
  expect(
    classifyTrendNiches("deepseek-v4", ["coding model", "ai release", "benchmarks"])
  ).toContain("tech_ai");

  expect(
    classifyTrendNiches("bitcoin rally", ["crypto", "btc", "solana"])
  ).toContain("finance_crypto");

  expect(
    classifyTrendNiches("pumas - león", ["liga mx", "soccer", "match"])
  ).toContain("sports");

  expect(
    classifyTrendNiches("jonas brothers", ["nick jonas", "concert", "music album"])
  ).toContain("entertainment");

  expect(
    classifyTrendNiches("call of duty patch", ["gaming", "ps5", "xbox", "multiplayer"])
  ).toContain("gaming");

  expect(
    classifyTrendNiches("fda flu vaccine", ["covid", "health study", "medicine"])
  ).toContain("science_health");

  expect(
    classifyTrendNiches("presidential election debate", ["senate vote", "white house"])
  ).toContain("politics_world");

  expect(
    classifyTrendNiches("saas startup raises seed round", ["founder", "venture capital"])
  ).toContain("business_startups");
});

test("matchesUserPreferences enforces master toggle, blacklist, whitelist, and niche filters", () => {
  const techTrend = {
    keyword: "deepseek-v4 coding agent",
    trafficGrowthRate: 1000,
    relatedKeywords: ["deepseek", "ai"],
  };

  const sportsTrend = {
    keyword: "super bowl touchdown",
    trafficGrowthRate: 800,
    relatedKeywords: ["nfl", "football", "quarterback"],
  };

  // 1. Master toggle OFF (User directive: default is OFF)
  expect(
    matchesUserPreferences(techTrend, {
      enabled: false,
      minGrowthRate: 150,
      selectedNiches: ["tech_ai"],
      whitelistKeywords: [],
      blacklistKeywords: [],
    })
  ).toBe(false);

  // 2. Master toggle ON with Tech niche selected
  expect(
    matchesUserPreferences(techTrend, {
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: ["tech_ai"],
      whitelistKeywords: [],
      blacklistKeywords: [],
    })
  ).toBe(true);

  // 3. Tech subscriber should NOT match sports trend
  expect(
    matchesUserPreferences(sportsTrend, {
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: ["tech_ai"],
      whitelistKeywords: [],
      blacklistKeywords: [],
    })
  ).toBe(false);

  // 4. Blacklist suppression (negative keyword ignores trend even if in selected niche)
  expect(
    matchesUserPreferences(techTrend, {
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: ["tech_ai"],
      whitelistKeywords: [],
      blacklistKeywords: ["deepseek"],
    })
  ).toBe(false);

  // 5. Whitelist priority (matches even if niche is NOT selected)
  expect(
    matchesUserPreferences(techTrend, {
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: ["sports"], // User only selected sports
      whitelistKeywords: ["deepseek"], // Whitelist overrides
      blacklistKeywords: [],
    })
  ).toBe(true);

  // 6. Velocity sensitivity
  const lowVelocityTrend = {
    keyword: "openai minor tweak",
    trafficGrowthRate: 100, // < 150
    relatedKeywords: ["ai"],
  };
  expect(
    matchesUserPreferences(lowVelocityTrend, {
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: ["tech_ai"],
      whitelistKeywords: [],
      blacklistKeywords: [],
    })
  ).toBe(false);

  // 7. Empty selectedNiches (Clear All) must NOT match non-whitelisted trends
  expect(
    matchesUserPreferences(techTrend, {
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: [],
      whitelistKeywords: [],
      blacklistKeywords: [],
    })
  ).toBe(false);

  // 8. Empty selectedNiches DOES match when keyword is whitelisted
  expect(
    matchesUserPreferences(techTrend, {
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: [],
      whitelistKeywords: ["deepseek"],
      blacklistKeywords: [],
    })
  ).toBe(true);

  // 9. Word boundary precision: "ai" must NOT match "email" or "spain"
  const emailTrend = {
    keyword: "new email client release",
    trafficGrowthRate: 500,
    relatedKeywords: ["inbox"],
  };
  expect(
    matchesUserPreferences(emailTrend, {
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: [],
      whitelistKeywords: ["ai"], // Whitelist "ai"
      blacklistKeywords: [],
    })
  ).toBe(false);

  // 10. Word boundary precision: "war" in blacklist must NOT block "software"
  const softwareTrend = {
    keyword: "open source software developer tools",
    trafficGrowthRate: 500,
    relatedKeywords: ["coding"],
    classifiedNiches: ["tech_ai"],
  };
  expect(
    matchesUserPreferences(softwareTrend, {
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: ["tech_ai"],
      whitelistKeywords: [],
      blacklistKeywords: ["war"], // Blacklist "war"
    })
  ).toBe(true);
});

test("getSettings and updateSettings CRUD operations work with sensible defaults", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const asUser = t.withIdentity({ subject: userId });

  // Initial call returns default settings (enabled is false)
  const initialSettings = await asUser.query(api.trendFilterSettings.getSettings, {});
  expect(initialSettings.enabled).toBe(false);
  expect(initialSettings.isCustomized).toBe(false);
  expect(initialSettings.minGrowthRate).toBe(150);
  expect(initialSettings.selectedNiches).toContain("tech_ai");

  // User customizes settings
  const updateRes = await asUser.mutation(api.trendFilterSettings.updateSettings, {
    enabled: true,
    minGrowthRate: 500,
    selectedNiches: ["tech_ai", "finance_crypto"],
    whitelistKeywords: ["deepseek", "  NVIDIA  "], // Tests trimming
    blacklistKeywords: ["sports"],
  });
  expect(updateRes.success).toBe(true);

  // Fetch updated settings
  const updatedSettings = await asUser.query(api.trendFilterSettings.getSettings, {});
  expect(updatedSettings.enabled).toBe(true);
  expect(updatedSettings.isCustomized).toBe(true);
  expect(updatedSettings.minGrowthRate).toBe(500);
  expect(updatedSettings.selectedNiches).toEqual(["tech_ai", "finance_crypto"]);
  expect(updatedSettings.whitelistKeywords).toEqual(["deepseek", "nvidia"]);
  expect(updatedSettings.blacklistKeywords).toEqual(["sports"]);

  // User configures desktop push & quiet hours
  await asUser.mutation(api.trendFilterSettings.updateSettings, {
    enabled: true,
    minGrowthRate: 500,
    selectedNiches: ["tech_ai"],
    whitelistKeywords: [],
    blacklistKeywords: [],
    desktopPushEnabled: false,
    quietHoursEnabled: true,
    quietHoursStart: "23:00",
    quietHoursEnd: "07:00",
  });

  // User subsequently saves from UI without passing quiet hours fields
  await asUser.mutation(api.trendFilterSettings.updateSettings, {
    enabled: true,
    minGrowthRate: 300,
    selectedNiches: ["tech_ai", "gaming"],
    whitelistKeywords: [],
    blacklistKeywords: [],
  });

  const preservedSettings = await asUser.query(api.trendFilterSettings.getSettings, {});
  expect(preservedSettings.minGrowthRate).toBe(300);
  expect(preservedSettings.selectedNiches).toEqual(["tech_ai", "gaming"]);
  expect(preservedSettings.desktopPushEnabled).toBe(false);
  expect(preservedSettings.quietHoursEnabled).toBe(true);
  expect(preservedSettings.quietHoursStart).toBe("23:00");
  expect(preservedSettings.quietHoursEnd).toBe("07:00");
});

test("recordAndDistributeAlerts respects individual user niche preferences", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  // User 1: Master toggle disabled (default) -> should receive 0 alerts
  const userInactive = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  // User 2: Subscribed to Tech only
  const userTech = await t.mutation(async (ctx) => {
    const u = await ctx.db.insert("users", {});
    await ctx.db.insert("trendFilterSettings", {
      userId: u,
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: ["tech_ai"],
      whitelistKeywords: [],
      blacklistKeywords: [],
      desktopPushEnabled: true,
      quietHoursEnabled: false,
      updatedAt: now,
    });
    return u;
  });

  // User 3: Subscribed to Sports only
  const userSports = await t.mutation(async (ctx) => {
    const u = await ctx.db.insert("users", {});
    await ctx.db.insert("trendFilterSettings", {
      userId: u,
      enabled: true,
      minGrowthRate: 150,
      selectedNiches: ["sports"],
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
      keyword: "DeepSeek Coding Benchmark",
      geo: "US",
      traffic: 50000,
      trafficGrowthRate: 1000,
      startedAtMs: now - 30 * 60 * 1000,
      emergenceScore: 0.88,
      tier: "breakout" as const,
      relatedKeywords: ["deepseek", "ai", "model"],
      rank: 1,
    },
    {
      keyword: "NFL Quarterback Trade",
      geo: "US",
      traffic: 45000,
      trafficGrowthRate: 500,
      startedAtMs: now - 60 * 60 * 1000,
      emergenceScore: 0.76,
      tier: "breakout" as const,
      relatedKeywords: ["touchdown", "football", "nfl"],
      rank: 2,
    },
  ];

  await t.mutation(
    internal.trendAlerts.recordAndDistributeAlerts,
    {
      trends: candidateTrends,
    }
  );

  // Inactive user should have 0 notifications
  const inactiveNotifs = await t.query(async (ctx) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", userInactive))
      .collect();
  });
  expect(inactiveNotifs).toHaveLength(0);

  // Tech user should have 1 notification (DeepSeek only, not NFL)
  const techNotifs = await t.query(async (ctx) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", userTech))
      .collect();
  });
  expect(techNotifs).toHaveLength(1);
  expect(techNotifs[0].data.trendKeyword).toBe("DeepSeek Coding Benchmark");

  // Sports user should have 1 notification (NFL only, not DeepSeek)
  const sportsNotifs = await t.query(async (ctx) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", userSports))
      .collect();
  });
  expect(sportsNotifs).toHaveLength(1);
  expect(sportsNotifs[0].data.trendKeyword).toBe("NFL Quarterback Trade");
});
