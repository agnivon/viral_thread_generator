import { ChatGoogle } from "@langchain/google";
import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatOpenAI } from "@langchain/openai";

const createGoogleModel = (model: string, temperature: number, apiKeyEnv: string, overrides: any = {}) =>
  new ChatGoogle({ model, temperature, maxRetries: 3, apiKey: process.env[apiKeyEnv], ...overrides });

const createOpenAIModel = (model: string, temperature: number, overrides: any = {}) =>
  new ChatOpenAI({ model, temperature, maxRetries: 3, apiKey: process.env.OPENAI_API_KEY, ...overrides });

// ScraperNode Models
export const scraperPrimaryLlm = createGoogleModel("gemini-3.1-flash-lite", 0.1, "GOOGLE_API_KEY", { maxOutputTokens: 2000 });
export const scraperPrimaryLlmBackup = createGoogleModel("gemini-3.1-flash-lite", 0.1, "GOOGLE_API_KEY2", { maxOutputTokens: 2000 });
export const scraperFallbackLlm = createOpenAIModel("gpt-5.4-mini", 0.1, { maxTokens: 2000, timeout: 45000 });

// HookStrategistNode Models
export const hookPrimaryLlm = createGoogleModel("gemini-3.1-flash-lite", 0.8, "GOOGLE_API_KEY");
export const hookPrimaryLlmBackup = createGoogleModel("gemini-3.1-flash-lite", 0.8, "GOOGLE_API_KEY2");
export const hookFallbackLlm1 = createOpenAIModel("gpt-5.4-mini", 0.8, { timeout: 20000 });
export const hookFallbackLlm2 = new ChatOpenRouter({
  model: "openrouter/free",
  temperature: 0.8,
  maxRetries: 3,
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ThreadWriterNode Models
export const writerPrimaryLlm = createGoogleModel("gemini-3.5-flash", 0.8, "GOOGLE_API_KEY");
export const writerPrimaryLlmBackup = createGoogleModel("gemini-3.5-flash", 0.8, "GOOGLE_API_KEY2");
export const writerFallbackLlm1 = createOpenAIModel("gpt-5.4", 0.8, { presencePenalty: 0.4, timeout: 30000 });
export const writerFallbackLlm2 = createGoogleModel("gemma-4-26b-a4b-it", 0.8, "GOOGLE_API_KEY");
export const writerFallbackLlm2Backup = createGoogleModel("gemma-4-26b-a4b-it", 0.8, "GOOGLE_API_KEY2");
export const writerFallbackLlm3 = createGoogleModel("gemini-3-flash-preview", 0.8, "GOOGLE_API_KEY");
export const writerFallbackLlm3Backup = createGoogleModel("gemini-3-flash-preview", 0.8, "GOOGLE_API_KEY2");

// ViralityCriticNode Models
export const criticPrimaryLlm = createGoogleModel("gemini-3.5-flash", 0.0, "GOOGLE_API_KEY");
export const criticPrimaryLlmBackup = createGoogleModel("gemini-3.5-flash", 0.0, "GOOGLE_API_KEY2");
export const criticFallbackLlm1 = createOpenAIModel("gpt-5.4-mini", 0.0, { timeout: 25000 });
export const criticFallbackLlm2 = createGoogleModel("gemma-4-31b-it", 0.0, "GOOGLE_API_KEY");
export const criticFallbackLlm2Backup = createGoogleModel("gemma-4-31b-it", 0.0, "GOOGLE_API_KEY2");
export const criticFallbackLlm3 = createGoogleModel("gemini-3-flash-preview", 0.0, "GOOGLE_API_KEY");
export const criticFallbackLlm3Backup = createGoogleModel("gemini-3-flash-preview", 0.0, "GOOGLE_API_KEY2");

// ContextResearcherNode Models
export const researcherPrimaryLlm = createGoogleModel("gemini-3.1-flash-lite", 0.2, "GOOGLE_API_KEY", { maxOutputTokens: 2000 });
export const researcherPrimaryLlmBackup = createGoogleModel("gemini-3.1-flash-lite", 0.2, "GOOGLE_API_KEY2", { maxOutputTokens: 2000 });
export const researcherFallbackLlm = createOpenAIModel("gpt-5.4-mini", 0.2, { maxTokens: 2000, timeout: 45000 });
