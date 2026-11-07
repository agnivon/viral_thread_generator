/// <reference types="vite/client" />
"use node";

import { expect, test, vi, afterEach } from "vitest";
import { GoogleTrendsClient, parseTrafficVolume, decodeGoogleNewsUrl } from "../../lib/clients/googleTrends";

afterEach(() => {
  vi.restoreAllMocks();
});

test("parseTrafficVolume - parses standard, K+, and M+ volume strings accurately", () => {
  expect(parseTrafficVolume("200000+")).toBe(200000);
  expect(parseTrafficVolume("10,000+")).toBe(10000);
  expect(parseTrafficVolume("1M+")).toBe(1000000);
  expect(parseTrafficVolume("2.5M+")).toBe(2500000);
  expect(parseTrafficVolume("500K+")).toBe(500000);
  expect(parseTrafficVolume("invalid")).toBe(0);
});

test("realTimeTrends - extracts trends correctly from page HTML payload", async () => {
  const client = new GoogleTrendsClient();

  const mockHtml = `
    <html>
      <head>
        <script>
          AF_initDataCallback({key: 'ds:0', hash: '2', data:[null,[
            ["heat vs warriors",null,"US",[1793924400],null,null,200000,null,1000,["heat vs warriors","gsw"],[17],[[4895874970,"en","US"]],"heat vs warriors"],
            ["ai agents",null,"US",[1793920000],null,null,50000,null,500,["autonomous agents"],[11],[[4895874971,"en","US"]],"ai agents"]
          ]], sideChannel: {}});
        </script>
      </head>
    </html>
  `;

  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    text: async () => mockHtml,
  } as unknown as Response);

  const res = await client.realTimeTrends({ geo: "US" });
  expect(res.error).toBeUndefined();
  expect(res.data).toHaveLength(2);

  const first = res.data![0];
  expect(first.keyword).toBe("heat vs warriors");
  expect(first.traffic).toBe(200000);
  expect(first.trafficGrowthRate).toBe(1000);
  expect(first.relatedKeywords).toEqual(["heat vs warriors", "gsw"]);
  expect(first.articleKeys).toEqual([[4895874970, "en", "US"]]);
});

test("realTimeTrends - falls back to RSS feed if page HTML fails or has no ds:0 match", async () => {
  const client = new GoogleTrendsClient();

  // First fetch (HTML) fails
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: false,
    status: 500,
  } as unknown as Response);

  // Second fetch (RSS) succeeds
  const mockRssXml = `
    <?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:ht="https://trends.google.com/trending/rss">
      <channel>
        <item>
          <title>Breaking Science Discovery</title>
          <ht:approx_traffic>50K+</ht:approx_traffic>
          <pubDate>Fri, 6 Nov 2026 12:00:00 GMT</pubDate>
        </item>
      </channel>
    </rss>
  `;

  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    text: async () => mockRssXml,
  } as unknown as Response);

  const res = await client.realTimeTrends({ geo: "US" });
  expect(res.error).toBeUndefined();
  expect(res.data).toHaveLength(1);
  expect(res.data![0].keyword).toBe("Breaking Science Discovery");
  expect(res.data![0].traffic).toBe(50000);
  expect(res.data![0].trafficGrowthRate).toBe(500);
});

test("trendingArticles - extracts articles with non-standard tag order and missing source", async () => {
  const client = new GoogleTrendsClient();

  // Notice: pubDate appears BEFORE link, and source tag is omitted
  const mockNewsXml = `
    <?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <item>
          <pubDate>Fri, 06 Nov 2026 10:00:00 GMT</pubDate>
          <title>AI Revolution Continues</title>
          <link>https://news.example.com/ai-revolution</link>
        </item>
      </channel>
    </rss>
  `;

  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    text: async () => mockNewsXml,
  } as unknown as Response);

  const res = await client.trendingArticles({ keyword: "AI Revolution", articleCount: 10 });
  expect(res.error).toBeUndefined();
  expect(res.data).toHaveLength(1);
  expect(res.data![0].title).toBe("AI Revolution Continues");
  expect(res.data![0].link).toBe("https://news.example.com/ai-revolution");
  expect(res.data![0].mediaCompany).toBe("");
  expect(res.data![0].pressDate).toHaveLength(1);
});

