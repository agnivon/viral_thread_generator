/// <reference types="vite/client" />
import { expect, test, vi, afterEach } from "vitest";
import {
  invokeWithFallbacks,
  FallbackRunnable,
  FallbackChatModel,
  reconcileSurgicalDraft,
  calculateMonotonicScore,
  parseFlaggedPostIndicesFromErrors,
  buildSurgicalWriterContext,
  processDifferentialEvaluation,
  filterActionablePostCritiques,
  BANNED_ENGAGEMENT_PHRASES,
} from "../../lib/agents/utils";
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import type { ChatResult } from "@langchain/core/outputs";
import { AIMessageChunk, type BaseMessage } from "@langchain/core/messages";
import { extractSelectedHook } from "../../lib/agents/nodes";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test("invokeWithFallbacks - advances to fallback model when primary model times out", async () => {
  vi.useFakeTimers();

  const slowModel: FallbackRunnable = {
    invoke: vi.fn().mockImplementation((_input, config) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ text: "slow response" }), 10000);
        config?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("AbortError"));
        });
      });
    }),
  };

  const fastFallbackModel: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "fast fallback success" }),
  };

  const promise = invokeWithFallbacks(
    [slowModel, fastFallbackModel],
    { prompt: "hello" },
    { timeout: 2000 }
  );

  const assertion = expect(promise).resolves.toEqual({ text: "fast fallback success" });
  await vi.advanceTimersByTimeAsync(2000);
  await assertion;

  expect(slowModel.invoke).toHaveBeenCalledTimes(1);
  expect(fastFallbackModel.invoke).toHaveBeenCalledTimes(1);
});

test("invokeWithFallbacks - advances through multiple models when errors and timeouts occur", async () => {
  vi.useFakeTimers();

  const errorModel: FallbackRunnable = {
    invoke: vi.fn().mockRejectedValue(new Error("RateLimit 429")),
  };

  const timeoutModel: FallbackRunnable = {
    invoke: vi.fn().mockImplementation((_input, config) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ text: "too late" }), 10000);
        config?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("AbortError"));
        });
      });
    }),
  };

  const successModel: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "third model success" }),
  };

  const promise = invokeWithFallbacks(
    [errorModel, timeoutModel, successModel],
    { prompt: "hello" },
    { timeout: 1500 }
  );

  const assertion = expect(promise).resolves.toEqual({ text: "third model success" });
  await vi.advanceTimersByTimeAsync(1500);
  await assertion;

  expect(errorModel.invoke).toHaveBeenCalledTimes(1);
  expect(timeoutModel.invoke).toHaveBeenCalledTimes(1);
  expect(successModel.invoke).toHaveBeenCalledTimes(1);
});

test("invokeWithFallbacks - throws error when all models fail or time out", async () => {
  vi.useFakeTimers();

  const model1: FallbackRunnable = {
    invoke: vi.fn().mockRejectedValue(new Error("Model 1 500 Server Error")),
  };

  const model2: FallbackRunnable = {
    invoke: vi.fn().mockImplementation((_input, config) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ text: "too late" }), 10000);
        config?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("AbortError"));
        });
      });
    }),
  };

  const promise = invokeWithFallbacks(
    [model1, model2],
    { prompt: "hello" },
    { timeout: 1000 }
  );

  const assertion = expect(promise).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(1000);
  await assertion;

  expect(model1.invoke).toHaveBeenCalledTimes(1);
  expect(model2.invoke).toHaveBeenCalledTimes(1);
});

test("invokeWithFallbacks - stops immediately if parent signal is already aborted", async () => {
  const controller = new AbortController();
  controller.abort(new Error("User cancelled"));

  const model1: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "never called" }),
  };

  await expect(
    invokeWithFallbacks([model1], { prompt: "hello" }, { signal: controller.signal })
  ).rejects.toThrow("User cancelled");

  expect(model1.invoke).not.toHaveBeenCalled();
});

test("invokeWithFallbacks - respects custom per-model timeout via withTimeout", async () => {
  vi.useFakeTimers();

  const slowModel: FallbackRunnable = {
    invoke: vi.fn().mockImplementation((_input, config) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ text: "slow response" }), 10000);
        config?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("AbortError"));
        });
      });
    }),
  };

  const fastFallbackModel: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "fast fallback success" }),
  };

  // Node default timeout is 10000ms, but slowModel has a custom timeout of 1500ms via withTimeout
  const { withTimeout } = await import("../../lib/agents/utils");
  const promise = invokeWithFallbacks(
    [withTimeout(slowModel, 1500), fastFallbackModel],
    { prompt: "hello" },
    { timeout: 10000 }
  );

  const assertion = expect(promise).resolves.toEqual({ text: "fast fallback success" });
  // Advance by 1500ms (the custom timeout), which should trigger the fallback early
  await vi.advanceTimersByTimeAsync(1500);
  await assertion;

  expect(slowModel.invoke).toHaveBeenCalledTimes(1);
  expect(fastFallbackModel.invoke).toHaveBeenCalledTimes(1);
});

