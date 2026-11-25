/// <reference types="vite/client" />
import { expect, test, vi, afterEach } from "vitest";
import { SearchQueryOptimizerNode } from "../../lib/agents/nodes";
import * as agentUtils from "../../lib/agents/utils";

afterEach(() => {
  vi.restoreAllMocks();
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

test("All flash-lite and DeepSeek models have no token limits (maxOutputTokens / maxTokens are undefined)", async () => {
  const {
    googleGemini31FlashLiteT01Key1,
    googleGemini31FlashLiteT01Key2,
    googleGemini35FlashLiteT01Key1,
    googleGemini35FlashLiteT01Key2,
    googleGemini31FlashLiteT02Key1,
    googleGemini31FlashLiteT02Key2,
    googleGemini35FlashLiteT02Key1,
    googleGemini35FlashLiteT02Key2,
    deepSeekFlashT01ReasoningNone,
    deepSeekFlashT01JsonReasoningNone,
    deepSeekFlashT02ReasoningNone,
  } = await import("../../lib/agents/models");

  const getMaxTokens = (model: unknown): number | undefined => {
    return (model as { params?: { maxOutputTokens?: number } })?.params?.maxOutputTokens;
  };

  expect(getMaxTokens(googleGemini31FlashLiteT01Key1)).toBeUndefined();
  expect(getMaxTokens(googleGemini31FlashLiteT01Key2)).toBeUndefined();
  expect(getMaxTokens(googleGemini35FlashLiteT01Key1)).toBeUndefined();
  expect(getMaxTokens(googleGemini35FlashLiteT01Key2)).toBeUndefined();
  expect(getMaxTokens(googleGemini31FlashLiteT02Key1)).toBeUndefined();
  expect(getMaxTokens(googleGemini31FlashLiteT02Key2)).toBeUndefined();
  expect(getMaxTokens(googleGemini35FlashLiteT02Key1)).toBeUndefined();
  expect(getMaxTokens(googleGemini35FlashLiteT02Key2)).toBeUndefined();
  expect(deepSeekFlashT01ReasoningNone.maxTokens).toBeUndefined();
  expect(deepSeekFlashT01JsonReasoningNone.maxTokens).toBeUndefined();
  expect(deepSeekFlashT02ReasoningNone.maxTokens).toBeUndefined();
});

test("DeepSeek models configure response_format only on structured output variants", async () => {
  const {
    deepSeekFlashT00ReasoningNone,
    deepSeekFlashT01ReasoningNone,
    deepSeekFlashT01JsonReasoningNone,
    deepSeekFlashT01ReasoningHigh,
    deepSeekFlashT01TextReasoningHigh,
    deepSeekFlashT02ReasoningNone,
    deepSeekFlashT08ReasoningNone,
    deepSeekFlashT08ReasoningHigh,
    deepSeekFlashT085ReasoningHigh,
    deepSeekFlashT085ReasoningNone,
    deepSeekFlashT00ReasoningHigh,
  } = await import("../../lib/agents/models");

  const getModelName = (model: unknown): string | undefined => {
    const m = model as { model?: string; modelName?: string };
    return m?.model ?? m?.modelName;
  };

  expect(getModelName(deepSeekFlashT00ReasoningNone)).toBe("deepseek-flash");
  expect(getModelName(deepSeekFlashT01ReasoningNone)).toBe("deepseek-flash");
  expect(getModelName(deepSeekFlashT01JsonReasoningNone)).toBe("deepseek-flash");
  expect(getModelName(deepSeekFlashT01ReasoningHigh)).toBe("deepseek-flash");
  expect(getModelName(deepSeekFlashT01TextReasoningHigh)).toBe("deepseek-flash");
  expect(getModelName(deepSeekFlashT02ReasoningNone)).toBe("deepseek-flash");
  expect(getModelName(deepSeekFlashT08ReasoningNone)).toBe("deepseek-flash");
  expect(getModelName(deepSeekFlashT08ReasoningHigh)).toBe("deepseek-flash");
  expect(getModelName(deepSeekFlashT085ReasoningHigh)).toBe("deepseek-flash");
  expect(getModelName(deepSeekFlashT085ReasoningNone)).toBe("deepseek-flash");
  expect(getModelName(deepSeekFlashT00ReasoningHigh)).toBe("deepseek-flash");

  const getModelKwargs = (model: unknown): Record<string, unknown> | undefined => {
    return (model as { modelKwargs?: Record<string, unknown> })?.modelKwargs;
  };
  // Structured DeepSeek models MUST include json_object
  expect(getModelKwargs(deepSeekFlashT01JsonReasoningNone)?.response_format).toEqual({ type: "json_object" });
  expect(getModelKwargs(deepSeekFlashT01ReasoningHigh)?.response_format).toEqual({ type: "json_object" });
  expect(getModelKwargs(deepSeekFlashT02ReasoningNone)?.response_format).toEqual({ type: "json_object" });
  expect(getModelKwargs(deepSeekFlashT08ReasoningNone)?.response_format).toEqual({ type: "json_object" });
  expect(getModelKwargs(deepSeekFlashT08ReasoningHigh)?.response_format).toEqual({ type: "json_object" });
  expect(getModelKwargs(deepSeekFlashT085ReasoningHigh)?.response_format).toEqual({ type: "json_object" });
  expect(getModelKwargs(deepSeekFlashT085ReasoningHigh)?.thinking).toEqual({ type: "enabled" });
  expect(getModelKwargs(deepSeekFlashT085ReasoningNone)?.response_format).toEqual({ type: "json_object" });
  expect(getModelKwargs(deepSeekFlashT00ReasoningHigh)?.response_format).toEqual({ type: "json_object" });
  expect(getModelKwargs(deepSeekFlashT00ReasoningNone)?.response_format).toEqual({ type: "json_object" });

  // Unstructured DeepSeek scraper models MUST NOT include json_object
  expect(getModelKwargs(deepSeekFlashT01ReasoningNone)?.response_format).toBeUndefined();
  expect(getModelKwargs(deepSeekFlashT01TextReasoningHigh)?.response_format).toBeUndefined();
});

test("ThreadWriter and Critic candidates use high-reasoning DeepSeek and individual per-model timeouts", async () => {
  const {
    deepSeekFlashT085ReasoningHigh,
    deepSeekFlashT00ReasoningHigh,
    threadWriterModelCandidates,
    criticModelCandidates,
  } = await import("../../lib/agents/models");
  const { getModelIdentity } = await import("../../lib/agents/circuitBreaker");

  expect(deepSeekFlashT085ReasoningHigh.maxTokens).toBeUndefined();

  // Every candidate in threadWriterModelCandidates & criticModelCandidates must have its own timeout window
  for (const candidate of [...threadWriterModelCandidates, ...criticModelCandidates]) {
    expect("timeout" in candidate && typeof (candidate as { timeout?: unknown }).timeout === "number").toBe(true);
    expect((candidate as { timeout: number }).timeout).toBeGreaterThan(0);
  }

  const writerDeepSeekCandidates = threadWriterModelCandidates.filter(
    (candidate) => getModelIdentity(candidate)?.provider === "deepseek"
  );
  expect(writerDeepSeekCandidates).toHaveLength(1);
  const writerDeepSeek = writerDeepSeekCandidates[0] as unknown as {
    timeout: number;
    runnable?: {
      first?: {
        bound?: unknown;
        config?: {
          response_format?: { type?: string };
          ls_structured_output_format?: { kwargs?: { method?: string } };
        };
      };
    };
  };
  expect(writerDeepSeek.timeout).toBeGreaterThanOrEqual(60000);
  expect(writerDeepSeek.runnable?.first?.bound).toBe(deepSeekFlashT085ReasoningHigh);
  expect(writerDeepSeek.runnable?.first?.config?.response_format).toEqual({ type: "json_object" });
  expect(writerDeepSeek.runnable?.first?.config?.ls_structured_output_format?.kwargs?.method).toBe("json_mode");

  const criticDeepSeekCandidates = criticModelCandidates.filter(
    (candidate) => getModelIdentity(candidate)?.provider === "deepseek"
  );
  expect(criticDeepSeekCandidates).toHaveLength(1);
  const criticDeepSeek = criticDeepSeekCandidates[0] as unknown as {
    timeout: number;
    runnable?: unknown;
  };
  expect(criticDeepSeek.runnable).toBe(deepSeekFlashT00ReasoningHigh);
  expect(
    ((criticDeepSeek.runnable as { modelKwargs?: { thinking?: unknown } })?.modelKwargs)?.thinking
  ).toEqual({ type: "enabled" });
});

test("All Flash-Lite models configure explicit thinking levels and buildAgents pipelines use toolStrategy for Google", async () => {
  const {
    googleGemini31FlashLiteT01Key1,
    googleGemini31FlashLiteT01Key2,
    googleGemini35FlashLiteT01Key1,
    googleGemini35FlashLiteT01Key2,
    googleGemini31FlashLiteT02Key1,
    googleGemini31FlashLiteT02Key2,
    googleGemini35FlashLiteT02Key1,
    googleGemini35FlashLiteT02Key2,
    googleGemini31FlashLiteT08Key1,
    googleGemini31FlashLiteT08Key2,
    googleGemini35FlashLiteT08Key1,
    googleGemini35FlashLiteT08Key2,
  } = await import("../../lib/agents/models");

  const getThinkingLevel = (m: unknown): string | undefined =>
    (m as { params?: { thinkingLevel?: string } })?.params?.thinkingLevel;

  for (const m of [
    googleGemini31FlashLiteT01Key1,
    googleGemini31FlashLiteT01Key2,
    googleGemini35FlashLiteT01Key1,
    googleGemini35FlashLiteT01Key2,
  ]) {
    expect(getThinkingLevel(m)).toBe("low");
  }

  for (const m of [
    googleGemini31FlashLiteT02Key1,
    googleGemini31FlashLiteT02Key2,
    googleGemini35FlashLiteT02Key1,
    googleGemini35FlashLiteT02Key2,
  ]) {
    expect(getThinkingLevel(m)).toBe("medium");
  }

  for (const m of [googleGemini31FlashLiteT08Key1, googleGemini31FlashLiteT08Key2]) {
    expect(getThinkingLevel(m)).toBe("medium");
  }
  for (const m of [googleGemini35FlashLiteT08Key1, googleGemini35FlashLiteT08Key2]) {
    expect(getThinkingLevel(m)).toBe("high");
  }
});

test("Infographic prompt includes JSON instruction, partitions providers with toolStrategy for thinking Google, and assigns per-candidate timeouts", async () => {
  const { INFOGRAPHIC_STRATEGIST_PROMPT } = await import("../../lib/infographics/prompts");
  const { infographicStrategistAgents } = await import("../../lib/infographics/nodes");
  const { searchQueryOptimizerAgents } = await import("../../lib/agents/nodes");
  const { getModelIdentity } = await import("../../lib/agents/circuitBreaker");

  expect(INFOGRAPHIC_STRATEGIST_PROMPT.toLowerCase()).toContain("json");
  expect(infographicStrategistAgents.length).toBe(2);
  expect(searchQueryOptimizerAgents.length).toBe(2);

  const inspectGroup = (agent: unknown) => {
    const opts = (agent as { options?: { model?: unknown; responseFormat?: unknown } })?.options;
    const rf = opts?.responseFormat;
    const firstRf = Array.isArray(rf) ? rf[0] : rf;
    const isToolStrategy = Boolean(firstRf && typeof firstRf === "object" && "tool" in firstRf);
    const model = opts?.model as { candidates?: Array<{ timeout?: unknown; runnable?: unknown }> } | undefined;
    const candidates = model?.candidates ?? [];
    return {
      isToolStrategy,
      candidates,
      outerIdentity: getModelIdentity(agent),
    };
  };

  for (const agentGroup of [searchQueryOptimizerAgents, infographicStrategistAgents]) {
    const googleGroup = inspectGroup(agentGroup[0]);
    const deepSeekGroup = inspectGroup(agentGroup[1]);

    expect(googleGroup.outerIdentity).toBeUndefined();
    expect(googleGroup.isToolStrategy).toBe(true);
    expect(googleGroup.candidates.length).toBeGreaterThanOrEqual(2);
    for (const candidate of googleGroup.candidates) {
      expect(typeof candidate.timeout).toBe("number");
      expect(candidate.timeout as number).toBeGreaterThan(0);
    }

    expect(deepSeekGroup.outerIdentity).toBeUndefined();
    expect(deepSeekGroup.isToolStrategy).toBe(false);
    expect(deepSeekGroup.candidates.length).toBe(1);
    expect(typeof deepSeekGroup.candidates[0]?.timeout).toBe("number");
    expect(deepSeekGroup.candidates[0]?.timeout as number).toBeGreaterThan(0);
  }
});

test("Gemini 4 Hydrogen models are configured with correct identities and primary placement", async () => {
  const {
    googleGemini4HydrogenT08Key1,
    googleGemini4HydrogenT08Key2,
    googleGemini4HydrogenT00Key1,
    googleGemini4HydrogenT00Key2,
    threadWriterModelCandidates,
    criticModelCandidates,
  } = await import("../../lib/agents/models");
  const { getModelIdentity } = await import("../../lib/agents/circuitBreaker");

  expect(getModelIdentity(googleGemini4HydrogenT08Key1)).toEqual({
    provider: "google",
    keyGroup: "GOOGLE_API_KEY",
    modelId: "gemini-4-hydrogen",
  });
  expect(getModelIdentity(googleGemini4HydrogenT08Key2)).toEqual({
    provider: "google",
    keyGroup: "GOOGLE_API_KEY2",
    modelId: "gemini-4-hydrogen",
  });
  expect(getModelIdentity(googleGemini4HydrogenT00Key1)).toEqual({
    provider: "google",
    keyGroup: "GOOGLE_API_KEY",
    modelId: "gemini-4-hydrogen",
  });
  expect(getModelIdentity(googleGemini4HydrogenT00Key2)).toEqual({
    provider: "google",
    keyGroup: "GOOGLE_API_KEY2",
    modelId: "gemini-4-hydrogen",
  });

  // Verify primary position and secondary key fallback in candidate chains
  expect(getModelIdentity(threadWriterModelCandidates[0])).toEqual({
    provider: "google",
    keyGroup: "GOOGLE_API_KEY",
    modelId: "gemini-4-hydrogen",
  });
  expect(getModelIdentity(threadWriterModelCandidates[1])).toEqual({
    provider: "google",
    keyGroup: "GOOGLE_API_KEY2",
    modelId: "gemini-4-hydrogen",
  });
  expect(getModelIdentity(criticModelCandidates[0])).toEqual({
    provider: "google",
    keyGroup: "GOOGLE_API_KEY",
    modelId: "gemini-4-hydrogen",
  });
  expect(getModelIdentity(criticModelCandidates[1])).toEqual({
    provider: "google",
    keyGroup: "GOOGLE_API_KEY2",
    modelId: "gemini-4-hydrogen",
  });
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
  expect(result.thread_draft).toEqual(["Revised hook", "Draft 2"]);
  expect(result.selected_hook).toBe("Revised hook");

  expect(invokeSpy).toHaveBeenCalled();
  const calledArgs = invokeSpy.mock.calls[0];
  const messages = calledArgs[1] as Array<{ role: string; content: string }>;
  const userMessage = messages.find((m) => m.role === "user");

  expect(userMessage?.content).toContain("<POST_SPECIFIC_CRITIQUES>");
  expect(userMessage?.content).toContain("Post 1: Weak curiosity gap\nFix Directive: Front-load concrete metric in first 5 words");
  expect(userMessage?.content).toContain("<HOOK_OVERRIDE_REQUIRED>");
  expect(userMessage?.content).not.toContain("<HOOK>\nBest hook\n</HOOK>");
});

test("News HookStrategistNode - extracts and returns core_delta from structuredResponse", async () => {
  const { HookStrategistNode } = await import("../../lib/agents/news/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: {
      core_delta: "They replaced 40 microservices with a single Go binary.",
      core_hooks: ["Hook 1", "Hook 2"],
      selected_hook: "Hook 1",
    },
  });

  const result = await HookStrategistNode({
    raw_markdown: "Source text",
    retries: { hook: 0 },
  } as unknown as Parameters<typeof HookStrategistNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.core_delta).toBe("They replaced 40 microservices with a single Go binary.");
  expect(result.selected_hook).toBe("Hook 1");
  expect(result.core_hooks).toEqual(["Hook 1", "Hook 2"]);
});

