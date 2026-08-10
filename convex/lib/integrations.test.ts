/// <reference types="vite/client" />
import { expect, test, vi, afterEach } from "vitest";
import { BraveSearchAPI } from "./brave/api";
import { JinaClient } from "./jina/api";

afterEach(() => {
  vi.restoreAllMocks();
});

test("BraveSearchAPI - webSearch sends correct request and headers", async () => {
  const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    expect(url).toContain("https://api.search.brave.com/res/v1/web/search");
    expect(url).toContain("q=artificial+intelligence");
    expect(init?.headers).toMatchObject({
      "X-Subscription-Token": "test-brave-key",
      Accept: "application/json",
    });

    return {
      ok: true,
      status: 200,
      json: async () => ({
        type: "search",
        query: { original: "artificial intelligence", more_results_available: true },
        web: {
          type: "search",
          results: [
            {
              title: "AI Overview",
              url: "https://example.com/ai",
              description: "An overview of AI.",
            },
          ],
          mutated_by_goggles: false,
          family_friendly: true,
        },
      }),
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);

  const api = new BraveSearchAPI("test-brave-key");
  const res = await api.webSearch({ q: "artificial intelligence" });

  expect(res.web?.results.length).toBe(1);
  expect(res.web?.results[0].title).toBe("AI Overview");
});

test("BraveSearchAPI - throws error on non-ok status", async () => {
  const fetchMock = vi.fn().mockImplementation(async () => ({
    ok: false,
    status: 401,
    text: async () => "Unauthorized API key",
  }));
  vi.stubGlobal("fetch", fetchMock);

  const api = new BraveSearchAPI("invalid-key");
  await expect(api.webSearch({ q: "test" })).rejects.toThrow("Brave API error (401)");
});

test("JinaClient - read sends request with Bearer token", async () => {
  const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    expect(url).toBe("https://r.jina.ai/");
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer test-jina-key",
    });
    expect(JSON.parse(init?.body as string)).toMatchObject({
      url: "https://example.com/article",
    });

    return {
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        code: 200,
        status: 20000,
        data: {
          title: "Parsed Article",
          url: "https://example.com/article",
          content: "# Markdown Content",
        },
      }),
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);

  const client = new JinaClient("test-jina-key");
  const res = (await client.read("https://example.com/article")) as any;

  expect(res.code).toBe(200);
  expect(res.data.title).toBe("Parsed Article");
});