test("buildAgents - builds a single resilient agent powered by FallbackChatModel", async () => {
  const { buildAgents, withTimeout } = await import("../../lib/agents/utils");
  const { ChatGoogle } = await import("@langchain/google");

  const model1 = new ChatGoogle({ model: "gemini-3.8-flash", apiKey: "dummy" });
  const model2 = new ChatGoogle({ model: "gemini-3.8-flash", apiKey: "dummy2" });

  const agents = buildAgents(
    [model1, withTimeout(model2, 45000)],
    {
      systemPrompt: "test",
      responseFormat: undefined,
    }
  );

  // Approach 1 invariant: Single resilient agent wrapping all candidates at the model level
  expect(agents).toHaveLength(1);
  const resilientAgent = agents[0] as unknown as { fallbackModel: FallbackChatModel };
  expect(resilientAgent.fallbackModel).toBeInstanceOf(FallbackChatModel);
  expect(resilientAgent.fallbackModel.candidates).toHaveLength(2);

  // Check that candidate 1 holds custom timeout 45000 and has runnable
  expect((resilientAgent.fallbackModel.candidates[1] as { timeout: number }).timeout).toBe(45000);
});

test("FallbackChatModel - preserves tool execution state across model fallback without losing intermediate tool outputs", async () => {
  const { createAgent } = await import("langchain");
  const { tool } = await import("@langchain/core/tools");
  const { BaseChatModel } = await import("@langchain/core/language_models/chat_models");
  const { z } = await import("zod");

  let toolExecutedCount = 0;
  const searchTool = tool(async ({ query }: { query: string }) => {
    toolExecutedCount++;
    return `Search results for: ${query}`;
  }, {
    name: "search_tool",
    description: "Searches for information",
    schema: z.object({ query: z.string() })
  });

  const model1Calls: number[] = [];
  const model2Calls: number[] = [];

  class MockPrimaryModel extends BaseChatModel {
    _llmType(): string { return "mock_primary"; }
    bindTools(_tools: unknown[], _kwargs?: unknown): this {
      return this;
    }
    async _generate(_messages: BaseMessage[], _options?: unknown): Promise<ChatResult> {
      throw new Error("Unused");
    }
    override async invoke(input: BaseLanguageModelInput): Promise<AIMessageChunk> {
      const msgs = Array.isArray(input) ? (input as { _getType?: () => string }[]) : [];
      model1Calls.push(msgs.length);
      const hasToolMessage = msgs.some((m) => m._getType?.() === "tool");

      if (!hasToolMessage) {
        // Turn 1: Emit tool call
        return new AIMessageChunk({
          content: "",
          tool_calls: [{ id: "call_search_1", name: "search_tool", args: { query: "quantum computing" } }]
        });
      }

      // Turn 2: Simulate 429 rate limit spike after tool execution
      throw new Error("429 Resource exhausted: Model 1 rate limit reached");
    }
  }

  class MockSecondaryModel extends BaseChatModel {
    _llmType(): string { return "mock_secondary"; }
    bindTools(_tools: unknown[], _kwargs?: unknown): this {
      return this;
    }
    async _generate(_messages: BaseMessage[], _options?: unknown): Promise<ChatResult> {
      throw new Error("Unused");
    }
    override async invoke(input: BaseLanguageModelInput): Promise<AIMessageChunk> {
      const msgs = Array.isArray(input) ? (input as { _getType?: () => string; content?: unknown }[]) : [];
      model2Calls.push(msgs.length);
      const toolMsg = msgs.find((m) => m._getType?.() === "tool");

      // Model 2 MUST receive the ToolMessage generated by Model 1's tool execution!
      expect(toolMsg).toBeDefined();
      expect(toolMsg?.content).toBe("Search results for: quantum computing");

      return new AIMessageChunk({
        content: "Final synthesized summary by Model 2 incorporating quantum computing research."
      });
    }
  }

  const primary = new MockPrimaryModel({});
  const secondary = new MockSecondaryModel({});
  const fallbackModel = new FallbackChatModel([primary, secondary]);

  const agent = createAgent({
    model: fallbackModel,
    tools: [searchTool],
    systemPrompt: "You are a research agent."
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: "Tell me about quantum computing" }]
  });

  // Verify: Tool was executed exactly ONCE
  expect(toolExecutedCount).toBe(1);

  // Model 1 was called twice (Turn 1: tool call, Turn 2: failed)
  expect(model1Calls).toHaveLength(2);

  // Model 2 was called once (Turn 2 fallback, seamlessly picking up the tool result)
  expect(model2Calls).toHaveLength(1);

  // Final message contains the output synthesized by Model 2
  const finalMessage = result.messages?.[result.messages.length - 1];
  expect(finalMessage?.content).toContain("Final synthesized summary by Model 2 incorporating quantum computing research.");
});