test("News ThreadWriterNode - injects CORE_DELTA into user message when present", async () => {
  const { ThreadWriterNode } = await import("../../lib/agents/news/nodes");

  const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    thread_draft: ["Hook 1", "Body 1", "Closer"],
  });

  await ThreadWriterNode({
    selected_hook: "Hook 1",
    raw_markdown: "Source text",
    core_delta: "They replaced 40 microservices with a single Go binary.",
    retries: { writer: 0 },
  } as unknown as Parameters<typeof ThreadWriterNode>[0]);

  expect(invokeSpy).toHaveBeenCalled();
  const calledArgs = invokeSpy.mock.calls[0];
  const messages = calledArgs[1] as Array<{ role: string; content: string }>;
  const userMessage = messages.find((m) => m.role === "user");

  expect(userMessage?.content).toContain("<CORE_DELTA>\nThey replaced 40 microservices with a single Go binary.\n</CORE_DELTA>");
});

test("News ViralityCriticNode - injects CORE_DELTA into user message when present", async () => {
  const { ViralityCriticNode } = await import("../../lib/agents/news/nodes");

  const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: {
      virality_score: 92,
      overall_critique: "Great beat progression",
      post_critiques: [],
    },
  });

  await ViralityCriticNode({
    raw_markdown: "Source text",
    thread_draft: ["Hook 1", "Body 1", "Closer"],
    core_delta: "They replaced 40 microservices with a single Go binary.",
    iterations: 0,
    retries: { critic: 0, validator: 0 },
  } as unknown as Parameters<typeof ViralityCriticNode>[0]);

  expect(invokeSpy).toHaveBeenCalled();
  const calledArgs = invokeSpy.mock.calls[0];
  const input = calledArgs[1] as { messages: Array<{ role: string; content: string }> };
  const userMessage = input.messages.find((m) => m.role === "user");

  expect(userMessage?.content).toContain("<CORE_DELTA>\nThey replaced 40 microservices with a single Go binary.\n</CORE_DELTA>");
});

