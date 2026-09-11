"use node";

import googleTrends from '@alkalisummer/google-trends-js';
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action } from "../_generated/server";
import crypto from "crypto";

export interface ActiveTrend {
  id: string;
  keyword: string;
  traffic: number;
  trafficGrowthRate: number;
  startedAtMs: number;
  isActive: boolean;
  relatedKeywords: string[];
  articleKeys: [number, string, string][];
  rank: number;
}

export interface GoogleTrendArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image?: string;
  published: string;
  published_at: number;
  mediaCompany?: string;
}

/**
 * Fetches real-time trending keywords directly via @alkalisummer/google-trends-js on-demand.
 * Zero database storage - returns trends in natural Google Trends relevance rank order.
 */
export const getTrendingKeywords = action({
  args: {
    geo: v.optional(v.string()),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ActiveTrend[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const geo = args.geo || 'US';
    const hours = args.hours || 24;

    const response = await googleTrends.realTimeTrends({
      geo,
      trendingHours: hours,
    });

    if (response.error || !response.data) {
      console.error("Error from googleTrends.realTimeTrends:", response.error);
      return [];
    }

    const seenKeywords = new Set<string>();
    const trends: ActiveTrend[] = [];

    for (const item of response.data) {
      const keyword = String(item.keyword || '').trim();
      const lower = keyword.toLowerCase();
      if (!keyword || seenKeywords.has(lower)) continue;
      seenKeywords.add(lower);

      const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const activeDate = item.activeTime ? new Date(item.activeTime) : new Date();

      trends.push({
        id: slug || `trend-${trends.length + 1}`,
        keyword,
        traffic: typeof item.traffic === 'number' ? item.traffic : 0,
        trafficGrowthRate: typeof item.trafficGrowthRate === 'number' ? item.trafficGrowthRate : 0,
        startedAtMs: activeDate.getTime(),
        isActive: true,
        relatedKeywords: Array.isArray(item.relatedKeywords) ? item.relatedKeywords.map(String) : [],
        articleKeys: Array.isArray(item.articleKeys) ? item.articleKeys : [],
        rank: trends.length + 1,
      });
    }

    return trends;
  },
});

/**
 * Fetches news articles on-demand for a selected keyword using Google Trends article keys.
 * Zero database storage - returns articles directly to the client.
 */
export const fetchArticlesForKeyword = action({
  args: {
    keyword: v.string(),
    articleKeys: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args): Promise<GoogleTrendArticle[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    let rawKeys = args.articleKeys || [];
    if (rawKeys.length === 0 && args.keyword) {
      try {
        const trendsRes = await googleTrends.realTimeTrends({ geo: "US", trendingHours: 24 });
        if (trendsRes.data) {
          const targetSlug = args.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const matchingTrend = trendsRes.data.find((item) => {
            const itemKeyword = String(item.keyword || "").trim().toLowerCase();
            const itemSlug = itemKeyword.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            return itemSlug === targetSlug || itemKeyword === args.keyword.toLowerCase();
          });
          if (matchingTrend && Array.isArray(matchingTrend.articleKeys)) {
            rawKeys = matchingTrend.articleKeys;
          }
        }
      } catch (err) {
        console.error("Error looking up trend keys for keyword:", err);
      }
    }

    if (rawKeys.length === 0) {
      return [];
    }

    const response = await googleTrends.trendingArticles({
      articleKeys: rawKeys as [number, string, string][],
      articleCount: 20,
    });

    if (response.error || !response.data) {
      console.error("Error from googleTrends.trendingArticles:", response.error);
      return [];
    }

    const articles: GoogleTrendArticle[] = response.data.map((art) => {
      const safeId = crypto.createHash("md5").update(art.link || art.title || "").digest("hex");
      const publishedDate = art.pressDate && art.pressDate.length > 0
        ? new Date(art.pressDate[0] * 1000)
        : new Date();

      return {
        id: safeId,
        title: art.title || "",
        description: art.mediaCompany ? `Source: ${art.mediaCompany}` : "",
        url: art.link || "",
        image: art.image || undefined,
        published: publishedDate.toISOString(),
        published_at: publishedDate.getTime(),
        mediaCompany: art.mediaCompany || undefined,
      };
    });

    return articles;
  },
});