test("FallbackChatModel - works with providerStrategy structured outputs", async () => {
  const { createAgent, providerStrategy } = await import("langchain");
  const { BaseChatModel } = await import("@langchain/core/language_models/chat_models");
  const { z } = await import("zod");

  const testSchema = z.object({
    headline: z.string(),
    confidence: z.number()
  });

  class MockStructuredModel extends BaseChatModel {
    _llmType(): string { return "mock_structured"; }
    bindTools(): this { return this; }
    async _generate(_messages: BaseMessage[], _options?: unknown): Promise<ChatResult> {
      throw new Error("Unused");
    }
    override async invoke(_input: BaseLanguageModelInput): Promise<AIMessageChunk> {
      return new AIMessageChunk({
        content: JSON.stringify({ headline: "Breakthrough in AI", confidence: 0.98 })
      });
    }
  }

  const model = new MockStructuredModel({});
  const fallbackModel = new FallbackChatModel([model]);

  const agent = createAgent({
    model: fallbackModel,
    systemPrompt: "Structured extractor",
    responseFormat: providerStrategy(testSchema)
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: "Extract headline" }]
  });

  expect(result.structuredResponse).toEqual({
    headline: "Breakthrough in AI",
    confidence: 0.98
  });
});

test("normalizeResearchDossier - preserves pure markdown content", async () => {
  const { normalizeResearchDossier } = await import("../../lib/agents/utils");

  const markdown = `### 1. THE CATALYST & CORE METRICS (THE RECEIPTS)
- Discovered critical zero-day in core runtime.
- Affects 120,000 servers globally.

### 2. OPERATIONAL REALITY, TRADE-OFFS & LIMITATIONS (DEEP CONTEXT)
- Vendor confirms exploit requires physical console access.`;

  expect(normalizeResearchDossier(markdown)).toBe(markdown);
});

test("normalizeResearchDossier - strips wrapping markdown and json code fences", async () => {
  const { normalizeResearchDossier } = await import("../../lib/agents/utils");

  const fenced = "```markdown\n### 1. THE CATALYST\n- Fact\n```";
  expect(normalizeResearchDossier(fenced)).toBe("### 1. THE CATALYST\n- Fact");

  const jsonFenced = "```json\n{\"research_context\": \"### 1. THE CATALYST\\n- Fact\"}\n```";
  expect(normalizeResearchDossier(jsonFenced)).toBe("### 1. THE CATALYST\n- Fact");
});

test("normalizeResearchDossier - unwraps nested envelope object in stringified JSON", async () => {
  const { normalizeResearchDossier } = await import("../../lib/agents/utils");

  const stringifiedContext = JSON.stringify({
    research_context: "### 1. THE CATALYST\n- 500M users impacted",
  });
  expect(normalizeResearchDossier(stringifiedContext)).toBe("### 1. THE CATALYST\n- 500M users impacted");

  const stringifiedDossier = JSON.stringify({
    research_dossier: "### 1. TOPIC DOSSIER\n- Key metric: 95%",
  });
  expect(normalizeResearchDossier(stringifiedDossier)).toBe("### 1. TOPIC DOSSIER\n- Key metric: 95%");
});

test("normalizeResearchDossier - converts structured JSON payload to clean formatted markdown", async () => {
  const { normalizeResearchDossier } = await import("../../lib/agents/utils");

  const structuredPayload = JSON.stringify({
    the_catalyst: "A critical zero-day was disclosed by researchers.",
    core_metrics: [
      "CVE-2026-9999 with 10.0 CVSS score",
      "$2.4B market cap swing within 2 hours",
    ],
    counter_perspectives: "Maintainers claim upstream patches were merged before disclosure.",
  });

  const normalized = normalizeResearchDossier(structuredPayload);

  expect(normalized).toContain("### The Catalyst");
  expect(normalized).toContain("A critical zero-day was disclosed by researchers.");
  expect(normalized).toContain("### Core Metrics");
  expect(normalized).toContain("- CVE-2026-9999 with 10.0 CVSS score");
  expect(normalized).toContain("- $2.4B market cap swing within 2 hours");
  expect(normalized).toContain("### Counter Perspectives");
  expect(normalized).toContain("Maintainers claim upstream patches were merged before disclosure.");
});

test("normalizeResearchDossier - handles empty, null, or undefined values gracefully", async () => {
  const { normalizeResearchDossier } = await import("../../lib/agents/utils");

  expect(normalizeResearchDossier("")).toBe("");
  expect(normalizeResearchDossier(null)).toBe("");
  expect(normalizeResearchDossier(undefined)).toBe("");
  expect(normalizeResearchDossier("   ")).toBe("");
});

test("invokeWithFallbacks - fast-skips matching key_model combination when candidate fails with 429, allowing different model on same key", async () => {
  const { attachModelIdentity, modelCircuitBreaker } = await import("../../lib/agents/circuitBreaker");
  modelCircuitBreaker.reset();

  const model1Key1: FallbackRunnable = {
    invoke: vi.fn().mockRejectedValue({ status: 429, message: "Resource exhausted" }),
  };
  attachModelIdentity(model1Key1, { provider: "google", keyGroup: "GOOGLE_API_KEY", modelId: "gemini-3.8-flash" });

  const model1Key1Dup: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "should not be called" }),
  };
  attachModelIdentity(model1Key1Dup, { provider: "google", keyGroup: "GOOGLE_API_KEY", modelId: "gemini-3.8-flash" });

  const model2Key1: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "key 1 model 2 success" }),
  };
  attachModelIdentity(model2Key1, { provider: "google", keyGroup: "GOOGLE_API_KEY", modelId: "gemini-3.7-flash" });

  const result = await invokeWithFallbacks([model1Key1, model1Key1Dup, model2Key1], { prompt: "test" });

  expect(result).toEqual({ text: "key 1 model 2 success" });
  expect(model1Key1.invoke).toHaveBeenCalledTimes(1);
  expect(model1Key1Dup.invoke).not.toHaveBeenCalled(); // Fast-skipped in-flight!
  expect(model2Key1.invoke).toHaveBeenCalledTimes(1); // Same key but different model succeeded!
});