test("Social Media HookStrategistNode - extracts and returns core_delta from structuredResponse", async () => {
  const { HookStrategistNode } = await import("../../lib/agents/social_media/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: {
      core_delta: "3.2 billion queries per day on two servers.",
      core_hooks: ["Hook 1", "Hook 2", "Hook 3"],
      selected_hook: "Hook 1",
    },
  });

  const result = await HookStrategistNode({
    raw_markdown: "Source text",
    retries: { hook: 0 },
  } as unknown as Parameters<typeof HookStrategistNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.core_delta).toBe("3.2 billion queries per day on two servers.");
  expect(result.selected_hook).toBe("Hook 1");
});

test("Social Media ThreadWriterNode - injects CORE_DELTA into user message when present", async () => {
  const { ThreadWriterNode } = await import("../../lib/agents/social_media/nodes");

  const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    thread_draft: ["Hook 1", "Body 1", "Closer"],
  });

  await ThreadWriterNode({
    selected_hook: "Hook 1",
    raw_markdown: "Source text",
    core_delta: "3.2 billion queries per day on two servers.",
    retries: { writer: 0 },
  } as unknown as Parameters<typeof ThreadWriterNode>[0]);

  expect(invokeSpy).toHaveBeenCalled();
  const calledArgs = invokeSpy.mock.calls[0];
  const messages = calledArgs[1] as Array<{ role: string; content: string }>;
  const userMessage = messages.find((m) => m.role === "user");

  expect(userMessage?.content).toContain("<CORE_DELTA>\n3.2 billion queries per day on two servers.\n</CORE_DELTA>");
});

