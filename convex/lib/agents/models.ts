"use node";
import { ChatGoogle } from "@langchain/google";
import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatOpenAI } from "@langchain/openai";
import { ChatDeepSeek } from "@langchain/deepseek";

type GoogleOverrides = Omit<NonNullable<ConstructorParameters<typeof ChatGoogle>[0]>, "model" | "modelName" | "temperature" | "maxRetries" | "apiKey">;
type OpenAIOverrides = Omit<NonNullable<ConstructorParameters<typeof ChatOpenAI>[0]>, "model" | "modelName" | "temperature" | "maxRetries" | "apiKey">;
type DeepSeekOverrides = Omit<NonNullable<ConstructorParameters<typeof ChatDeepSeek>[0]>, "model" | "modelName" | "temperature" | "maxRetries" | "apiKey">;

const createGoogleModel = (model: string, temperature: number, apiKeyEnv: string, overrides: GoogleOverrides = {}) =>
  new ChatGoogle({ model, temperature, maxRetries: 3, apiKey: process.env[apiKeyEnv], ...overrides });

const createOpenAIModel = (model: string, temperature: number, overrides: OpenAIOverrides = {}) =>
  new ChatOpenAI({ model, temperature, maxRetries: 3, apiKey: process.env.OPENAI_API_KEY, ...overrides });

const createDeepSeekModel = (model: string, temperature: number, overrides: DeepSeekOverrides = {}) =>
  new ChatDeepSeek({ model, temperature, maxRetries: 3, apiKey: process.env.DEEPSEEK_API_KEY, ...overrides });

// ScraperNode Models
export const googleGemini31FlashLiteT01Key1Max2k = createGoogleModel("gemini-3.1-flash-lite", 0.1, "GOOGLE_API_KEY", { maxOutputTokens: 2000 });
export const googleGemini31FlashLiteT01Key2Max2k = createGoogleModel("gemini-3.1-flash-lite", 0.1, "GOOGLE_API_KEY2", { maxOutputTokens: 2000 });
export const openAiGpt54MiniT01Max2kTimeout45k = createOpenAIModel("gpt-5.4-mini", 0.1, { maxTokens: 2000, timeout: 45000 });

// HookStrategistNode Models
export const googleGemini31FlashLiteT08Key1 = createGoogleModel("gemini-3.1-flash-lite", 0.8, "GOOGLE_API_KEY");
export const googleGemini31FlashLiteT08Key2 = createGoogleModel("gemini-3.1-flash-lite", 0.8, "GOOGLE_API_KEY2");
export const openAiGpt54MiniT08Timeout20k = createOpenAIModel("gpt-5.4-mini", 0.8, { timeout: 20000 });
export const openRouterFreeT08 = new ChatOpenRouter({
  model: "openrouter/free",
  temperature: 0.8,
  maxRetries: 3,
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ThreadWriterNode Models
export const googleGemini36FlashT08Key1 = createGoogleModel("gemini-3.6-flash", 0.8, "GOOGLE_API_KEY");
export const googleGemini35FlashT08Key1 = createGoogleModel("gemini-3.5-flash", 0.8, "GOOGLE_API_KEY");
export const deepSeekV4ProT085ReasoningNone = createDeepSeekModel("deepseek-v4-pro", 0.85, { reasoning: { effort: "none" }, modelKwargs: { thinking: { type: "disabled" }, response_format: { type: "json_object" } } });
export const openAiGpt54T08Penalty04Timeout30k = createOpenAIModel("gpt-5.4", 0.8, { presencePenalty: 0.4, timeout: 30000 });
export const googleGemma426bT08Key1 = createGoogleModel("gemma-4-26b-a4b-it", 0.8, "GOOGLE_API_KEY");
export const googleGemma426bT08Key2 = createGoogleModel("gemma-4-26b-a4b-it", 0.8, "GOOGLE_API_KEY2");
export const googleGemini3FlashPreviewT08Key1 = createGoogleModel("gemini-3-flash-preview", 0.8, "GOOGLE_API_KEY");
export const googleGemini3FlashPreviewT08Key2 = createGoogleModel("gemini-3-flash-preview", 0.8, "GOOGLE_API_KEY2");

// ViralityCriticNode Models
export const googleGemini36FlashT00Key1 = createGoogleModel("gemini-3.6-flash", 0.0, "GOOGLE_API_KEY");
export const googleGemini35FlashT00Key1 = createGoogleModel("gemini-3.5-flash", 0.0, "GOOGLE_API_KEY");
export const deepSeekV4ProT00ReasoningHigh = createDeepSeekModel("deepseek-v4-pro", 0.0, { reasoning: { effort: "high" }, modelKwargs: { thinking: { type: "enabled" }, response_format: { type: "json_object" } } });
export const openAiGpt54MiniT00Timeout25k = createOpenAIModel("gpt-5.4-mini", 0.0, { timeout: 25000 });
export const googleGemma431bT00Key1 = createGoogleModel("gemma-4-31b-it", 0.0, "GOOGLE_API_KEY");
export const googleGemma431bT00Key2 = createGoogleModel("gemma-4-31b-it", 0.0, "GOOGLE_API_KEY2");
export const googleGemini3FlashPreviewT00Key1 = createGoogleModel("gemini-3-flash-preview", 0.0, "GOOGLE_API_KEY");
export const googleGemini3FlashPreviewT00Key2 = createGoogleModel("gemini-3-flash-preview", 0.0, "GOOGLE_API_KEY2");

// ContextResearcherNode Models
export const googleGemini31FlashLiteT02Key1Max2k = createGoogleModel("gemini-3.1-flash-lite", 0.2, "GOOGLE_API_KEY", { maxOutputTokens: 2000 });
export const googleGemini31FlashLiteT02Key2Max2k = createGoogleModel("gemini-3.1-flash-lite", 0.2, "GOOGLE_API_KEY2", { maxOutputTokens: 2000 });
export const openAiGpt54MiniT02Max2kTimeout45k = createOpenAIModel("gpt-5.4-mini", 0.2, { maxTokens: 2000, timeout: 45000 });