test("invokeWithFallbacks - fast-skips matching key_model combination when candidate fails with 503, allowing different model on same key", async () => {
  const { attachModelIdentity, modelCircuitBreaker } = await import("../../lib/agents/circuitBreaker");
  modelCircuitBreaker.reset();

  const model1Key1: FallbackRunnable = {
    invoke: vi.fn().mockRejectedValue({ status: 503, message: "The model is overloaded." }),
  };
  attachModelIdentity(model1Key1, { provider: "google", keyGroup: "GOOGLE_API_KEY", modelId: "gemini-3.8-flash" });

  const model1Key1Dup: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "should not be called" }),
  };
  attachModelIdentity(model1Key1Dup, { provider: "google", keyGroup: "GOOGLE_API_KEY", modelId: "gemini-3.8-flash" });

  const model2Key1: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "key 1 model 2 recovered" }),
  };
  attachModelIdentity(model2Key1, { provider: "google", keyGroup: "GOOGLE_API_KEY", modelId: "gemini-3.7-flash" });

  const result = await invokeWithFallbacks([model1Key1, model1Key1Dup, model2Key1], { prompt: "test" });

  expect(result).toEqual({ text: "key 1 model 2 recovered" });
  expect(model1Key1.invoke).toHaveBeenCalledTimes(1);
  expect(model1Key1Dup.invoke).not.toHaveBeenCalled(); // Fast-skipped in-flight!
  expect(model2Key1.invoke).toHaveBeenCalledTimes(1); // Same key but different model succeeded!
});

test("invokeWithFallbacks - fast-skips entire key when candidate fails with 401/403 auth error", async () => {
  const { attachModelIdentity, modelCircuitBreaker } = await import("../../lib/agents/circuitBreaker");
  modelCircuitBreaker.reset();

  const model1Key1: FallbackRunnable = {
    invoke: vi.fn().mockRejectedValue({ status: 401, message: "API key invalid" }),
  };
  attachModelIdentity(model1Key1, { provider: "google", keyGroup: "GOOGLE_API_KEY", modelId: "gemini-3.8-flash" });

  const model2Key1: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "should not be called" }),
  };
  attachModelIdentity(model2Key1, { provider: "google", keyGroup: "GOOGLE_API_KEY", modelId: "gemini-3.7-flash" });

  const model1Key2: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "key 2 success" }),
  };
  attachModelIdentity(model1Key2, { provider: "google", keyGroup: "GOOGLE_API_KEY2", modelId: "gemini-3.8-flash" });

  const result = await invokeWithFallbacks([model1Key1, model2Key1, model1Key2], { prompt: "test" });

  expect(result).toEqual({ text: "key 2 success" });
  expect(model1Key1.invoke).toHaveBeenCalledTimes(1);
  expect(model2Key1.invoke).not.toHaveBeenCalled(); // Fast-skipped because 401 trips whole key!
  expect(model1Key2.invoke).toHaveBeenCalledTimes(1);
});

test("invokeWithFallbacks - skips model only on 500 server error, trying different model on same key", async () => {
  const { attachModelIdentity, modelCircuitBreaker } = await import("../../lib/agents/circuitBreaker");
  modelCircuitBreaker.reset();

  const gemini38Key1: FallbackRunnable = {
    invoke: vi.fn().mockRejectedValue({ status: 500, message: "Internal Server Error" }),
  };
  attachModelIdentity(gemini38Key1, { provider: "google", keyGroup: "GOOGLE_API_KEY", modelId: "gemini-3.8-flash" });

  const gemini38Key2: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "should be skipped due to same model" }),
  };
  attachModelIdentity(gemini38Key2, { provider: "google", keyGroup: "GOOGLE_API_KEY2", modelId: "gemini-3.8-flash" });

  const gemini37Key1: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "gemini 3.7 on key 1 success" }),
  };
  attachModelIdentity(gemini37Key1, { provider: "google", keyGroup: "GOOGLE_API_KEY", modelId: "gemini-3.7-flash" });

  const result = await invokeWithFallbacks([gemini38Key1, gemini38Key2, gemini37Key1], { prompt: "test" });

  expect(result).toEqual({ text: "gemini 3.7 on key 1 success" });
  expect(gemini38Key1.invoke).toHaveBeenCalledTimes(1);
  expect(gemini38Key2.invoke).not.toHaveBeenCalled(); // gemini-3.8-flash skipped!
  expect(gemini37Key1.invoke).toHaveBeenCalledTimes(1); // gemini-3.7-flash on Key 1 succeeded!
});