test("Social Media ViralityCriticNode - injects CORE_DELTA into user message when present", async () => {
  const { ViralityCriticNode } = await import("../../lib/agents/social_media/nodes");

  const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: {
      virality_score: 92,
      overall_critique: "Great pacing",
      post_critiques: [],
    },
  });

  await ViralityCriticNode({
    raw_markdown: "Source text",
    thread_draft: ["Hook 1", "Body 1", "Closer"],
    core_delta: "3.2 billion queries per day on two servers.",
    iterations: 0,
    retries: { critic: 0, validator: 0 },
  } as unknown as Parameters<typeof ViralityCriticNode>[0]);

  expect(invokeSpy).toHaveBeenCalled();
  const calledArgs = invokeSpy.mock.calls[0];
  const input = calledArgs[1] as { messages: Array<{ role: string; content: string }> };
  const userMessage = input.messages.find((m) => m.role === "user");

  expect(userMessage?.content).toContain("<CORE_DELTA>\n3.2 billion queries per day on two servers.\n</CORE_DELTA>");
});

test("Topic HookStrategistNode - extracts and returns core_delta from model response", async () => {
  const { HookStrategistNode } = await import("../../lib/agents/topic/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    core_delta: "Adding more caches actually made their API 3x slower.",
    core_hooks: ["Hook 1", "Hook 2", "Hook 3"],
    selected_hook: "Hook 1",
  });

  const result = await HookStrategistNode({
    research_dossier: "# Research Dossier",
    retries: { hook: 0 },
  } as unknown as Parameters<typeof HookStrategistNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.core_delta).toBe("Adding more caches actually made their API 3x slower.");
  expect(result.selected_hook).toBe("Hook 1");
});

test("Topic ThreadWriterNode - injects CORE_DELTA into user message when present", async () => {
  const { ThreadWriterNode } = await import("../../lib/agents/topic/nodes");

  const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    thread_draft: ["Hook 1", "Body 1", "Closer"],
  });

  await ThreadWriterNode({
    selected_hook: "Hook 1",
    research_dossier: "# Research Dossier",
    core_delta: "Adding more caches actually made their API 3x slower.",
    retries: { writer: 0 },
  } as unknown as Parameters<typeof ThreadWriterNode>[0]);

  expect(invokeSpy).toHaveBeenCalled();
  const calledArgs = invokeSpy.mock.calls[0];
  const messages = calledArgs[1] as Array<{ role: string; content: string }>;
  const userMessage = messages.find((m) => m.role === "user");

  expect(userMessage?.content).toContain("<CORE_DELTA>\nAdding more caches actually made their API 3x slower.\n</CORE_DELTA>");
});

test("Topic ViralityCriticNode - injects CORE_DELTA, DOSSIER, and CURRENT_ITERATION_ATTEMPT into user message", async () => {
  const { ViralityCriticNode } = await import("../../lib/agents/topic/nodes");

  const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: {
      virality_score: 92,
      overall_critique: "Great pacing",
      post_critiques: [
        {
          post_index: 1,
          critique: "Needs stronger contrast",
          fix_directive: "State the delta directly",
        },
      ],
    },
  });

  const result = await ViralityCriticNode({
    research_dossier: "# Research Dossier Content",
    thread_draft: ["Hook 1", "Body 1", "Closer"],
    core_delta: "Adding more caches actually made their API 3x slower.",
    iterations: 0,
    retries: { critic: 0, validator: 0 },
  } as unknown as Parameters<typeof ViralityCriticNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.critique).toBe("Great pacing");
  expect(result.virality_score).toBe(92);
  expect(result.post_critiques).toEqual([
    {
      post_index: 1,
      critique: "Needs stronger contrast",
      fix_directive: "State the delta directly",
    },
  ]);

  expect(invokeSpy).toHaveBeenCalled();
  const calledArgs = invokeSpy.mock.calls[0];
  const input = calledArgs[1] as { messages: Array<{ role: string; content: string }> };
  const userMessage = input.messages.find((m) => m.role === "user");

  expect(userMessage?.content).toContain("<CURRENT_ITERATION_ATTEMPT>\n1\n</CURRENT_ITERATION_ATTEMPT>");
  expect(userMessage?.content).toContain("<DOSSIER>\n# Research Dossier Content\n</DOSSIER>");
  expect(userMessage?.content).toContain("<CORE_DELTA>\nAdding more caches actually made their API 3x slower.\n</CORE_DELTA>");
});

test("Topic ThreadWriterNode - injects PREVIOUS_THREAD_DRAFT, CRITIQUE_TO_ADDRESS, and POST_SPECIFIC_CRITIQUES", async () => {
  const { ThreadWriterNode } = await import("../../lib/agents/topic/nodes");

  const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    thread_draft: ["Updated Hook", "Updated Body", "Updated Closer"],
  });

  const result = await ThreadWriterNode({
    selected_hook: "Hook 1",
    research_dossier: "# Research Dossier Content",
    core_delta: "Adding more caches actually made their API 3x slower.",
    thread_draft: ["Old Hook", "Old Body", "Old Closer"],
    critique: "Overall thread pacing drags in the middle.",
    post_critiques: [
      {
        post_index: 2,
        critique: "Too wordy",
        fix_directive: "Cut 20 words",
      },
    ],
    retries: { writer: 0 },
  } as unknown as Parameters<typeof ThreadWriterNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.thread_draft).toEqual(["Old Hook", "Updated Body", "Old Closer"]);
  expect(result.selected_hook).toBeUndefined();

  expect(invokeSpy).toHaveBeenCalled();
  const calledArgs = invokeSpy.mock.calls[0];
  const messages = calledArgs[1] as Array<{ role: string; content: string }>;
  const userMessage = messages.find((m) => m.role === "user");

  expect(userMessage?.content).toContain("<HOOK>\nHook 1\n</HOOK>");
  expect(userMessage?.content).not.toContain("<HOOK_OVERRIDE_REQUIRED>");
  expect(userMessage?.content).toContain("<PREVIOUS_THREAD_DRAFT>");
  expect(userMessage?.content).toContain("<CRITIQUE_TO_ADDRESS>\nOverall thread pacing drags in the middle.\n</CRITIQUE_TO_ADDRESS>");
  expect(userMessage?.content).toContain("<POST_SPECIFIC_CRITIQUES>");
  expect(userMessage?.content).toContain("Post 2: Too wordy\nFix Directive: Cut 20 words");
});

