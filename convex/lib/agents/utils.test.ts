/// <reference types="vite/client" />
import { expect, test, vi, afterEach } from "vitest";
import { invokeWithFallbacks, FallbackRunnable } from "./utils";

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
  const { withTimeout } = await import("./utils");
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

test("buildAgents - passes actual model instances to createAgent instead of extracting model name strings", async () => {
  const { buildAgents, withTimeout } = await import("./utils");
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

  expect(agents).toHaveLength(2);
  // Check that the second agent wrapper holds timeout 45000 and has runnable
  expect((agents[1] as { timeout: number }).timeout).toBe(45000);
});

test("normalizeResearchDossier - preserves pure markdown content", async () => {
  const { normalizeResearchDossier } = await import("./utils");

  const markdown = `### 1. THE CATALYST & CORE METRICS (THE RECEIPTS)
- Discovered critical zero-day in core runtime.
- Affects 120,000 servers globally.

### 2. THE STEEL-MANNED COUNTER-PERSPECTIVES (The Defense)
- Vendor argues exploit requires physical console access.`;

  expect(normalizeResearchDossier(markdown)).toBe(markdown);
});

test("normalizeResearchDossier - strips wrapping markdown and json code fences", async () => {
  const { normalizeResearchDossier } = await import("./utils");

  const fenced = "```markdown\n### 1. THE CATALYST\n- Fact\n```";
  expect(normalizeResearchDossier(fenced)).toBe("### 1. THE CATALYST\n- Fact");

  const jsonFenced = "```json\n{\"research_context\": \"### 1. THE CATALYST\\n- Fact\"}\n```";
  expect(normalizeResearchDossier(jsonFenced)).toBe("### 1. THE CATALYST\n- Fact");
});

test("normalizeResearchDossier - unwraps nested envelope object in stringified JSON", async () => {
  const { normalizeResearchDossier } = await import("./utils");

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
  const { normalizeResearchDossier } = await import("./utils");

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
  const { normalizeResearchDossier } = await import("./utils");

  expect(normalizeResearchDossier("")).toBe("");
  expect(normalizeResearchDossier(null)).toBe("");
  expect(normalizeResearchDossier(undefined)).toBe("");
  expect(normalizeResearchDossier("   ")).toBe("");
});

test("invokeWithFallbacks - fast-skips matching key_model combination when candidate fails with 429, allowing different model on same key", async () => {
  const { attachModelIdentity, modelCircuitBreaker } = await import("./circuitBreaker");
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
  const { attachModelIdentity, modelCircuitBreaker } = await import("./circuitBreaker");
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
  const { attachModelIdentity, modelCircuitBreaker } = await import("./circuitBreaker");
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
  const { attachModelIdentity, modelCircuitBreaker } = await import("./circuitBreaker");
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
  const { attachModelIdentity, modelCircuitBreaker } = await import("./circuitBreaker");
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


