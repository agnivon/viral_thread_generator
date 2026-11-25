"use node";
import { z } from "zod";
import { ChatGoogle } from "@langchain/google";
import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatOpenAI } from "@langchain/openai";
import { ChatDeepSeek } from "@langchain/deepseek";
import { attachModelIdentity } from "./circuitBreaker.js";
import { withTimeout } from "./utils.js";

type GoogleOverrides = Omit<NonNullable<ConstructorParameters<typeof ChatGoogle>[0]>, "model" | "modelName" | "temperature" | "maxRetries" | "apiKey">;
type OpenAIOverrides = Omit<NonNullable<ConstructorParameters<typeof ChatOpenAI>[0]>, "model" | "modelName" | "temperature" | "maxRetries" | "apiKey">;
type DeepSeekOverrides = Omit<NonNullable<ConstructorParameters<typeof ChatDeepSeek>[0]>, "model" | "modelName" | "temperature" | "maxRetries" | "apiKey">;

const createGoogleModel = (model: string, temperature: number, apiKeyEnv: string, overrides: GoogleOverrides = {}) =>
  attachModelIdentity(
    new ChatGoogle({ model, temperature, maxRetries: 0, apiKey: process.env[apiKeyEnv], ...overrides }),
    { provider: "google", keyGroup: apiKeyEnv, modelId: model }
  );

const createOpenAIModel = (model: string, temperature: number, overrides: OpenAIOverrides = {}) =>
  attachModelIdentity(
    new ChatOpenAI({ model, temperature, maxRetries: 0, apiKey: process.env.OPENAI_API_KEY, ...overrides }),
    { provider: "openai", keyGroup: "OPENAI_API_KEY", modelId: model }
  );

/**
 * Factory for ChatDeepSeek instances.
 *
 * Structured DeepSeek variants MUST set `modelKwargs.response_format: { type: "json_object" }`:
 * - DeepSeek does not support `json_schema` response_format emitted by `createAgent`'s `providerStrategy`.
 * - `ChatOpenAICompletions.invocationParams` spreads `...this.modelKwargs` AFTER `options.response_format`,
 *   overriding `json_schema` with `json_object` while keeping reasoning isolated in `additional_kwargs.reasoning_content`.
 * - Unstructured text/Markdown models (`deepSeekFlashT01ReasoningNone`, `deepSeekFlashT01TextReasoningHigh`)
 *   MUST omit `response_format` (enforced by `convex/__tests__/agents/nodes.test.ts`).
 */
const createDeepSeekModel = (model: string, temperature: number, overrides: DeepSeekOverrides = {}) =>
  attachModelIdentity(
    new ChatDeepSeek({ model, temperature, maxRetries: 0, apiKey: process.env.DEEPSEEK_API_KEY || "placeholder", ...overrides }),
    { provider: "deepseek", keyGroup: "DEEPSEEK_API_KEY", modelId: model }
  );

// ScraperNode Models (lightweight thinking enabled)
export const googleGemini31FlashLiteT01Key1 = createGoogleModel("gemini-3.1-flash-lite", 0.1, "GOOGLE_API_KEY", { thinkingLevel: "low" });
export const googleGemini31FlashLiteT01Key2 = createGoogleModel("gemini-3.1-flash-lite", 0.1, "GOOGLE_API_KEY2", { thinkingLevel: "low" });
export const googleGemini35FlashLiteT01Key1 = createGoogleModel("gemini-3.5-flash-lite", 0.1, "GOOGLE_API_KEY", { thinkingLevel: "low" });
export const googleGemini35FlashLiteT01Key2 = createGoogleModel("gemini-3.5-flash-lite", 0.1, "GOOGLE_API_KEY2", { thinkingLevel: "low" });
export const deepSeekFlashT01ReasoningNone = createDeepSeekModel("deepseek-flash", 0.1, { reasoning: { effort: "none" }, modelKwargs: { thinking: { type: "disabled" } } });
export const deepSeekFlashT01JsonReasoningNone = createDeepSeekModel("deepseek-flash", 0.1, { reasoning: { effort: "none" }, modelKwargs: { thinking: { type: "disabled" }, response_format: { type: "json_object" } } });
export const openRouterFreeT01 = attachModelIdentity(
  new ChatOpenRouter({
    model: "openrouter/free",
    temperature: 0.1,
    maxRetries: 0,
    apiKey: process.env.OPENROUTER_API_KEY || "placeholder",
  }),
  { provider: "openrouter", keyGroup: "OPENROUTER_API_KEY", modelId: "openrouter/free" }
);