test("invokeWithFallbacks - fails open when all candidates in fallback array are tripped", async () => {
  const { attachModelIdentity, modelCircuitBreaker } = await import("../../lib/agents/circuitBreaker");
  modelCircuitBreaker.reset();

  const candidate1: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "trial probe success" }),
  };
  attachModelIdentity(candidate1, { provider: "google", keyGroup: "GOOGLE_API_KEY", modelId: "gemini-3.8-flash" });

  // Pre-trip the key
  modelCircuitBreaker.recordFailure(
    { provider: "google", keyGroup: "GOOGLE_API_KEY", modelId: "gemini-3.8-flash" },
    { status: 429, message: "Quota exceeded" }
  );

  // Even though candidate1 is tripped, all candidates in array are tripped, so it fails open
  const result = await invokeWithFallbacks([candidate1], { prompt: "test" });
  expect(result).toEqual({ text: "trial probe success" });
  expect(candidate1.invoke).toHaveBeenCalledTimes(1);
});

// ==========================================
// Monotonic Critic Refinement Utilities Tests
// ==========================================

test("reconcileSurgicalDraft - pins unflagged posts character-for-character when model returns revised full array", () => {
  const previousDraft = [
    "Post 1: Original perfect hook.",
    "Post 2: Weak middle content that needs more tension.",
    "Post 3: Solid CTA closer.",
  ];

  // Model rephrases post 1 slightly (collateral regression) and changes post 2
  const candidateDraft = [
    "Post 1: Slightly reworded hook that drifted.",
    "Post 2: High-stakes tension rewrite that fixes the problem.",
    "Post 3: Reworded closer.",
  ];

  const flaggedIndices = [2]; // Only post 2 was critiqued
  const reconciled = reconcileSurgicalDraft(previousDraft, candidateDraft, flaggedIndices);

  // Post 1 and Post 3 MUST remain exact character-for-character copies of previousDraft
  expect(reconciled[0]).toBe(previousDraft[0]);
  expect(reconciled[1]).toBe(candidateDraft[1]);
  expect(reconciled[2]).toBe(previousDraft[2]);
});

test("reconcileSurgicalDraft - handles model returning only revised posts corresponding to flagged count", () => {
  const previousDraft = [
    "Post 1: Hook",
    "Post 2: Flawed post",
    "Post 3: Flawed post 2",
    "Post 4: Strong closer",
  ];

  // Model returns an array of only 2 posts (for the 2 flagged positions)
  const candidateDraft = [
    "Post 2: Fixed version",
    "Post 3: Fixed version",
  ];

  const flaggedIndices = [2, 3];
  const reconciled = reconcileSurgicalDraft(previousDraft, candidateDraft, flaggedIndices);

  expect(reconciled[0]).toBe("Post 1: Hook");
  expect(reconciled[1]).toBe("Post 2: Fixed version");
  expect(reconciled[2]).toBe("Post 3: Fixed version");
  expect(reconciled[3]).toBe("Post 4: Strong closer");
});

test("reconcileSurgicalDraft - edge cases: empty inputs, out-of-bounds, all flagged", () => {
  const previousDraft = ["Post 1", "Post 2"];

  // Empty previous draft
  expect(reconcileSurgicalDraft([], ["New 1"], [1])).toEqual(["New 1"]);
  expect(reconcileSurgicalDraft(undefined, ["New 1"], [1])).toEqual(["New 1"]);

  // Empty candidate draft
  expect(reconcileSurgicalDraft(previousDraft, [], [1])).toEqual(previousDraft);
  expect(reconcileSurgicalDraft(previousDraft, undefined, [1])).toEqual(previousDraft);

  // Empty or invalid flagged indices
  expect(reconcileSurgicalDraft(previousDraft, ["New 1", "New 2"], [])).toEqual(previousDraft);
  expect(reconcileSurgicalDraft(previousDraft, ["New 1", "New 2"], [99])).toEqual(previousDraft);

  // All flagged and full candidate provided
  const allFlagged = reconcileSurgicalDraft(previousDraft, ["New 1", "New 2"], [1, 2]);
  expect(allFlagged).toEqual(["New 1", "New 2"]);
});

test("calculateMonotonicScore - guarantees Score_N >= Score_{N-1} and passes >= 88 on full resolution", () => {
  // Case 1: All issues resolved with 0 platform violations -> guaranteed >= 88
  const fullResolution = calculateMonotonicScore({
    previousScore: 72,
    suggestedScore: 75,
    totalIssues: 3,
    resolvedCount: 3,
    hasNewViolations: false,
  });
  expect(fullResolution).toBeGreaterThanOrEqual(88);
  expect(fullResolution).toBe(88);

  // Case 2: Full resolution with already high previous score adds +10 floor
  const highResolution = calculateMonotonicScore({
    previousScore: 85,
    totalIssues: 1,
    resolvedCount: 1,
    hasNewViolations: false,
  });
  expect(highResolution).toBe(95);

  // Case 3: Monotonic floor prevents score decay even if critic suggests lower score
  const scoreDecayBlocked = calculateMonotonicScore({
    previousScore: 84,
    suggestedScore: 70, // Critic got stricter
    totalIssues: 2,
    resolvedCount: 1,
  });
  expect(scoreDecayBlocked).toBeGreaterThanOrEqual(84);

  // Case 4: Partial resolution scales proportionally
  const partialResolution = calculateMonotonicScore({
    previousScore: 70,
    totalIssues: 4,
    resolvedCount: 2, // 50% resolved -> +8 bonus
  });
  expect(partialResolution).toBe(78);

  // Case 5: Maximum cap is 100
  const maxCap = calculateMonotonicScore({
    previousScore: 96,
    suggestedScore: 105,
    totalIssues: 1,
    resolvedCount: 1,
  });
  expect(maxCap).toBe(100);
});