test("Topic HookStrategistNode - returns empty array and string on parse failure (no placeholder strings)", async () => {
  const { HookStrategistNode } = await import("../../lib/agents/topic/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockRejectedValue(new Error("LLM failure"));

  const result = await HookStrategistNode({
    research_dossier: "# Research Dossier",
    retries: { hook: 0 },
  } as unknown as Parameters<typeof HookStrategistNode>[0]);

  expect(result.parse_success).toBe(false);
  expect(result.core_hooks).toEqual([]);
  expect(result.selected_hook).toBe("");
  expect(result.core_delta).toBeUndefined();
});

test("News ThreadWriterNode - retains previous thread_draft on invocation failure", async () => {
  const { ThreadWriterNode } = await import("../../lib/agents/news/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockRejectedValue(new Error("Timeout error"));

  const result = await ThreadWriterNode({
    selected_hook: "Hook 1",
    raw_markdown: "Source text",
    thread_draft: ["Preserved Post 1", "Preserved Post 2"],
    retries: { writer: 1 },
  } as unknown as Parameters<typeof ThreadWriterNode>[0]);

  expect(result.parse_success).toBe(false);
  expect(result.thread_draft).toEqual(["Preserved Post 1", "Preserved Post 2"]);
  expect(result.retries.writer).toBe(2);
});

test("Social Media ThreadWriterNode - retains previous thread_draft on invocation failure", async () => {
  const { ThreadWriterNode } = await import("../../lib/agents/social_media/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockRejectedValue(new Error("Timeout error"));

  const result = await ThreadWriterNode({
    selected_hook: "Hook 1",
    raw_markdown: "Source text",
    thread_draft: ["Preserved Post 1", "Preserved Post 2"],
    retries: { writer: 1 },
  } as unknown as Parameters<typeof ThreadWriterNode>[0]);

  expect(result.parse_success).toBe(false);
  expect(result.thread_draft).toEqual(["Preserved Post 1", "Preserved Post 2"]);
  expect(result.retries.writer).toBe(2);
});

test("filterActionablePostCritiques - filters out empty, whitespace, and passing placeholders", () => {
  const rawCritiques = [
    { post_index: 1, critique: "Hook reveals payoff too early", fix_directive: "Cut payoff sentence" },
    { post_index: 2, critique: "", fix_directive: "" },
    { post_index: 3, critique: "   ", fix_directive: "   " },
    { post_index: 4, critique: "Passes all criteria", fix_directive: "" },
    { post_index: 5, critique: "No issues", fix_directive: "none" },
    { post_index: 6, critique: "Looks good" },
    { post_index: 7, critique: "Pacing drags in middle", fix_directive: "" },
  ];

  const filtered = agentUtils.filterActionablePostCritiques(rawCritiques);
  expect(filtered).toEqual([
    { post_index: 1, critique: "Hook reveals payoff too early", fix_directive: "Cut payoff sentence" },
    { post_index: 7, critique: "Pacing drags in middle" },
  ]);
});

test("News ViralityCriticNode - discards non-defect/empty post critiques", async () => {
  const { ViralityCriticNode } = await import("../../lib/agents/news/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: {
      virality_score: 95,
      overall_critique: "Excellent thread.",
      post_critiques: [
        { post_index: 1, critique: "Passes all criteria", fix_directive: "" },
        { post_index: 2, critique: "", fix_directive: "" },
        { post_index: 3, critique: "No issues", fix_directive: "none" },
      ],
    },
  });

  const result = await ViralityCriticNode({
    raw_markdown: "News text",
    thread_draft: ["Hook post", "Body post", "Closer post"],
    iterations: 0,
    retries: { critic: 0, validator: 0 },
  } as unknown as Parameters<typeof ViralityCriticNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.post_critiques).toEqual([]);
});

test("Social Media ViralityCriticNode - discards non-defect/empty post critiques", async () => {
  const { ViralityCriticNode } = await import("../../lib/agents/social_media/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: {
      virality_score: 91,
      overall_critique: "Clean narrative.",
      post_critiques: [
        { post_index: 1, critique: "Hook lacks tension", fix_directive: "Increase stakes" },
        { post_index: 2, critique: "Looks good", fix_directive: "" },
        { post_index: 3, critique: "Passes", fix_directive: "" },
      ],
    },
  });

  const result = await ViralityCriticNode({
    raw_markdown: "Social text",
    thread_draft: ["Hook post", "Body post", "Closer post"],
    iterations: 0,
    retries: { critic: 0, validator: 0 },
  } as unknown as Parameters<typeof ViralityCriticNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.post_critiques).toEqual([
    { post_index: 1, critique: "Hook lacks tension", fix_directive: "Increase stakes" },
  ]);
});

test("Topic ViralityCriticNode - discards non-defect/empty post critiques", async () => {
  const { ViralityCriticNode } = await import("../../lib/agents/topic/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: {
      virality_score: 93,
      overall_critique: "Great depth.",
      post_critiques: [
        { post_index: 1, critique: "Passes all criteria", fix_directive: "" },
        { post_index: 2, critique: "No fix needed", fix_directive: "" },
      ],
    },
  });

  const result = await ViralityCriticNode({
    research_dossier: "Topic Dossier",
    thread_draft: ["Hook post", "Body post"],
    iterations: 0,
    retries: { critic: 0, validator: 0 },
  } as unknown as Parameters<typeof ViralityCriticNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.post_critiques).toEqual([]);
});

// =========================================================================
// Monolithic Critic Refinement Tests (Pillars 1, 2, 3, 4 across all factories)
// =========================================================================

