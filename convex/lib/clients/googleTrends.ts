export interface RawGoogleTrend {
  keyword: string;
  traffic: number;
  trafficGrowthRate: number;
  activeTime: Date;
  relatedKeywords: string[];
  articleKeys: [number, string, string][];
  picture?: string;
}

export type TrendingKeyword = RawGoogleTrend;

export interface RawGoogleTrendArticle {
  title: string;
  link: string;
  mediaCompany?: string;
  pressDate?: number[];
  image?: string;
}

export type Article = RawGoogleTrendArticle;

export interface RealTimeTrendsOptions {
  geo?: string;
  trendingHours?: number;
  signal?: AbortSignal;
}

export interface TrendingArticlesOptions {
  keyword?: string;
  articleKeys?: [number, string, string][];
  articleCount?: number;
  signal?: AbortSignal;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

export function parseTrafficVolume(trafficStr: string): number {
  const clean = trafficStr.trim().toLowerCase();
  const num = parseFloat(clean.replace(/[^0-9.]/g, "")) || 0;
  if (clean.includes("m")) return Math.round(num * 1_000_000);
  if (clean.includes("k")) return Math.round(num * 1_000);
  return Math.round(num);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  if (init.signal) {
    return await fetch(url, init);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves a Google News redirect URL (`https://news.google.com/rss/articles/...`)
 * to its canonical publisher destination URL.
 *
 * Google News wraps articles in a JS redirect splash page with a signature (`data-n-a-sg`)
 * and timestamp (`data-n-a-ts`). Calling Google's `batchexecute` RPC (`Fbv4je`)
 * resolves the token into the true destination URL.
 */
export async function decodeGoogleNewsUrl(
  newsUrl: string,
  timeoutMs = 4000
): Promise<string> {
  if (!newsUrl || !newsUrl.includes("news.google.com/rss/articles/")) {
    return newsUrl;
  }

  try {
    const idMatch = newsUrl.match(/news\.google\.com\/rss\/articles\/([a-zA-Z0-9_-]+)/);
    if (!idMatch) return newsUrl;

    const id = idMatch[1];
    const splashRes = await fetchWithTimeout(
      `https://news.google.com/rss/articles/${id}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      },
      timeoutMs
    );

    if (!splashRes.ok) return newsUrl;

    const html = await splashRes.text();
    const tsMatch = html.match(/data-n-a-ts="([^"]+)"/);
    const sgMatch = html.match(/data-n-a-sg="([^"]+)"/);

    if (!tsMatch || !sgMatch) return newsUrl;

    const timestamp = Number(tsMatch[1]);
    const signature = sgMatch[1];

    const payload = [
      "Fbv4je",
      JSON.stringify([
        "garturlreq",
        [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1]],
        id,
        timestamp,
        signature,
      ]),
    ];

    const body = "f.req=" + encodeURIComponent(JSON.stringify([[payload]]));
    const rpcRes = await fetchWithTimeout(
      "https://news.google.com/_/DotsSplashUi/data/batchexecute",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        body,
      },
      timeoutMs
    );

    if (!rpcRes.ok) return newsUrl;

    const text = await rpcRes.text();
    const match = text.match(/\[\["wrb\.fr","Fbv4je","(\[[\s\S]*?\])"/);
    if (match) {
      const decodedPayload = JSON.parse('"' + match[1] + '"');
      const inner = JSON.parse(decodedPayload);
      if (typeof inner[1] === "string" && inner[1].startsWith("http")) {
        return inner[1];
      }
    }

    return newsUrl;
  } catch (_err) {
    // Graceful fallback: return the original URL if resolution fails
    return newsUrl;
  }
}

/**
 * Resilient, native Google Trends client.
 * Does not rely on brittle, unauthenticated Google internal batchexecute RPCs.
 */
export class GoogleTrendsClient {
  private userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  /**
   * Fetches real-time trending topics.
   * Primary: Scrapes modern Google Trends page for complete traffic & velocity metrics.
   * Fallback: Google Trends official RSS feed.
   */
  async realTimeTrends(
    options: RealTimeTrendsOptions = {}
  ): Promise<{ data?: RawGoogleTrend[]; error?: Error }> {
    const geo = options.geo || "US";

    // 1. Primary: Direct fetch from Google Trends Trending Now page
    try {
      const pageUrl = `https://trends.google.com/trending?geo=${encodeURIComponent(geo)}`;
      const res = await fetchWithTimeout(
        pageUrl,
        {
          headers: {
            "User-Agent": this.userAgent,
            "Accept-Language": "en-US,en;q=0.9",
          },
          signal: options.signal,
        },
        10000
      );

      if (res.ok) {
        const html = await res.text();
        const match = html.match(
          /AF_initDataCallback\(\{key:\s*['"]ds:0['"],[^}]*data:(\[[\s\S]*?\])\s*,\s*sideChannel:/
        );

        if (match && match[1]) {
          const parsed = JSON.parse(match[1]) as unknown;
          if (Array.isArray(parsed) && Array.isArray(parsed[1])) {
            const rawRows = parsed[1] as unknown[];
            const trends: RawGoogleTrend[] = [];

            for (const item of rawRows) {
              if (!Array.isArray(item)) continue;
              const keyword = typeof item[0] === "string" ? item[0].trim() : "";
              if (!keyword) continue;

              const traffic = typeof item[6] === "number" ? item[6] : 0;
              const trafficGrowthRate = typeof item[8] === "number" ? item[8] : 0;
              const timeVal = Array.isArray(item[3]) ? item[3][0] : item[3];
              const ms =
                typeof timeVal === "number" && timeVal > 0
                  ? timeVal > 1e11
                    ? timeVal
                    : timeVal * 1000
                  : Date.now();
              const activeTime = new Date(ms);

              const relatedKeywords: string[] = Array.isArray(item[9])
                ? item[9].filter((k): k is string => typeof k === "string")
                : [];

              const rawArticleKeys: unknown[] = Array.isArray(item[11]) ? item[11] : [];
              const articleKeys: [number, string, string][] = rawArticleKeys.filter(
                (k): k is [number, string, string] =>
                  Array.isArray(k) &&
                  k.length === 3 &&
                  typeof k[0] === "number" &&
                  typeof k[1] === "string" &&
                  typeof k[2] === "string"
              );

              trends.push({
                keyword,
                traffic,
                trafficGrowthRate,
                activeTime,
                relatedKeywords,
                articleKeys,
              });
            }

            if (trends.length > 0) {
              return { data: trends };
            }
          }
        }
      }
    } catch (err) {
      console.warn("[GoogleTrendsClient] Page scrape failed, attempting RSS fallback:", err);
    }

    // 2. Fallback: Official Google Trends RSS Feed
    try {
      const rssUrl = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;
      const rssRes = await fetchWithTimeout(
        rssUrl,
        {
          headers: {
            "User-Agent": this.userAgent,
          },
          signal: options.signal,
        },
        8000
      );

      if (rssRes.ok) {
        const xml = await rssRes.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const trends: RawGoogleTrend[] = [];
        let m: RegExpExecArray | null;

        while ((m = itemRegex.exec(xml)) !== null) {
          const itemXml = m[1];
          const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
          const trafficMatch = itemXml.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/);
          const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
          const pictureMatch = itemXml.match(/<ht:picture>([\s\S]*?)<\/ht:picture>/);

          if (titleMatch && titleMatch[1]) {
            const rawTitle = decodeXmlEntities(titleMatch[1]);
            const trafficStr = trafficMatch?.[1] || "0";
            const traffic = parseTrafficVolume(trafficStr);
            const parsedTime = pubDateMatch ? new Date(pubDateMatch[1]).getTime() : Date.now();
            const activeTime = !isNaN(parsedTime) && parsedTime > 0 ? new Date(parsedTime) : new Date();
            const picture = pictureMatch ? decodeXmlEntities(pictureMatch[1]) : undefined;

            trends.push({
              keyword: rawTitle,
              traffic,
              trafficGrowthRate: 500, // RSS trending topics are breakout/active spikes
              activeTime,
              relatedKeywords: [],
              articleKeys: [],
              picture,
            });
          }
        }

        if (trends.length > 0) {
          return { data: trends };
        }
      }
    } catch (rssErr) {
      console.error("[GoogleTrendsClient] RSS fallback failed:", rssErr);
    }

    return {
      error: new Error("Failed to fetch real-time trends from all Google Trends sources"),
    };
  }

  /**
   * Fetches news articles for a given keyword or article keys.
   * Leverages Google News RSS for real-time article discovery with optional Brave Search fallback.
   */
  async trendingArticles(
    options: TrendingArticlesOptions
  ): Promise<{ data?: RawGoogleTrendArticle[]; error?: Error }> {
    const keyword = options.keyword?.trim();
    const limit = options.articleCount || 20;

    if (!keyword) {
      return { data: [] };
    }

    // 1. Primary: Google News RSS
    try {
      const newsRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
        keyword
      )}&hl=en-US&gl=US&ceid=US:en`;

      const res = await fetchWithTimeout(
        newsRssUrl,
        {
          headers: {
            "User-Agent": this.userAgent,
          },
          signal: options.signal,
        },
        8000
      );

      if (res.ok) {
        const xml = await res.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const articles: RawGoogleTrendArticle[] = [];
        let m: RegExpExecArray | null;

        while ((m = itemRegex.exec(xml)) !== null && articles.length < limit) {
          const itemXml = m[1];
          const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
          const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
          const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
          const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);

          if (titleMatch && linkMatch) {
            const title = decodeXmlEntities(titleMatch[1]);
            const link = decodeXmlEntities(linkMatch[1]);
            const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : "";
            const source = sourceMatch ? decodeXmlEntities(sourceMatch[1]) : "";
            const parsedTime = pubDateStr ? new Date(pubDateStr).getTime() : Date.now();
            const unixSeconds =
              !isNaN(parsedTime) && parsedTime > 0
                ? Math.floor(parsedTime / 1000)
                : Math.floor(Date.now() / 1000);

            // Extract image if present in XML (e.g. media:content, enclosure, or ht tags)
            const imgMatch =
              itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
              itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i) ||
              itemXml.match(/<ht:news_item_picture>([\s\S]*?)<\/ht:news_item_picture>/i) ||
              itemXml.match(/<ht:picture>([\s\S]*?)<\/ht:picture>/i);
            const image = imgMatch ? decodeXmlEntities(imgMatch[1]) : "";

            articles.push({
              title,
              link,
              mediaCompany: source,
              pressDate: [unixSeconds],
              image,
            });
          }
        }

        if (articles.length > 0) {
          // Resolve Google News RSS redirect URLs to their canonical publisher destination URLs
          const resolvedArticles = await Promise.all(
            articles.map(async (art) => {
              if (art.link && art.link.includes("news.google.com/rss/articles/")) {
                const canonical = await decodeGoogleNewsUrl(art.link);
                return { ...art, link: canonical };
              }
              return art;
            })
          );
          return { data: resolvedArticles };
        }
      }
    } catch (err) {
      console.warn("[GoogleTrendsClient] Google News RSS fetch failed:", err);
    }

    // 2. Fallback: Brave Search API if configured
    if (process.env.BRAVE_SEARCH_API_KEY) {
      try {
        const { BraveSearchAPI } = await import("./brave.js");
        const brave = new BraveSearchAPI();
        const braveRes = await brave.newsSearch({ q: keyword, count: limit });
        if (Array.isArray(braveRes.results) && braveRes.results.length > 0) {
          return {
            data: braveRes.results.map((r) => ({
              title: r.title,
              link: r.url,
              mediaCompany: r.meta_url?.hostname || "",
              pressDate: [Math.floor(Date.now() / 1000)],
              image: r.thumbnail?.src || "",
            })),
          };
        }
      } catch (braveErr) {
        console.warn("[GoogleTrendsClient] Brave News fallback failed:", braveErr);
      }
    }

    return {
      error: new Error(`Failed to fetch articles for keyword "${keyword}"`),
    };
  }
}

export const googleTrends = new GoogleTrendsClient();