test("parseFlaggedPostIndicesFromErrors - extracts unique post indices from validation critique", () => {
  const errorText = "Post 1 exceeds 500 characters. Post #3 has invalid markup. Post 1 is too verbose.";
  const indices = parseFlaggedPostIndicesFromErrors(errorText);
  expect(indices).toEqual([1, 3]);

  expect(parseFlaggedPostIndicesFromErrors("General formatting failure")).toEqual([]);
  expect(parseFlaggedPostIndicesFromErrors("")).toEqual([]);
});

test("buildSurgicalWriterContext - constructs surgical prompt with pinned unflagged posts", () => {
  const draft = ["Hook post", "Body post", "Closer post"];
  const context = buildSurgicalWriterContext(draft, [2]);

  expect(context.isSurgical).toBe(true);
  expect(context.pinnedIndices).toEqual([1, 3]);
  expect(context.pinnedPostsContext).toContain("<PINNED_POSTS>");
  expect(context.pinnedPostsContext).toContain('Post 1 (PINNED - DO NOT MODIFY):\n"Hook post"');
  expect(context.pinnedPostsContext).toContain('Post 3 (PINNED - DO NOT MODIFY):\n"Closer post"');
  expect(context.pinnedPostsContext).toContain("SURGICAL REWRITE DIRECTIVE: You must revise ONLY the flagged posts (Post 2)");

  // When all posts are flagged, isSurgical should be false
  const allFlagged = buildSurgicalWriterContext(draft, [1, 2, 3]);
  expect(allFlagged.isSurgical).toBe(false);
  expect(allFlagged.pinnedPostsContext).toBe("");
});

test("reconcileSurgicalDraft - handles explicitly labeled posts and respects whitespace fallbacks", () => {
  const previousDraft = ["Hook 1", "Body 2", "Closer 3"];
  // Candidate provides labeled rewrite for post 2 and whitespace for post 3
  const candidateDraft = ["Post 2: Revised Body 2", "   "];
  const result = reconcileSurgicalDraft(previousDraft, candidateDraft, [2, 3]);

  expect(result[0]).toBe("Hook 1");
  expect(result[1]).toBe("Post 2: Revised Body 2");
  expect(result[2]).toBe("Closer 3"); // Whitespace candidate falls back to original
});

test("reconcileSurgicalDraft - candidate draft shorter than previous draft but closer to full thread correctly maps by position", () => {
  const previousDraft = ["Post 1 (Hook)", "Post 2 (Body 1)", "Post 3 (Body 2)", "Post 4 (Body 3)", "Post 5 (Closer)"];
  // Post 2 flagged. Candidate model outputs 4 posts (closer to full thread of 5 than flagged of 1):
  const candidateDraft = ["Post 1 (Hook)", "Post 2 (Body 1 REVISED)", "Post 3 (Body 2)", "Post 4 (Body 3)"];
  const result = reconcileSurgicalDraft(previousDraft, candidateDraft, [2]);

  expect(result[0]).toBe("Post 1 (Hook)");
  expect(result[1]).toBe("Post 2 (Body 1 REVISED)");
  expect(result[2]).toBe("Post 3 (Body 2)");
  expect(result[3]).toBe("Post 4 (Body 3)");
  expect(result[4]).toBe("Post 5 (Closer)"); // Unflagged closer retained from previous draft
});

test("filterActionablePostCritiques - discards critiques with status resolved", () => {
  const critiques = [
    { post_index: 1, critique: "Hook is weak", fix_directive: "Add metrics", status: "open" as const },
    { post_index: 2, critique: "Had an em dash", fix_directive: "Remove em dash", status: "resolved" as const },
    { post_index: 3, critique: "Pacing drags", fix_directive: "Shorten sentences", status: "unresolved" as const },
  ];

  const actionable = filterActionablePostCritiques(critiques);
  expect(actionable).toHaveLength(2);
  expect(actionable.map((a) => a.post_index)).toEqual([1, 3]);
  expect(actionable.some((a) => a.post_index === 2)).toBe(false);
});

test("calculateMonotonicScore - passes cleanly when totalIssues is 0 and no violations", () => {
  const cleanScore = calculateMonotonicScore({
    previousScore: 80,
    suggestedScore: 92,
    totalIssues: 0,
    resolvedCount: 0,
    hasNewViolations: false,
  });

  expect(cleanScore).toBeGreaterThanOrEqual(88);
  expect(cleanScore).toBe(92);
});