test("News ViralityCriticNode - differential verification mode marks issues resolved and guarantees monotonic score >= 88", async () => {
  const { ViralityCriticNode } = await import("../../lib/agents/news/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: {
      overall_critique: "The revised hook solved the curiosity deficit.",
      issue_evaluations: [
        {
          post_index: 1,
          prior_issue: "Weak opening hook",
          status: "resolved",
          reasoning: "Opening line now introduces concrete contrast.",
        },
      ],
      new_violations: [],
      suggested_score: 88,
    },
  });

  const previousDraft = ["Original hook", "Original body"];
  const revisedDraft = ["High contrast punchy hook", "Original body"];

  const result = await ViralityCriticNode({
    raw_markdown: "News content",
    thread_draft: revisedDraft,
    iterations: 1,
    virality_score: 75,
    best_virality_score: 75,
    best_thread_draft: previousDraft,
    audit_history: [
      {
        iteration: 1,
        virality_score: 75,
        post_critiques: [
          { post_index: 1, critique: "Weak opening hook", fix_directive: "Add contrast", status: "open" },
        ],
      },
    ],
    post_critiques: [
      { post_index: 1, critique: "Weak opening hook", fix_directive: "Add contrast", status: "open" },
    ],
    retries: { critic: 0, validator: 0 },
  } as unknown as Parameters<typeof ViralityCriticNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.is_approved).toBe(true);
  expect(result.virality_score).toBeGreaterThanOrEqual(88);
  expect(result.post_critiques).toEqual([]); // All resolved
  expect(result.best_virality_score).toBe(result.virality_score);
  expect(result.best_thread_draft).toEqual(revisedDraft);
  expect(result.audit_history).toHaveLength(2);
  expect(result.audit_history?.[1].iteration).toBe(2);
  expect(result.audit_history?.[1].post_critiques[0].status).toBe("resolved");
});

test("Topic ViralityCriticNode - differential mode enforces monotonic floor and retains unresolved punchlist", async () => {
  const { ViralityCriticNode } = await import("../../lib/agents/topic/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: {
      overall_critique: "Hook is improved, but pacing in post 2 still drags.",
      issue_evaluations: [
        {
          post_index: 1,
          prior_issue: "Hook lacks clarity",
          status: "resolved",
          reasoning: "Hook is now crisp.",
        },
        {
          post_index: 2,
          prior_issue: "Body text drags",
          status: "unresolved",
          reasoning: "Still contains filler words.",
        },
      ],
      new_violations: [],
      suggested_score: 72, // Critic suggests lower score than previous!
    },
  });

  const result = await ViralityCriticNode({
    research_dossier: "Topic Dossier",
    thread_draft: ["Revised hook", "Same slow body"],
    iterations: 1,
    virality_score: 80,
    best_virality_score: 80,
    best_thread_draft: ["Original hook", "Same slow body"],
    post_critiques: [
      { post_index: 1, critique: "Hook lacks clarity", fix_directive: "Clarify", status: "open" },
      { post_index: 2, critique: "Body text drags", fix_directive: "Cut filler", status: "open" },
    ],
    retries: { critic: 0, validator: 0 },
  } as unknown as Parameters<typeof ViralityCriticNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.is_approved).toBe(false); // Post 2 still unresolved
  expect(result.virality_score).toBeGreaterThanOrEqual(80); // Monotonic floor prevents score decay!
  expect(result.post_critiques).toHaveLength(1);
  expect(result.post_critiques?.[0].post_index).toBe(2);
  expect(result.post_critiques?.[0].status).toBe("unresolved");
  expect(result.best_virality_score).toBeGreaterThanOrEqual(80);
});

test("Social Media ViralityCriticNode - differential mode flags platform violations", async () => {
  const { ViralityCriticNode } = await import("../../lib/agents/social_media/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: {
      overall_critique: "Prior issue resolved, but a new formatting issue was introduced.",
      issue_evaluations: [
        {
          post_index: 1,
          prior_issue: "Boring hook",
          status: "resolved",
          reasoning: "Punchy now.",
        },
      ],
      new_violations: [
        {
          post_index: 1,
          violation_type: "character_limit",
          critique: "Hook rewrite is 600 characters, exceeding 500 limit.",
        },
      ],
      suggested_score: 70,
    },
  });

  const result = await ViralityCriticNode({
    raw_markdown: "Social source",
    thread_draft: ["A".repeat(600), "Body"],
    iterations: 1,
    virality_score: 78,
    post_critiques: [
      { post_index: 1, critique: "Boring hook", fix_directive: "Make punchy", status: "open" },
    ],
    retries: { critic: 0, validator: 0 },
  } as unknown as Parameters<typeof ViralityCriticNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.is_approved).toBe(false);
  expect(result.post_critiques?.some((pc) => pc.critique.includes("character_limit"))).toBe(true);
});

test("Social Media ThreadWriterNode - surgical mode preserves unflagged posts character-for-character", async () => {
  const { ThreadWriterNode } = await import("../../lib/agents/social_media/nodes");

  const originalDraft = [
    "Post 1: Perfectly crafted hook that should never change.",
    "Post 2: Weak middle post with no substance.",
    "Post 3: High-converting CTA closer.",
  ];

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    thread_draft: [
      "Post 1: Rewritten hook with unnecessary wording drift.",
      "Post 2: Substantive rewritten body with deep insights.",
      "Post 3: Rewritten CTA with drift.",
    ],
  });

  const result = await ThreadWriterNode({
    selected_hook: "Selected hook",
    raw_markdown: "Source content",
    thread_draft: originalDraft,
    iterations: 1,
    post_critiques: [
      { post_index: 2, critique: "Weak middle post", fix_directive: "Add insights", status: "unresolved" },
    ],
    retries: { writer: 0 },
  } as unknown as Parameters<typeof ThreadWriterNode>[0]);

  expect(result.parse_success).toBe(true);
  // Post 1 and Post 3 MUST remain character-for-character identical to originalDraft
  expect(result.thread_draft[0]).toBe(originalDraft[0]);
  expect(result.thread_draft[1]).toBe("Post 2: Substantive rewritten body with deep insights.");
  expect(result.thread_draft[2]).toBe(originalDraft[2]);
});

test("News ThreadWriterNode - surgical mode activates on character validation failure", async () => {
  const { ThreadWriterNode } = await import("../../lib/agents/news/nodes");

  const originalDraft = [
    "Post 1: Valid hook under 500 chars.",
    "Post 2: Valid body under 500 chars.",
    "Post 3: Way too long post exceeding character limits...",
  ];

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    thread_draft: [
      "Post 1: Reworded",
      "Post 2: Reworded",
      "Post 3: Compact closer under 200 chars.",
    ],
  });

  const result = await ThreadWriterNode({
    selected_hook: "Hook",
    raw_markdown: "Source content",
    thread_draft: originalDraft,
    character_critique: "Post 3 exceeds maximum character limit of 500 characters.",
    retries: { writer: 0 },
  } as unknown as Parameters<typeof ThreadWriterNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.thread_draft[0]).toBe(originalDraft[0]);
  expect(result.thread_draft[1]).toBe(originalDraft[1]);
  expect(result.thread_draft[2]).toBe("Post 3: Compact closer under 200 chars.");
});

