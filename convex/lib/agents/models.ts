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
export const googleGemini31FlashLiteT01Key1 = createGoogleModel("gemini-3.1-flash-lite", 0.1, "GOOGLE_API_KEY");
export const googleGemini31FlashLiteT01Key2 = createGoogleModel("gemini-3.1-flash-lite", 0.1, "GOOGLE_API_KEY2");
export const googleGemini35FlashLiteT01Key1 = createGoogleModel("gemini-3.5-flash-lite", 0.1, "GOOGLE_API_KEY");
export const googleGemini35FlashLiteT01Key2 = createGoogleModel("gemini-3.5-flash-lite", 0.1, "GOOGLE_API_KEY2");
export const openAiGpt54MiniT01 = createOpenAIModel("gpt-5.4-mini", 0.1);
export const openRouterFreeT01 = new ChatOpenRouter({
  model: "openrouter/free",
  temperature: 0.1,
  maxRetries: 3,
  apiKey: process.env.OPENROUTER_API_KEY,
});

// HookStrategistNode Models
export const googleGemini31FlashLiteT08Key1 = createGoogleModel("gemini-3.1-flash-lite", 0.8, "GOOGLE_API_KEY");
export const googleGemini31FlashLiteT08Key2 = createGoogleModel("gemini-3.1-flash-lite", 0.8, "GOOGLE_API_KEY2");
export const googleGemini35FlashLiteT08Key1 = createGoogleModel("gemini-3.5-flash-lite", 0.8, "GOOGLE_API_KEY");
export const googleGemini35FlashLiteT08Key2 = createGoogleModel("gemini-3.5-flash-lite", 0.8, "GOOGLE_API_KEY2");
export const openAiGpt54MiniT08 = createOpenAIModel("gpt-5.4-mini", 0.8);
export const openRouterFreeT08 = new ChatOpenRouter({
  model: "openrouter/free",
  temperature: 0.8,
  maxRetries: 3,
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ThreadWriterNode Models
export const googleGemini38FlashT08Key1 = createGoogleModel("gemini-3.8-flash", 0.8, "GOOGLE_API_KEY");
export const googleGemini38FlashT08Key2 = createGoogleModel("gemini-3.8-flash", 0.8, "GOOGLE_API_KEY2");
export const googleGemini37FlashT08Key1 = createGoogleModel("gemini-3.7-flash", 0.8, "GOOGLE_API_KEY");
export const googleGemini37FlashT08Key2 = createGoogleModel("gemini-3.7-flash", 0.8, "GOOGLE_API_KEY2");
export const googleGemini36FlashT08Key1 = createGoogleModel("gemini-3.6-flash", 0.8, "GOOGLE_API_KEY");
export const googleGemini36FlashT08Key2 = createGoogleModel("gemini-3.6-flash", 0.8, "GOOGLE_API_KEY2");
export const googleGemini35FlashT08Key1 = createGoogleModel("gemini-3.5-flash", 0.8, "GOOGLE_API_KEY");
export const googleGemini35FlashT08Key2 = createGoogleModel("gemini-3.5-flash", 0.8, "GOOGLE_API_KEY2");
export const deepSeekV4ProT085ReasoningNone = createDeepSeekModel("deepseek-v4-pro", 0.85, { reasoning: { effort: "none" }, modelKwargs: { thinking: { type: "disabled" }, response_format: { type: "json_object" } } });
export const openAiGpt54T08Penalty04 = createOpenAIModel("gpt-5.4", 0.8, { presencePenalty: 0.4 });
export const googleGemma426bT08Key1 = createGoogleModel("gemma-4-26b-a4b-it", 0.8, "GOOGLE_API_KEY");
export const googleGemma426bT08Key2 = createGoogleModel("gemma-4-26b-a4b-it", 0.8, "GOOGLE_API_KEY2");
export const googleGemini3FlashPreviewT08Key1 = createGoogleModel("gemini-3-flash-preview", 0.8, "GOOGLE_API_KEY");
export const googleGemini3FlashPreviewT08Key2 = createGoogleModel("gemini-3-flash-preview", 0.8, "GOOGLE_API_KEY2");

// ViralityCriticNode Models
export const googleGemini38FlashT00Key1 = createGoogleModel("gemini-3.8-flash", 0.0, "GOOGLE_API_KEY");
export const googleGemini38FlashT00Key2 = createGoogleModel("gemini-3.8-flash", 0.0, "GOOGLE_API_KEY2");
export const googleGemini37FlashT00Key1 = createGoogleModel("gemini-3.7-flash", 0.0, "GOOGLE_API_KEY");
export const googleGemini37FlashT00Key2 = createGoogleModel("gemini-3.7-flash", 0.0, "GOOGLE_API_KEY2");
export const googleGemini36FlashT00Key1 = createGoogleModel("gemini-3.6-flash", 0.0, "GOOGLE_API_KEY");
export const googleGemini36FlashT00Key2 = createGoogleModel("gemini-3.6-flash", 0.0, "GOOGLE_API_KEY2");
export const googleGemini35FlashT00Key1 = createGoogleModel("gemini-3.5-flash", 0.0, "GOOGLE_API_KEY");
export const googleGemini35FlashT00Key2 = createGoogleModel("gemini-3.5-flash", 0.0, "GOOGLE_API_KEY2");
export const deepSeekV4ProT00ReasoningHigh = createDeepSeekModel("deepseek-v4-pro", 0.0, { reasoning: { effort: "high" }, modelKwargs: { thinking: { type: "enabled" }, response_format: { type: "json_object" } } });
export const openAiGpt54MiniT00 = createOpenAIModel("gpt-5.4-mini", 0.0);
export const googleGemma431bT00Key1 = createGoogleModel("gemma-4-31b-it", 0.0, "GOOGLE_API_KEY");
export const googleGemma431bT00Key2 = createGoogleModel("gemma-4-31b-it", 0.0, "GOOGLE_API_KEY2");
export const googleGemini3FlashPreviewT00Key1 = createGoogleModel("gemini-3-flash-preview", 0.0, "GOOGLE_API_KEY");
export const googleGemini3FlashPreviewT00Key2 = createGoogleModel("gemini-3-flash-preview", 0.0, "GOOGLE_API_KEY2");

// ContextResearcherNode Models
export const googleGemini31FlashLiteT02Key1 = createGoogleModel("gemini-3.1-flash-lite", 0.2, "GOOGLE_API_KEY");
export const googleGemini31FlashLiteT02Key2 = createGoogleModel("gemini-3.1-flash-lite", 0.2, "GOOGLE_API_KEY2");
export const googleGemini35FlashLiteT02Key1 = createGoogleModel("gemini-3.5-flash-lite", 0.2, "GOOGLE_API_KEY");
export const googleGemini35FlashLiteT02Key2 = createGoogleModel("gemini-3.5-flash-lite", 0.2, "GOOGLE_API_KEY2");
export const openAiGpt54MiniT02 = createOpenAIModel("gpt-5.4-mini", 0.2);

// Backward compatibility aliases
export const googleGemini31FlashLiteT01Key1Max3k = googleGemini31FlashLiteT01Key1;
export const googleGemini31FlashLiteT01Key2Max3k = googleGemini31FlashLiteT01Key2;
export const googleGemini35FlashLiteT01Key1Max3k = googleGemini35FlashLiteT01Key1;
export const googleGemini35FlashLiteT01Key2Max3k = googleGemini35FlashLiteT01Key2;
export const openAiGpt54MiniT01Max2k = openAiGpt54MiniT01;

export const googleGemini31FlashLiteT02Key1Max3k = googleGemini31FlashLiteT02Key1;
export const googleGemini31FlashLiteT02Key2Max3k = googleGemini31FlashLiteT02Key2;
export const googleGemini35FlashLiteT02Key1Max3k = googleGemini35FlashLiteT02Key1;
export const googleGemini35FlashLiteT02Key2Max3k = googleGemini35FlashLiteT02Key2;
export const openAiGpt54MiniT02Max2k = openAiGpt54MiniT02;