test("calculateMonotonicScore - strictly bounds score < 85 when issues remain unresolved despite high suggestedScore", () => {
  // Even if the LLM suggests 98, unresolved issues MUST NOT pass the thread (capped at 84)
  const scoreWithUnresolved = calculateMonotonicScore({
    previousScore: 70,
    suggestedScore: 98,
    totalIssues: 2,
    resolvedCount: 1, // Only 1 of 2 resolved
    hasNewViolations: false,
  });
  expect(scoreWithUnresolved).toBeLessThanOrEqual(84);
  expect(scoreWithUnresolved).toBe(84);

  // New platform violations also block crossing threshold
  const scoreWithNewViolations = calculateMonotonicScore({
    previousScore: 75,
    suggestedScore: 92,
    totalIssues: 1,
    resolvedCount: 1,
    hasNewViolations: true,
  });
  expect(scoreWithNewViolations).toBeLessThan(85);
});

test("processDifferentialEvaluation - enforces Closed-World invariant and drops illegal/out-of-bounds violations", () => {
  const previousDraft = ["Hook 1", "Body 2", "Closer 3"];
  const priorActionable = [
    { post_index: 2, critique: "Pacing drags", fix_directive: "Cut filler words", status: "open" as const },
  ];

  const evalResult = processDifferentialEvaluation({
    threadDraft: previousDraft,
    iterations: 1,
    previousScore: 75,
    priorActionableCritiques: priorActionable,
    structuredResponse: {
      overall_critique: "Evaluated revision.",
      issue_evaluations: [
        {
          post_index: 2,
          prior_issue: "Pacing drags",
          status: "resolved",
          reasoning: "Removed filler words.",
        },
        // The critic tries to evaluate unflagged post 1 (Evaluation Amnesia / Whack-A-Mole breach):
        {
          post_index: 1,
          prior_issue: "New complaint on post 1",
          status: "unresolved",
          reasoning: "I don't like the style anymore.",
        },
      ],
      new_violations: [
        // Out-of-bounds violation:
        { post_index: 99, violation_type: "url", critique: "Out of bounds" },
        // Disallowed subjective violation type:
        { post_index: 2, violation_type: "tone", critique: "Tone is too informal" },
      ],
      suggested_score: 82,
    },
  });

  // Post 1 complaint is dropped (Pillar 2 Closed-World constraint)
  // Out-of-bounds post 99 violation is dropped
  // Subjective "tone" violation is dropped
  // Result: all legitimate issues resolved, thread approved!
  expect(evalResult.is_approved).toBe(true);
  expect(evalResult.virality_score).toBeGreaterThanOrEqual(88);
  expect(evalResult.post_critiques).toEqual([]);
  expect(evalResult.audit_history).toHaveLength(1);
  expect(evalResult.audit_history[0].post_critiques[0].status).toBe("resolved");
});

test("reconcileSurgicalDraft - handles mixed labeled and unlabeled candidate posts in arbitrary order without collisions", () => {
  const previousDraft = ["Post 1 (Hook)", "Post 2 (Body 1)", "Post 3 (Body 2)", "Post 4 (Body 3)", "Post 5 (Closer)"];
  // Posts 2 and 4 flagged. Candidate returns Post 4 labeled first, followed by an unlabeled rewrite for Post 2:
  const candidateDraft = ["Post 4: New Closer/Body 3", "New Body 1 rewrite"];
  const result = reconcileSurgicalDraft(previousDraft, candidateDraft, [2, 4]);

  expect(result[0]).toBe("Post 1 (Hook)");
  expect(result[1]).toBe("New Body 1 rewrite");
  expect(result[2]).toBe("Post 3 (Body 2)");
  expect(result[3]).toBe("Post 4: New Closer/Body 3");
  expect(result[4]).toBe("Post 5 (Closer)");
});

test("processDifferentialEvaluation - does not flag false positive violation if critique mentions em dash but postText is clean", () => {
  const previousDraft = ["Clean hook without dashes", "Clean body without dashes"];
  const priorActionable = [
    { post_index: 2, critique: "Pacing drags", fix_directive: "Cut filler", status: "open" as const },
  ];

  const evalResult = processDifferentialEvaluation({
    threadDraft: previousDraft,
    iterations: 1,
    previousScore: 78,
    priorActionableCritiques: priorActionable,
    structuredResponse: {
      overall_critique: "Evaluated.",
      issue_evaluations: [
        {
          post_index: 2,
          prior_issue: "Pacing drags",
          status: "resolved",
          reasoning: "Removed filler.",
        },
      ],
      new_violations: [
        {
          post_index: 2,
          violation_type: "em_dash",
          critique: "Make sure you do not use em dashes — keep text punchy.", // Critic used an em dash in explanation!
        },
      ],
      suggested_score: 90,
    },
  });

  // postText is clean, so critic hallucination/explanation is not treated as genuine violation
  expect(evalResult.is_approved).toBe(true);
  expect(evalResult.post_critiques).toEqual([]);
});

