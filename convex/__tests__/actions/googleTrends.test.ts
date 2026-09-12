/// <reference types="vite/client" />
"use node";

import { convexTest } from "convex-test";
import { expect, test, vi, afterEach } from "vitest";
import schema from "../../schema";
import { api } from "../../_generated/api";
import { isValidArticleKey } from "../../actions/googleTrends.js";
import googleTrends from "@alkalisummer/google-trends-js";

const modules = import.meta.glob("../../**/*.ts");

afterEach(() => {
  vi.restoreAllMocks();
});

test("isValidArticleKey - validates 3-tuple shape [number, string, string]", () => {
  expect(isValidArticleKey([1, "article-slug", "source-name"])).toBe(true);
  expect(isValidArticleKey([0, "", ""])).toBe(true);

  // Invalid cases
  expect(isValidArticleKey(null)).toBe(false);
  expect(isValidArticleKey(undefined)).toBe(false);
  expect(isValidArticleKey("not-array")).toBe(false);
  expect(isValidArticleKey([1, "slug"])).toBe(false); // only 2 items
  expect(isValidArticleKey([1, "slug", "source", "extra"])).toBe(false); // 4 items
  expect(isValidArticleKey(["1", "slug", "source"])).toBe(false); // 1st element is string, not number
  expect(isValidArticleKey([1, 2, "source"])).toBe(false); // 2nd element is number, not string
  expect(isValidArticleKey([1, "slug", 3])).toBe(false); // 3rd element is number, not string
});

test("getTrendingKeywords - returns formatted trends for authenticated user", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  vi.spyOn(googleTrends, "realTimeTrends").mockResolvedValue({
    data: [
      {
        keyword: "Artificial Intelligence",
        traffic: 500000,
        trafficGrowthRate: 250,
        activeTime: new Date("2026-09-11T12:00:00Z"),
        relatedKeywords: ["Machine Learning", "DeepSeek"],
        articleKeys: [[1, "ai-boom", "TechCrunch"], ["invalid-key"] as unknown as [number, string, string]],
      },
    ],
  });

  const authed = t.withIdentity({ subject: userId });
  const result = await authed.action(api.actions.googleTrends.getTrendingKeywords, {
    geo: "US",
  });

  expect(result.length).toBe(1);
  expect(result[0].keyword).toBe("Artificial Intelligence");
  expect(result[0].id).toBe("artificial-intelligence");
  expect(result[0].traffic).toBe(500000);
  expect(result[0].trafficGrowthRate).toBe(250);
  expect(result[0].isActive).toBe(true);
  expect(result[0].rank).toBe(1);
  // Invalid key was filtered out by isValidArticleKey
  expect(result[0].articleKeys).toEqual([[1, "ai-boom", "TechCrunch"]]);
});

test("getTrendingKeywords - throws Unauthorized when not logged in", async () => {
  const t = convexTest(schema, modules);

  await expect(
    t.action(api.actions.googleTrends.getTrendingKeywords, {})
  ).rejects.toThrow("Unauthorized");
});

test("fetchArticlesForKeyword - returns formatted articles for authenticated user", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  vi.spyOn(googleTrends, "trendingArticles").mockResolvedValue({
    data: [
      {
        title: "AI Models Advance",
        link: "https://example.com/ai-models",
        image: "https://example.com/image.png",
        pressDate: [1757592000],
        mediaCompany: "TechDaily",
      },
    ],
  });

  const authed = t.withIdentity({ subject: userId });
  const articles = await authed.action(api.actions.googleTrends.fetchArticlesForKeyword, {
    keyword: "Artificial Intelligence",
    articleKeys: [[1, "ai-models", "TechDaily"]],
  });

  expect(articles.length).toBe(1);
  expect(articles[0].title).toBe("AI Models Advance");
  expect(articles[0].url).toBe("https://example.com/ai-models");
  expect(articles[0].mediaCompany).toBe("TechDaily");
  expect(articles[0].description).toBe("Source: TechDaily");
});

test("fetchArticlesForKeyword - returns empty array if no valid keys", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  vi.spyOn(googleTrends, "realTimeTrends").mockResolvedValue({
    data: [],
  });

  const authed = t.withIdentity({ subject: userId });
  const articles = await authed.action(api.actions.googleTrends.fetchArticlesForKeyword, {
    keyword: "Unknown Keyword",
    articleKeys: [],
  });

  expect(articles).toEqual([]);
});