test("News ViralityCriticNode - preserves Pareto frontier in Discovery mode when prior best score exists", async () => {
  const { ViralityCriticNode } = await import("../../lib/agents/news/nodes");

  vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    structuredResponse: {
      virality_score: 72, // Raw score regressed
      overall_critique: "Narrative needs more tension.",
      post_critiques: [],
    },
  });

  const priorBestDraft = ["Best Hook", "Best Body"];
  const result = await ViralityCriticNode({
    raw_markdown: "Source text",
    thread_draft: ["Degraded Hook", "Degraded Body"],
    iterations: 0,
    best_thread_draft: priorBestDraft,
    best_virality_score: 86,
    retries: { critic: 0, validator: 0 },
  } as unknown as Parameters<typeof ViralityCriticNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.virality_score).toBe(72);
  // Pareto frontier MUST preserve prior best
  expect(result.best_virality_score).toBe(86);
  expect(result.best_thread_draft).toEqual(priorBestDraft);
});

test("Topic ThreadWriterNode - overrides hook tag and updates selected_hook when Post 1 is flagged", async () => {
  const { ThreadWriterNode } = await import("../../lib/agents/topic/nodes");

  const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
    thread_draft: ["Rewritten Post 1 Hook", "Rewritten Body 2"],
  });

  const result = await ThreadWriterNode({
    selected_hook: "Original Hook",
    research_dossier: "# Research Dossier Content",
    thread_draft: ["Draft 1", "Draft 2"],
    critique: "Hook spoils the ending",
    post_critiques: [
      {
        post_index: 1,
        critique: "Too passive",
        fix_directive: "Lead with concrete tension",
      },
    ],
    retries: { writer: 0 },
  } as unknown as Parameters<typeof ThreadWriterNode>[0]);

  expect(result.parse_success).toBe(true);
  expect(result.thread_draft).toEqual(["Rewritten Post 1 Hook", "Draft 2"]);
  expect(result.selected_hook).toBe("Rewritten Post 1 Hook");

  const calledArgs = invokeSpy.mock.calls[0];
  const messages = calledArgs[1] as Array<{ role: string; content: string }>;
  const userMessage = messages.find((m) => m.role === "user");
  expect(userMessage?.content).toContain("<HOOK_OVERRIDE_REQUIRED>");
  expect(userMessage?.content).toContain("Original Hook");
  expect(userMessage?.content).not.toContain("<HOOK>\nOriginal Hook\n</HOOK>");
});

test("Social Media ThreadWriterNode - overrides hook only when Post 1 is flagged", async () => {
  const { ThreadWriterNode } = await import("../../lib/agents/social_media/nodes");

  const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks")
    .mockResolvedValueOnce({
      thread_draft: ["Sharper Social Hook", "Ignored Body 2"],
    })
    .mockResolvedValueOnce({
      thread_draft: ["Accidental Hook Change", "Sharper Post 2"],
    });

  const post1FlaggedResult = await ThreadWriterNode({
    selected_hook: "Best hook",
    raw_markdown: "Source content",
    thread_draft: ["Draft 1", "Draft 2"],
    critique: "Post 1 is weak",
    post_critiques: [
      {
        post_index: 1,
        critique: "Weak opener",
        fix_directive: "Sharpen first line",
      },
    ],
    retries: { writer: 0 },
  } as unknown as Parameters<typeof ThreadWriterNode>[0]);

  expect(post1FlaggedResult.parse_success).toBe(true);
  expect(post1FlaggedResult.thread_draft).toEqual(["Sharper Social Hook", "Draft 2"]);
  expect(post1FlaggedResult.selected_hook).toBe("Sharper Social Hook");

  const firstPromptMessages = invokeSpy.mock.calls[0][1] as Array<{ role: string; content: string }>;
  const firstUserMsg = firstPromptMessages.find((m) => m.role === "user");
  expect(firstUserMsg?.content).toContain("<HOOK_OVERRIDE_REQUIRED>");
  expect(firstUserMsg?.content).not.toContain("<HOOK>\nBest hook\n</HOOK>");

  const post2OnlyFlaggedResult = await ThreadWriterNode({
    selected_hook: "Best hook",
    raw_markdown: "Source content",
    thread_draft: ["Draft 1", "Draft 2"],
    critique: "Post 2 needs tension",
    post_critiques: [
      {
        post_index: 2,
        critique: "Flat transition",
        fix_directive: "Add concrete number",
      },
    ],
    retries: { writer: 1 },
  } as unknown as Parameters<typeof ThreadWriterNode>[0]);

  expect(post2OnlyFlaggedResult.parse_success).toBe(true);
  expect(post2OnlyFlaggedResult.thread_draft).toEqual(["Draft 1", "Sharper Post 2"]);
  expect(post2OnlyFlaggedResult.selected_hook).toBeUndefined();

  const secondPromptMessages = invokeSpy.mock.calls[1][1] as Array<{ role: string; content: string }>;
  const secondUserMsg = secondPromptMessages.find((m) => m.role === "user");
  expect(secondUserMsg?.content).toContain("<HOOK>\nBest hook\n</HOOK>");
  expect(secondUserMsg?.content).not.toContain("<HOOK_OVERRIDE_REQUIRED>");
});

test("Clickbait CliffhangerThreadWriterNode - overrides hook tag and selected_hook when Post 1 fails character validation", async () => {
  const { CliffhangerThreadWriterNode } = await import("../../lib/agents/clickbait/nodes");

  const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks")
    .mockResolvedValueOnce({
      thread_draft: ["Tighter Clickbait Hook", "Accidental Post 2 Rewrite"],
    })
    .mockResolvedValueOnce({
      thread_draft: ["Accidental Hook Rewrite", "Punchier Post 2"],
    });

  const post1CharFlagged = await CliffhangerThreadWriterNode({
    selected_hook: "Best clickbait hook",
    raw_markdown: "Source facts",
    thread_draft: ["Draft 1", "Draft 2"],
    character_critique: "Post 1 exceeds maximum character limit of 280 characters.",
    retries: { writer: 0 },
  } as unknown as Parameters<typeof CliffhangerThreadWriterNode>[0]);

  expect(post1CharFlagged.parse_success).toBe(true);
  expect(post1CharFlagged.thread_draft).toEqual(["Tighter Clickbait Hook", "Draft 2"]);
  expect(post1CharFlagged.selected_hook).toBe("Tighter Clickbait Hook");

  const firstMessages = invokeSpy.mock.calls[0][1] as Array<{ role: string; content: string }>;
  const firstUserMsg = firstMessages.find((m) => m.role === "user");
  expect(firstUserMsg?.content).toContain("<HOOK_OVERRIDE_REQUIRED>");
  expect(firstUserMsg?.content).not.toContain("<SELECTED_HOOK>");

  const post2OnlyFlagged = await CliffhangerThreadWriterNode({
    selected_hook: "Best clickbait hook",
    raw_markdown: "Source facts",
    thread_draft: ["Draft 1", "Draft 2"],
    critique: "Middle drags",
    post_critiques: [
      {
        post_index: 2,
        critique: "Needs stronger cliffhanger",
        fix_directive: "End on unresolved stakes",
      },
    ],
    retries: { writer: 1 },
  } as unknown as Parameters<typeof CliffhangerThreadWriterNode>[0]);

  expect(post2OnlyFlagged.parse_success).toBe(true);
  expect(post2OnlyFlagged.thread_draft).toEqual(["Draft 1", "Punchier Post 2"]);
  expect(post2OnlyFlagged.selected_hook).toBeUndefined();

  const secondMessages = invokeSpy.mock.calls[1][1] as Array<{ role: string; content: string }>;
  const secondUserMsg = secondMessages.find((m) => m.role === "user");
  expect(secondUserMsg?.content).toContain("<SELECTED_HOOK>\nBest clickbait hook\n</SELECTED_HOOK>");
  expect(secondUserMsg?.content).not.toContain("<HOOK_OVERRIDE_REQUIRED>");
});

