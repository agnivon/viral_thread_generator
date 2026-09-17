/// <reference types="vite/client" />
import { expect, test, vi, afterEach } from "vitest";
import { VisualKeywordStrategistNode, SearchQueryOptimizerNode } from "../../lib/agents/nodes";
import * as agentUtils from "../../lib/agents/utils";

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

test("VisualKeywordStrategistNode - returns undefined when structuredResponse fails schema validation", async () => {
  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: { invalid_field: "wrong structure" },
  });

  const result = await VisualKeywordStrategistNode({
    thread_draft: ["Thread post"],
  });

  expect(result.search_queries).toBeUndefined();
});

test("SearchQueryOptimizerNode - returns undefined when structuredResponse fails schema validation", async () => {
  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: { not_optimized_query: 12345 },
  });

  const result = await SearchQueryOptimizerNode({
    keyword: "AI agents",
    relatedKeywords: ["coding"],
    traffic: 1000,
    trafficGrowthRate: 10,
  });

  expect(result.optimized_query).toBeUndefined();
});

test("All flash-lite and OpenAI models have no token limits (maxOutputTokens / maxTokens are undefined)", async () => {
  const {
    googleGemini31FlashLiteT01Key1,
    googleGemini31FlashLiteT01Key2,
    googleGemini35FlashLiteT01Key1,
    googleGemini35FlashLiteT01Key2,
    googleGemini31FlashLiteT01Key1Max3k,
    googleGemini31FlashLiteT01Key2Max3k,
    googleGemini35FlashLiteT01Key1Max3k,
    googleGemini35FlashLiteT01Key2Max3k,
    googleGemini31FlashLiteT02Key1,
    googleGemini31FlashLiteT02Key2,
    googleGemini35FlashLiteT02Key1,
    googleGemini35FlashLiteT02Key2,
    googleGemini31FlashLiteT02Key1Max3k,
    googleGemini31FlashLiteT02Key2Max3k,
    googleGemini35FlashLiteT02Key1Max3k,
    googleGemini35FlashLiteT02Key2Max3k,
    openAiGpt54MiniT01,
    openAiGpt54MiniT01Max2k,
    openAiGpt54MiniT02,
    openAiGpt54MiniT02Max2k,
  } = await import("../../lib/agents/models");

  const getMaxTokens = (model: unknown): number | undefined => {
    return (model as { params?: { maxOutputTokens?: number } })?.params?.maxOutputTokens;
  };

  // Verify scraper flash-lite models have NO maxOutputTokens limit
  expect(getMaxTokens(googleGemini31FlashLiteT01Key1)).toBeUndefined();
  expect(getMaxTokens(googleGemini31FlashLiteT01Key2)).toBeUndefined();
  expect(getMaxTokens(googleGemini35FlashLiteT01Key1)).toBeUndefined();
  expect(getMaxTokens(googleGemini35FlashLiteT01Key2)).toBeUndefined();
  expect(getMaxTokens(googleGemini31FlashLiteT01Key1Max3k)).toBeUndefined();
  expect(getMaxTokens(googleGemini31FlashLiteT01Key2Max3k)).toBeUndefined();
  expect(getMaxTokens(googleGemini35FlashLiteT01Key1Max3k)).toBeUndefined();
  expect(getMaxTokens(googleGemini35FlashLiteT01Key2Max3k)).toBeUndefined();

  // Verify researcher flash-lite models have NO maxOutputTokens limit
  expect(getMaxTokens(googleGemini31FlashLiteT02Key1)).toBeUndefined();
  expect(getMaxTokens(googleGemini31FlashLiteT02Key2)).toBeUndefined();
  expect(getMaxTokens(googleGemini35FlashLiteT02Key1)).toBeUndefined();
  expect(getMaxTokens(googleGemini35FlashLiteT02Key2)).toBeUndefined();
  expect(getMaxTokens(googleGemini31FlashLiteT02Key1Max3k)).toBeUndefined();
  expect(getMaxTokens(googleGemini31FlashLiteT02Key2Max3k)).toBeUndefined();
  expect(getMaxTokens(googleGemini35FlashLiteT02Key1Max3k)).toBeUndefined();
  expect(getMaxTokens(googleGemini35FlashLiteT02Key2Max3k)).toBeUndefined();

  // Verify OpenAI models have NO maxTokens limit
  expect(openAiGpt54MiniT01.maxTokens).toBeUndefined();
  expect(openAiGpt54MiniT01Max2k.maxTokens).toBeUndefined();
  expect(openAiGpt54MiniT02.maxTokens).toBeUndefined();
  expect(openAiGpt54MiniT02Max2k.maxTokens).toBeUndefined();
});