// HookStrategistNode Models (thinking enabled for sharper delta synthesis and claim checks)
export const googleGemini31FlashLiteT08Key1 = createGoogleModel("gemini-3.1-flash-lite", 0.8, "GOOGLE_API_KEY", { thinkingLevel: "medium" });
export const googleGemini31FlashLiteT08Key2 = createGoogleModel("gemini-3.1-flash-lite", 0.8, "GOOGLE_API_KEY2", { thinkingLevel: "medium" });
export const googleGemini35FlashLiteT08Key1 = createGoogleModel("gemini-3.5-flash-lite", 0.8, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini35FlashLiteT08Key2 = createGoogleModel("gemini-3.5-flash-lite", 0.8, "GOOGLE_API_KEY2", { thinkingLevel: "high" });
export const deepSeekFlashT08ReasoningNone = createDeepSeekModel("deepseek-flash", 0.8, { reasoning: { effort: "none" }, modelKwargs: { thinking: { type: "disabled" }, response_format: { type: "json_object" } } });
export const openRouterFreeT08 = attachModelIdentity(
  new ChatOpenRouter({
    model: "openrouter/free",
    temperature: 0.8,
    maxRetries: 0,
    apiKey: process.env.OPENROUTER_API_KEY || "placeholder",
  }),
  { provider: "openrouter", keyGroup: "OPENROUTER_API_KEY", modelId: "openrouter/free" }
);

// Clickbait Extraction, Angle & Hook Models with Thinking / Reasoning
export const googleGemini38FlashT01ThinkingKey1 = createGoogleModel("gemini-3.8-flash", 0.1, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini38FlashT01ThinkingKey2 = createGoogleModel("gemini-3.8-flash", 0.1, "GOOGLE_API_KEY2", { thinkingLevel: "high" });
export const googleGemini36FlashT01ThinkingKey1 = createGoogleModel("gemini-3.6-flash", 0.1, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini36FlashT01ThinkingKey2 = createGoogleModel("gemini-3.6-flash", 0.1, "GOOGLE_API_KEY2", { thinkingLevel: "high" });
export const googleGemini35FlashLiteT01ThinkingKey1 = createGoogleModel("gemini-3.5-flash-lite", 0.1, "GOOGLE_API_KEY", { thinkingLevel: "low" });
export const googleGemini35FlashLiteT01ThinkingKey2 = createGoogleModel("gemini-3.5-flash-lite", 0.1, "GOOGLE_API_KEY2", { thinkingLevel: "low" });
// DeepSeek thinking unstructured text vs. JSON-constrained variants (see nodes.test.ts)
export const deepSeekFlashT01ReasoningHigh = createDeepSeekModel("deepseek-flash", 0.1, { reasoning: { effort: "high" }, modelKwargs: { thinking: { type: "enabled" }, response_format: { type: "json_object" } } });
export const deepSeekFlashT01TextReasoningHigh = createDeepSeekModel("deepseek-flash", 0.1, { reasoning: { effort: "high" }, modelKwargs: { thinking: { type: "enabled" } } });

export const googleGemini38FlashT08ThinkingKey1 = createGoogleModel("gemini-3.8-flash", 0.8, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini38FlashT08ThinkingKey2 = createGoogleModel("gemini-3.8-flash", 0.8, "GOOGLE_API_KEY2", { thinkingLevel: "high" });
export const googleGemini36FlashT08ThinkingKey1 = createGoogleModel("gemini-3.6-flash", 0.8, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini36FlashT08ThinkingKey2 = createGoogleModel("gemini-3.6-flash", 0.8, "GOOGLE_API_KEY2", { thinkingLevel: "high" });
export const deepSeekFlashT08ReasoningHigh = createDeepSeekModel("deepseek-flash", 0.8, { reasoning: { effort: "high" }, modelKwargs: { thinking: { type: "enabled" }, response_format: { type: "json_object" } } });

// ThreadWriterNode Models
export const googleGemini4HydrogenT08Key1 = createGoogleModel("gemini-4-hydrogen", 0.8, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini4HydrogenT08Key2 = createGoogleModel("gemini-4-hydrogen", 0.8, "GOOGLE_API_KEY2", { thinkingLevel: "high" });
export const googleGemini38FlashT08Key1 = createGoogleModel("gemini-3.8-flash", 0.8, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini38FlashT08Key2 = createGoogleModel("gemini-3.8-flash", 0.8, "GOOGLE_API_KEY2", { thinkingLevel: "high" });
export const googleGemini36FlashT08Key1 = createGoogleModel("gemini-3.6-flash", 0.8, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini36FlashT08Key2 = createGoogleModel("gemini-3.6-flash", 0.8, "GOOGLE_API_KEY2", { thinkingLevel: "high" });
export const deepSeekFlashT085ReasoningHigh = createDeepSeekModel("deepseek-flash", 0.85, { reasoning: { effort: "high" }, modelKwargs: { thinking: { type: "enabled" }, response_format: { type: "json_object" } } });
export const deepSeekFlashT085ReasoningNone = createDeepSeekModel("deepseek-flash", 0.85, { reasoning: { effort: "none" }, modelKwargs: { thinking: { type: "disabled" }, response_format: { type: "json_object" } } });
export const openAiGpt54T08Penalty04 = createOpenAIModel("gpt-5.4", 0.8, { presencePenalty: 0.4 });
export const googleGemma426bT08Key1 = createGoogleModel("gemma-4-26b-a4b-it", 0.8, "GOOGLE_API_KEY");
export const googleGemma426bT08Key2 = createGoogleModel("gemma-4-26b-a4b-it", 0.8, "GOOGLE_API_KEY2");
export const googleGemini3FlashPreviewT08Key1 = createGoogleModel("gemini-3-flash-preview", 0.8, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini3FlashPreviewT08Key2 = createGoogleModel("gemini-3-flash-preview", 0.8, "GOOGLE_API_KEY2", { thinkingLevel: "high" });

export const threadWriterSchema = z.object({
  thread_draft: z.array(z.string()).min(1, "Must generate at least one post for the thread draft")
});

/**
 * Direct `withStructuredOutput` candidates for thread writing:
 * - Gemini models with thinking enabled (`thinkingLevel: "high"`) MUST use `method: "functionCalling"`:
 *   `jsonSchema`/`jsonMode` parse `BaseMessage.text`, which concatenates `{ thought: true }` blocks and breaks JSON parsing.
 * - DeepSeek models with thinking enabled (`thinking: { type: "enabled" }`) MUST use `method: "jsonMode"`
 *   (paired with `modelKwargs.response_format: { type: "json_object" }` and prompt JSON instructions):
 *   DeepSeek lacks `json_schema` and rejects forced named `tool_choice` (`functionCalling`) under thinking mode.
 * - Every candidate carries its own explicit `withTimeout` window so slow/hung calls never starve fallbacks.
 */
export const threadWriterModelCandidates = [
  withTimeout(googleGemini4HydrogenT08Key1.withStructuredOutput(threadWriterSchema, { name: "thread_writer", method: "functionCalling" }), 60000),
  withTimeout(googleGemini4HydrogenT08Key2.withStructuredOutput(threadWriterSchema, { name: "thread_writer", method: "functionCalling" }), 60000),
  withTimeout(googleGemini38FlashT08Key1.withStructuredOutput(threadWriterSchema, { name: "thread_writer", method: "functionCalling" }), 60000),
  withTimeout(googleGemini38FlashT08Key2.withStructuredOutput(threadWriterSchema, { name: "thread_writer", method: "functionCalling" }), 60000),
  withTimeout(googleGemini36FlashT08Key1.withStructuredOutput(threadWriterSchema, { name: "thread_writer", method: "functionCalling" }), 90000),
  withTimeout(googleGemini36FlashT08Key2.withStructuredOutput(threadWriterSchema, { name: "thread_writer", method: "functionCalling" }), 90000),
  withTimeout(deepSeekFlashT085ReasoningHigh.withStructuredOutput(threadWriterSchema, { name: "thread_writer", method: "jsonMode" }), 90000),
  withTimeout(openAiGpt54T08Penalty04.withStructuredOutput(threadWriterSchema, { name: "thread_writer", method: "functionCalling" }), 90000),
  withTimeout(googleGemini3FlashPreviewT08Key1.withStructuredOutput(threadWriterSchema, { name: "thread_writer", method: "functionCalling" }), 60000),
  withTimeout(googleGemini3FlashPreviewT08Key2.withStructuredOutput(threadWriterSchema, { name: "thread_writer", method: "functionCalling" }), 60000)
];

// ViralityCriticNode Models
export const googleGemini4HydrogenT00Key1 = createGoogleModel("gemini-4-hydrogen", 0.0, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini4HydrogenT00Key2 = createGoogleModel("gemini-4-hydrogen", 0.0, "GOOGLE_API_KEY2", { thinkingLevel: "high" });
export const googleGemini38FlashT00Key1 = createGoogleModel("gemini-3.8-flash", 0.0, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini38FlashT00Key2 = createGoogleModel("gemini-3.8-flash", 0.0, "GOOGLE_API_KEY2", { thinkingLevel: "high" });
export const googleGemini36FlashT00Key1 = createGoogleModel("gemini-3.6-flash", 0.0, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini36FlashT00Key2 = createGoogleModel("gemini-3.6-flash", 0.0, "GOOGLE_API_KEY2", { thinkingLevel: "high" });
export const deepSeekFlashT00ReasoningHigh = createDeepSeekModel("deepseek-flash", 0.0, { reasoning: { effort: "high" }, modelKwargs: { thinking: { type: "enabled" }, response_format: { type: "json_object" } } });
export const deepSeekFlashT00ReasoningNone = createDeepSeekModel("deepseek-flash", 0.0, { reasoning: { effort: "none" }, modelKwargs: { thinking: { type: "disabled" }, response_format: { type: "json_object" } } });
export const googleGemma431bT00Key1 = createGoogleModel("gemma-4-31b-it", 0.0, "GOOGLE_API_KEY");
export const googleGemma431bT00Key2 = createGoogleModel("gemma-4-31b-it", 0.0, "GOOGLE_API_KEY2");
export const googleGemini3FlashPreviewT00Key1 = createGoogleModel("gemini-3-flash-preview", 0.0, "GOOGLE_API_KEY", { thinkingLevel: "high" });
export const googleGemini3FlashPreviewT00Key2 = createGoogleModel("gemini-3-flash-preview", 0.0, "GOOGLE_API_KEY2", { thinkingLevel: "high" });

// Unified Fallback Candidate Chain for Virality & Differential Critics (DeepSeek uses reasoning; every model has its own timeout)
export const criticModelCandidates = [
  withTimeout(googleGemini4HydrogenT00Key1, 60000),
  withTimeout(googleGemini4HydrogenT00Key2, 60000),
  withTimeout(googleGemini38FlashT00Key1, 60000),
  withTimeout(googleGemini38FlashT00Key2, 60000),
  withTimeout(googleGemini36FlashT00Key1, 75000),
  withTimeout(googleGemini36FlashT00Key2, 75000),
  withTimeout(deepSeekFlashT00ReasoningHigh, 90000),
  withTimeout(googleGemini3FlashPreviewT00Key1, 60000),
  withTimeout(googleGemini3FlashPreviewT00Key2, 60000),
];

// ContextResearcherNode Models (medium thinking for dual-query synthesis & infographic structured plans)
export const googleGemini31FlashLiteT02Key1 = createGoogleModel("gemini-3.1-flash-lite", 0.2, "GOOGLE_API_KEY", { thinkingLevel: "medium" });
export const googleGemini31FlashLiteT02Key2 = createGoogleModel("gemini-3.1-flash-lite", 0.2, "GOOGLE_API_KEY2", { thinkingLevel: "medium" });
export const googleGemini35FlashLiteT02Key1 = createGoogleModel("gemini-3.5-flash-lite", 0.2, "GOOGLE_API_KEY", { thinkingLevel: "medium" });
export const googleGemini35FlashLiteT02Key2 = createGoogleModel("gemini-3.5-flash-lite", 0.2, "GOOGLE_API_KEY2", { thinkingLevel: "medium" });
export const deepSeekFlashT02ReasoningNone = createDeepSeekModel("deepseek-flash", 0.2, { reasoning: { effort: "none" }, modelKwargs: { thinking: { type: "disabled" }, response_format: { type: "json_object" } } });