test("All increased-thinking candidates enforce scaled timeouts and Key1/Key2 quota parity", async () => {
  const { getModelIdentity } = await import("../../lib/agents/circuitBreaker");
  const { threadWriterModelCandidates, criticModelCandidates } = await import("../../lib/agents/models");
  const {
    scraperModels: newsScraperModels,
    newsContextResearcherAgents,
    newsHookStrategistAgents,
  } = await import("../../lib/agents/news/nodes");
  const {
    socialMediaScraperModels,
    socialMediaContextResearcherAgents,
    socialMediaHookStrategistAgents,
  } = await import("../../lib/agents/social_media/nodes");
  const {
    topicResearchOrchestratorAgents,
    topicDeepScraperModels,
    topicHookStrategistModels,
  } = await import("../../lib/agents/topic/nodes");
  const {
    clickbaitScraperModels,
    clickbaitAngleAgents,
    clickbaitHookStrategistAgents,
  } = await import("../../lib/agents/clickbait/nodes");
  const {
    vectorHypothesizerModels,
    tensionExtractionModels,
    angleFormulatorModels,
  } = await import("../../lib/agents/discovery/nodes");
  const { infographicStrategistAgents } = await import("../../lib/infographics/nodes");

  interface TimedEntry {
    timeout: number;
    runnable?: unknown;
  }

  const flattenCandidates = (entries: unknown[]): TimedEntry[] => {
    const out: TimedEntry[] = [];
    for (const entry of entries) {
      const grouped = (entry as { options?: { model?: { candidates?: TimedEntry[] } } })?.options?.model?.candidates;
      if (Array.isArray(grouped)) {
        out.push(...grouped);
      } else {
        out.push(entry as TimedEntry);
      }
    }
    return out;
  };

  const findTimeouts = (entries: unknown[], modelId: string, keyGroup?: string): number[] =>
    flattenCandidates(entries)
      .filter((c) => {
        const id = getModelIdentity(c);
        return id?.modelId === modelId && (keyGroup === undefined || id.keyGroup === keyGroup);
      })
      .map((c) => c.timeout);

  // 1. Writer & Critic Key1 == Key2 parity for thinkingLevel: "high"
  for (const modelId of ["gemini-4-hydrogen", "gemini-3.8-flash", "gemini-3-flash-preview"]) {
    expect(findTimeouts(threadWriterModelCandidates, modelId)).toEqual([60000, 60000]);
    expect(findTimeouts(criticModelCandidates, modelId)).toEqual([60000, 60000]);
  }
  expect(findTimeouts(threadWriterModelCandidates, "gemini-3.6-flash")).toEqual([90000, 90000]);
  expect(findTimeouts(criticModelCandidates, "gemini-3.6-flash")).toEqual([75000, 75000]);
  expect(findTimeouts(threadWriterModelCandidates, "deepseek-flash")).toEqual([90000]);
  expect(findTimeouts(criticModelCandidates, "deepseek-flash")).toEqual([90000]);

  // 2. Clickbait high-reasoning DeepSeek gets 90s and Key2 matches Key1
  for (const chain of [clickbaitScraperModels, clickbaitAngleAgents, clickbaitHookStrategistAgents]) {
    expect(findTimeouts(chain, "deepseek-flash")).toEqual([90000]);
    expect(findTimeouts(chain, "gemini-3.8-flash")).toEqual([60000, 60000]);
    expect(findTimeouts(chain, "gemini-3.6-flash")).toEqual([75000, 75000]);
  }

  // 3. Upgraded Flash-Lite pipelines
  for (const scrapers of [newsScraperModels, socialMediaScraperModels]) {
    expect(findTimeouts(scrapers, "gemini-3.5-flash-lite")).toEqual([45000, 45000]);
  }
  for (const hookChain of [newsHookStrategistAgents, socialMediaHookStrategistAgents, topicHookStrategistModels]) {
    expect(findTimeouts(hookChain, "gemini-3.5-flash-lite")).toEqual([60000, 60000]);
  }
  for (const dossierChain of [
    newsContextResearcherAgents,
    socialMediaContextResearcherAgents,
    topicResearchOrchestratorAgents,
    topicDeepScraperModels,
  ]) {
    expect(findTimeouts(dossierChain, "gemini-3.5-flash-lite")).toEqual([60000, 60000]);
    expect(findTimeouts(dossierChain, "gemini-3.1-flash-lite")).toEqual([60000, 60000]);
  }

  // 4. Discovery & Infographic thinking stages
  expect(findTimeouts(vectorHypothesizerModels, "gemini-3.5-flash-lite")).toEqual([45000, 45000]);
  expect(findTimeouts(vectorHypothesizerModels, "gemini-3.1-flash-lite")).toEqual([45000, 45000]);
  expect(findTimeouts(infographicStrategistAgents, "gemini-3.5-flash-lite")).toEqual([50000, 50000]);
  expect(findTimeouts(infographicStrategistAgents, "gemini-3.1-flash-lite")).toEqual([50000, 50000]);

  for (const discoveryCascade of [tensionExtractionModels, angleFormulatorModels]) {
    expect(findTimeouts(discoveryCascade, "gemini-4-hydrogen")).toEqual([60000, 60000]);
    expect(findTimeouts(discoveryCascade, "gemini-3.8-flash")).toEqual([60000, 60000]);
    expect(findTimeouts(discoveryCascade, "gemini-3.6-flash")).toEqual([75000, 75000]);
  }
});