test("trendingArticles - extracts images from RSS items when media:content or ht:news_item_picture is present", async () => {
  const client = new GoogleTrendsClient();

  const mockNewsXmlWithImage = `
    <?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:ht="https://trends.google.com/trending/rss">
      <channel>
        <item>
          <title>Space Exploration Update</title>
          <link>https://news.example.com/space-update</link>
          <pubDate>Fri, 06 Nov 2026 12:00:00 GMT</pubDate>
          <source url="https://space.example.com">SpaceNews</source>
          <ht:news_item_picture>https://encrypted-tbn0.gstatic.com/images?q=tbn:test-pic</ht:news_item_picture>
        </item>
      </channel>
    </rss>
  `;

  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    text: async () => mockNewsXmlWithImage,
  } as unknown as Response);

  const res = await client.trendingArticles({ keyword: "Space Exploration", articleCount: 5 });
  expect(res.error).toBeUndefined();
  expect(res.data).toHaveLength(1);
  expect(res.data![0].title).toBe("Space Exploration Update");
  expect(res.data![0].image).toBe("https://encrypted-tbn0.gstatic.com/images?q=tbn:test-pic");
  expect(res.data![0].mediaCompany).toBe("SpaceNews");
});

test("trendingArticles - falls back to Brave Search when Google News fails and API key present", async () => {
  const client = new GoogleTrendsClient();
  const origKey = process.env.BRAVE_SEARCH_API_KEY;
  process.env.BRAVE_SEARCH_API_KEY = "test-brave-key";

  try {
    // 1. Google News RSS fails
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
    } as unknown as Response);

    // 2. Brave Search returns news
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            title: "Brave News: Model Breakthrough",
            url: "https://brave.example.com/article",
            meta_url: { hostname: "brave.example.com" },
            thumbnail: { src: "https://brave.example.com/img.jpg" },
          },
        ],
      }),
    } as unknown as Response);

    const res = await client.trendingArticles({ keyword: "Model Breakthrough", articleCount: 5 });
    expect(res.error).toBeUndefined();
    expect(res.data).toHaveLength(1);
    expect(res.data![0].title).toBe("Brave News: Model Breakthrough");
    expect(res.data![0].link).toBe("https://brave.example.com/article");
    expect(res.data![0].mediaCompany).toBe("brave.example.com");
    expect(res.data![0].image).toBe("https://brave.example.com/img.jpg");
  } finally {
    process.env.BRAVE_SEARCH_API_KEY = origKey;
  }
});

test("trendingArticles - returns empty data if no keyword is provided", async () => {
  const client = new GoogleTrendsClient();
  const res = await client.trendingArticles({});
  expect(res.data).toEqual([]);
});

test("decodeGoogleNewsUrl - passes non-Google News URLs straight through without fetching", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const result = await decodeGoogleNewsUrl("https://www.nba.com/game/123");
  expect(result).toBe("https://www.nba.com/game/123");
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("decodeGoogleNewsUrl - decodes Google News RSS redirect URL via batchexecute RPC", async () => {
  const mockSplashHtml = `
    <html>
      <body>
        <div data-n-a-id="test-article-id" data-n-a-ts="1793982830" data-n-a-sg="test-signature"></div>
      </body>
    </html>
  `;

  const mockRpcResponse = `)]}'\n\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://www.espn.com/nba/story/_/id/123\\",1]",null,null,null,""]]`;

  vi.spyOn(globalThis, "fetch")
    // 1. Splash page fetch
    .mockResolvedValueOnce({
      ok: true,
      text: async () => mockSplashHtml,
    } as unknown as Response)
    // 2. Batchexecute RPC fetch
    .mockResolvedValueOnce({
      ok: true,
      text: async () => mockRpcResponse,
    } as unknown as Response);

  const decoded = await decodeGoogleNewsUrl(
    "https://news.google.com/rss/articles/test-article-id?oc=5"
  );
  expect(decoded).toBe("https://www.espn.com/nba/story/_/id/123");
});

test("decodeGoogleNewsUrl - falls back gracefully to original URL if splash fetch fails", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: false,
    status: 500,
  } as unknown as Response);

  const fallback = await decodeGoogleNewsUrl(
    "https://news.google.com/rss/articles/failing-id?oc=5"
  );
  expect(fallback).toBe("https://news.google.com/rss/articles/failing-id?oc=5");
});
