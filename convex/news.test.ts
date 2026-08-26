/// <reference types="vite/client" />
"use node";
import { convexTest } from "convex-test";
import { expect, test, vi, afterEach, beforeEach } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { db } from "./lib/firebase";
import googleTrends from "@alkalisummer/google-trends-js";
import * as nodes from "./lib/agents/nodes";

const modules = import.meta.glob("./**/*.ts");

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.NEWSDATA_API_KEY = "mock-newsdata-key";
  process.env.CURRENTS_API_KEY = "mock-currents-key";
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

test("newsdataActions - fetchAndStoreLatestNews fetches trends and stores new articles", async () => {
  const t = convexTest(schema, modules);

  // 1. Mock googleTrends
  const dailyTrendsSpy = vi.spyOn(googleTrends, "dailyTrends").mockResolvedValue({
    data: [
      {
        keyword: "Artificial Intelligence",
        traffic: 100000,
        activeTime: "2026-08-10T10:00:00Z",
        relatedKeywords: ["AI", "LLM"],
      },
    ],
  } as any);

  // 2. Mock SearchQueryOptimizerNode
  vi.spyOn(nodes, "SearchQueryOptimizerNode").mockResolvedValue({
    optimized_query: '"Artificial Intelligence" OR "AI"',
  });

  // 3. Mock NewsDataAPI fetch
  const fetchMock = vi.fn().mockImplementation(async (url: string) => {
    if (url.includes("newsdata.io")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: "success",
          totalResults: 1,
          results: [
            {
              article_id: "article_101",
              title: "AI Breakthrough in 2026",
              description: "A major breakthrough has occurred.",
              link: "https://example.com/ai-breakthrough",
              pubDate: "2026-08-10 12:00:00",
              source_id: "test_source",
            },
          ],
        }),
      } as Response;
    }
    return { ok: false } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);

  // 4. Mock Firestore db methods
  const mockSet = vi.fn().mockResolvedValue({});
  const mockBatchSet = vi.fn();
  const mockBatchCommit = vi.fn().mockResolvedValue({});
  const mockGetAll = vi.fn().mockResolvedValue([{ exists: false }]);

  vi.spyOn(db, "collection").mockImplementation((_collName: string) => ({
    doc: (docId: string) => ({
      id: docId,
      set: mockSet,
      collection: (_subColl: string) => ({
        doc: (articleId: string) => ({
          id: articleId,
        }),
      }),
    }),
  }) as any);

  vi.spyOn(db, "getAll").mockImplementation(mockGetAll as any);
  vi.spyOn(db, "batch").mockReturnValue({
    set: mockBatchSet,
    commit: mockBatchCommit,
  } as any);

  await t.action(internal.actions.newsdataActions.fetchAndStoreLatestNews, {});

  expect(dailyTrendsSpy).toHaveBeenCalledWith({ geo: "US" });
  expect(mockSet).toHaveBeenCalledWith(
    expect.objectContaining({
      keyword: "artificial intelligence",
      slug: "artificial-intelligence",
      traffic: 100000,
    }),
    { merge: true }
  );
  expect(mockBatchCommit).toHaveBeenCalled();
});

test("newsdataActions - deleteOldNewsArticles purges articles older than 5 days", async () => {
  const t = convexTest(schema, modules);

  const mockBatchDelete = vi.fn();
  const mockBatchCommit = vi.fn().mockResolvedValue({});
  const mockGet = vi.fn().mockResolvedValue({
    empty: false,
    docs: [
      { ref: { id: "old_doc_1" } },
      { ref: { id: "old_doc_2" } },
    ],
  });

  const collectionSpy = vi.spyOn(db, "collection").mockReturnValue({
    listDocuments: vi.fn().mockResolvedValue([{ id: "artificial-intelligence" }]),
  } as any);

  vi.spyOn(db, "batch").mockReturnValue({
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  } as any);

  // Mock subcollection where query
  const mockWhere = vi.fn().mockReturnValue({ get: mockGet });
  (db.collection as any).mockReturnValue({
    listDocuments: vi.fn().mockResolvedValue([{ id: "artificial-intelligence", collection: () => ({ where: mockWhere }) }]),
  });

  await t.action(internal.actions.newsdataActions.deleteOldNewsArticles, {});

  expect(collectionSpy).toHaveBeenCalledWith("newsdata_latest_news");
});
