/// <reference types="vite/client" />
import { expect, test, vi, afterEach } from "vitest";
import { VisualKeywordStrategistNode, SearchQueryOptimizerNode } from "./nodes";
import * as agentUtils from "./utils";

afterEach(() => {
  vi.restoreAllMocks();
});

test("VisualKeywordStrategistNode - extracts search queries on successful LLM response", async () => {
  const mockStructuredResponse = {
    hero_visual_query: "futuristic AI coding workstation",
    post_visual_queries: [
      {
        post_index: 0,
        image_search_query: "software developer coding",
        video_search_query: "typing on keyboard",
      },
    ],
  };

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: mockStructuredResponse,
  });

  const result = await VisualKeywordStrategistNode({
    thread_draft: ["Hook post about AI coding", "Body post explaining AST parsing"],
  });

  expect(result.search_queries).toEqual(mockStructuredResponse);
});

test("VisualKeywordStrategistNode - handles failure gracefully", async () => {
  vi.spyOn(agentUtils, "invokeWithFallbacks").mockRejectedValue(new Error("LLM Error"));

  const result = await VisualKeywordStrategistNode({
    thread_draft: ["Thread post"],
  });

  expect(result.search_queries).toBeUndefined();
});

test("SearchQueryOptimizerNode - optimizes boolean search query on successful LLM response", async () => {
  const mockStructuredResponse = {
    optimized_query: '"AI agents" OR "autonomous coding" AND "software"',
  };

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: mockStructuredResponse,
  });

  const result = await SearchQueryOptimizerNode({
    keyword: "AI agents",
    relatedKeywords: ["coding", "automation"],
    traffic: 50000,
    trafficGrowthRate: 150,
  });

  expect(result.optimized_query).toBe('"AI agents" OR "autonomous coding" AND "software"');
});

test("SearchQueryOptimizerNode - returns undefined when invocation fails", async () => {
  vi.spyOn(agentUtils, "invokeWithFallbacks").mockRejectedValue(new Error("LLM Error"));

  const result = await SearchQueryOptimizerNode({
    keyword: "broken keyword",
    relatedKeywords: [],
    traffic: 100,
    trafficGrowthRate: 0,
  });

  expect(result.optimized_query).toBeUndefined();
});
