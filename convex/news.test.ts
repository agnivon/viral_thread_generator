/// <reference types="vite/client" />
"use node";
import { convexTest } from "convex-test";
import { expect, test, vi, afterEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import googleTrends, { TrendingKeyword, Article as GoogleArticle } from "@alkalisummer/google-trends-js";

const modules = import.meta.glob("./**/*.ts");

const originalEnv = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

test("googleTrendsNewsActions - getTrendingKeywords fetches live trends via @alkalisummer/google-trends-js on-demand", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => ctx.db.insert("users", {}));
  const authedT = t.withIdentity({ subject: userId });

  const mockTrends: TrendingKeyword[] = [
    {
      keyword: "Rams",
      traffic: 1000000,
      trafficGrowthRate: 1000,
      activeTime: new Date("2026-09-10T21:30:00.000Z"),
      relatedKeywords: ["49ers", "NFL"],
      articleKeys: [[4800202104, "en", "US"]],
    },
    {
      keyword: "Jonas Brothers",
      traffic: 50000,
      trafficGrowthRate: 1000,
      activeTime: new Date("2026-09-11T01:50:00.000Z"),
      relatedKeywords: ["Nick Jonas"],
      articleKeys: [[4824292316, "en", "US"]],
    },
  ];

  const trendsSpy = vi.spyOn(googleTrends, "realTimeTrends").mockResolvedValue({
    data: mockTrends,
  });

  const result = await authedT.action(api.actions.googleTrendsNewsActions.getTrendingKeywords, {
    geo: "US",
    hours: 24,
  });

  expect(trendsSpy).toHaveBeenCalledWith({ geo: "US", trendingHours: 24 });
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({
    id: "rams",
    keyword: "Rams",
    rank: 1,
    traffic: 1000000,
    trafficGrowthRate: 1000,
    isActive: true,
  });
  expect(result[1]).toMatchObject({
    id: "jonas-brothers",
    keyword: "Jonas Brothers",
    rank: 2,
    traffic: 50000,
    trafficGrowthRate: 1000,
    isActive: true,
  });
});

test("googleTrendsNewsActions - fetchArticlesForKeyword fetches articles on-demand using articleKeys", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => ctx.db.insert("users", {}));
  const authedT = t.withIdentity({ subject: userId });

  const mockArticles: GoogleArticle[] = [
    {
      title: "Live results and analysis from 49ers-Rams",
      link: "https://www.espn.com/nfl/story/49ers-rams",
      mediaCompany: "ESPN",
      pressDate: [1789002300],
      image: "https://example.com/image.png",
    },
    {
      title: "Rams and 49ers Historic NFL Season Opener",
      link: "https://sports.yahoo.com/articles/rams-49ers",
      mediaCompany: "Yahoo Sports",
      pressDate: [1789003000],
      image: "https://example.com/yahoo.png",
    },
  ];

  const articlesSpy = vi.spyOn(googleTrends, "trendingArticles").mockResolvedValue({
    data: mockArticles,
  });

  const result = await authedT.action(api.actions.googleTrendsNewsActions.fetchArticlesForKeyword, {
    keyword: "rams",
    articleKeys: [[4800202104, "en", "US"]],
  });

  expect(articlesSpy).toHaveBeenCalledWith({
    articleKeys: [[4800202104, "en", "US"]],
    articleCount: 20,
  });
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({
    title: "Live results and analysis from 49ers-Rams",
    url: "https://www.espn.com/nfl/story/49ers-rams",
    description: "Source: ESPN",
    mediaCompany: "ESPN",
    image: "https://example.com/image.png",
  });
  expect(result[1]).toMatchObject({
    title: "Rams and 49ers Historic NFL Season Opener",
    url: "https://sports.yahoo.com/articles/rams-49ers",
    description: "Source: Yahoo Sports",
    mediaCompany: "Yahoo Sports",
    image: "https://example.com/yahoo.png",
  });
});

test("googleTrendsNewsActions - fetchArticlesForKeyword resolves articleKeys via realTimeTrends if omitted", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => ctx.db.insert("users", {}));
  const authedT = t.withIdentity({ subject: userId });

  const mockFallbackTrends: TrendingKeyword[] = [
    {
      keyword: "Rams",
      traffic: 1000000,
      trafficGrowthRate: 1000,
      activeTime: new Date("2026-09-10T21:30:00.000Z"),
      relatedKeywords: ["49ers", "NFL"],
      articleKeys: [[4800202104, "en", "US"]],
    },
  ];

  vi.spyOn(googleTrends, "realTimeTrends").mockResolvedValue({
    data: mockFallbackTrends,
  });

  const mockFallbackArticles: GoogleArticle[] = [
    {
      title: "Live results and analysis from 49ers-Rams",
      link: "https://www.espn.com/nfl/story/49ers-rams",
      mediaCompany: "ESPN",
      pressDate: [1789002300],
      image: "https://example.com/image.png",
    },
  ];

  const articlesSpy = vi.spyOn(googleTrends, "trendingArticles").mockResolvedValue({
    data: mockFallbackArticles,
  });

  const result = await authedT.action(api.actions.googleTrendsNewsActions.fetchArticlesForKeyword, {
    keyword: "rams",
  });

  expect(articlesSpy).toHaveBeenCalledWith({
    articleKeys: [[4800202104, "en", "US"]],
    articleCount: 20,
  });
  expect(result).toHaveLength(1);
  expect(result[0].title).toBe("Live results and analysis from 49ers-Rams");
});