test("processDifferentialEvaluation - verifies banned_phrase violations", () => {
  const threadDraft = ["Hook without engagement bait", "Retweet this if you agree! a thread 🧵"];
  const evalResult = processDifferentialEvaluation({
    threadDraft,
    iterations: 1,
    previousScore: 82,
    priorActionableCritiques: [],
    structuredResponse: {
      overall_critique: "Introduced banned phrases",
      issue_evaluations: [],
      new_violations: [
        {
          post_index: 2,
          violation_type: "banned_phrase",
          critique: "Contains engagement bait",
        },
      ],
      suggested_score: 70,
    },
  });

  expect(evalResult.post_critiques).toHaveLength(1);
  expect(evalResult.post_critiques[0].critique).toContain("banned_phrase");
  expect(evalResult.virality_score).toBeLessThan(85);
  expect(evalResult.is_approved).toBe(false);
});

test("processDifferentialEvaluation - merges multiple genuine violations on the same post", () => {
  const threadDraft = ["Hook without issues", "Post 2 has an em dash — and a thread 🧵"];
  const evalResult = processDifferentialEvaluation({
    threadDraft,
    iterations: 1,
    previousScore: 80,
    priorActionableCritiques: [],
    structuredResponse: {
      overall_critique: "Multiple violations on post 2",
      issue_evaluations: [],
      new_violations: [
        {
          post_index: 2,
          violation_type: "em_dash",
          critique: "Has an em dash",
        },
        {
          post_index: 2,
          violation_type: "banned_phrase",
          critique: "Has engagement bait",
        },
      ],
      suggested_score: 65,
    },
  });

  // Both violations should be merged into a single entry for post 2
  expect(evalResult.post_critiques).toHaveLength(1);
  expect(evalResult.post_critiques[0].post_index).toBe(2);
  expect(evalResult.post_critiques[0].critique).toContain("em_dash");
  expect(evalResult.post_critiques[0].critique).toContain("banned_phrase");
  expect(evalResult.is_approved).toBe(false);
});

test("calculateMonotonicScore - handles NaN, infinite, and negative inputs safely", () => {
  const result1 = calculateMonotonicScore({
    previousScore: NaN,
    suggestedScore: NaN,
    totalIssues: -5,
    resolvedCount: -2,
  });
  expect(Number.isFinite(result1)).toBe(true);
  expect(result1).toBeGreaterThanOrEqual(70);

  const result2 = calculateMonotonicScore({
    previousScore: 80,
    suggestedScore: Infinity,
    totalIssues: 0,
    resolvedCount: 0,
    hasNewViolations: false,
  });
  expect(result2).toBe(90); // 80 + 10 = 90
});

test("parseFlaggedPostIndicesFromErrors - extracts indices from plural and relief valve error strings", () => {
  const text1 = "Post 2 and Post 3 exceed 280 characters. Post #4 contains markdown.";
  expect(parseFlaggedPostIndicesFromErrors(text1)).toEqual([2, 3, 4]);

  const text2 = "Thread contains 4 posts over 280 characters. Posts exceeding 280 characters: Post 2, Post 4, Post 5.";
  expect(parseFlaggedPostIndicesFromErrors(text2)).toEqual([2, 4, 5]);

  const text3 = "No posts flagged.";
  expect(parseFlaggedPostIndicesFromErrors(text3)).toEqual([]);
});

test("processDifferentialEvaluation - validates expanded banned phrases and formatting markdown", () => {
  expect(BANNED_ENGAGEMENT_PHRASES).toContain("in today's fast-paced world");
  expect(BANNED_ENGAGEMENT_PHRASES).toContain("key takeaway");

  const thread = [
    "Hook post with high density",
    "In today's fast-paced world we must look at the key takeaway.",
    "This post has __bold text__ and `code snippet`.",
  ];

  const evalResult = processDifferentialEvaluation({
    threadDraft: thread,
    iterations: 1,
    previousScore: 78,
    priorActionableCritiques: [],
    structuredResponse: {
      overall_critique: "New platform violations detected",
      issue_evaluations: [],
      new_violations: [
        {
          post_index: 2,
          violation_type: "banned_phrase",
          critique: "Contains 'in today's fast-paced world' and 'key takeaway'",
        },
        {
          post_index: 3,
          violation_type: "formatting",
          critique: "Contains markdown formatting (__ and `)",
        },
      ],
      suggested_score: 70,
    },
  });

  expect(evalResult.post_critiques).toHaveLength(2);
  expect(evalResult.post_critiques[0].post_index).toBe(2);
  expect(evalResult.post_critiques[1].post_index).toBe(3);
  expect(evalResult.is_approved).toBe(false);
});

test("extractSelectedHook - extracts trimmed hook from multiple input formats", () => {
  expect(extractSelectedHook("  Hook string with spaces  ")).toBe("Hook string with spaces");
  expect(extractSelectedHook({ selected_hook: "  Snake case hook  " })).toBe("Snake case hook");
  expect(extractSelectedHook({ selectedHook: "  Camel case hook  " })).toBe("Camel case hook");
  expect(extractSelectedHook({ hook: "  Generic hook  " })).toBe("Generic hook");
  expect(extractSelectedHook({ hookText: "  Hook text property  " })).toBe("Hook text property");
  expect(extractSelectedHook(42)).toBe("42");
  expect(extractSelectedHook(null)).toBe("");
  expect(extractSelectedHook(undefined)).toBe("");
});