test("DeepSeek models use deepseek-flash identifier and aliases match", async () => {
  const {
    deepSeekFlashT085ReasoningNone,
    deepSeekFlashT00ReasoningHigh,
    deepSeekV4ProT085ReasoningNone,
    deepSeekV4ProT00ReasoningHigh,
  } = await import("../../lib/agents/models");

  const getModelName = (model: unknown): string | undefined => {
    const m = model as { model?: string; modelName?: string };
    return m?.model ?? m?.modelName;
  };

  expect(getModelName(deepSeekFlashT085ReasoningNone)).toBe("deepseek-flash");
  expect(getModelName(deepSeekFlashT00ReasoningHigh)).toBe("deepseek-flash");
  expect(deepSeekV4ProT085ReasoningNone).toBe(deepSeekFlashT085ReasoningNone);
  expect(deepSeekV4ProT00ReasoningHigh).toBe(deepSeekFlashT00ReasoningHigh);
});

test("News ViralityCriticNode - extracts and preserves fix_directive in post_critiques", async () => {
  const { ViralityCriticNode } = await import("../../lib/agents/news/nodes");

  const mockStructuredResponse = {
    virality_score: 90,
    overall_critique: "Strong narrative rhythm with sharp atomic density.",
    post_critiques: [
      {
        post_index: 1,
        critique: "Payoff revealed too early in the hook.",
        fix_directive: "Remove payoff and end on curiosity gap.",
      },
    ],
  };

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: mockStructuredResponse,
  });

  const result = await ViralityCriticNode({
    raw_markdown: "News text",
    thread_draft: ["Hook post", "Body post"],
    iterations: 0,
    retries: { critic: 0, validator: 0 },
  } as unknown as Parameters<typeof ViralityCriticNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.is_approved).toBe(true);
  expect(result.virality_score).toBe(90);
  expect(result.post_critiques).toEqual([
    {
      post_index: 1,
      critique: "Payoff revealed too early in the hook.",
      fix_directive: "Remove payoff and end on curiosity gap.",
    },
  ]);
});

test("News ThreadWriterNode - formats fix_directive inside POST_SPECIFIC_CRITIQUES context", async () => {
  const { ThreadWriterNode } = await import("../../lib/agents/news/nodes");

  const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    thread_draft: ["Revised hook", "Revised body"],
  });

  const result = await ThreadWriterNode({
    selected_hook: "Best hook",
    raw_markdown: "Source content",
    thread_draft: ["Draft 1", "Draft 2"],
    critique: "Needs more tension",
    post_critiques: [
      {
        post_index: 1,
        critique: "Weak curiosity gap",
        fix_directive: "Front-load concrete metric in first 5 words",
      },
    ],
    retries: { writer: 0 },
  } as unknown as Parameters<typeof ThreadWriterNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.thread_draft).toEqual(["Revised hook", "Revised body"]);

  expect(invokeSpy).toHaveBeenCalled();
  const calledArgs = invokeSpy.mock.calls[0];
  const messages = calledArgs[1] as Array<{ role: string; content: string }>;
  const userMessage = messages.find((m) => m.role === "user");

  expect(userMessage?.content).toContain("<POST_SPECIFIC_CRITIQUES>");
  expect(userMessage?.content).toContain("Post 1: Weak curiosity gap\nFix Directive: Front-load concrete metric in first 5 words");
});

