import { ChatGoogle } from "@langchain/google";
import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatOpenAI } from "@langchain/openai";

// ScraperNode Models
export const scraperPrimaryLlm = new ChatGoogle({
  model: "gemini-3.1-flash-lite",
  temperature: 0.1,
  maxOutputTokens: 2000,
  maxRetries: 0,
  apiKey: process.env.GOOGLE_API_KEY,
});

export const scraperFallbackLlm = new ChatOpenAI({
  model: "gpt-5.4-mini",
  temperature: 0.1,
  maxTokens: 2000,
  maxRetries: 0,
  timeout: 45000,
  apiKey: process.env.OPENAI_API_KEY,
});

// HookStrategistNode Models
export const hookPrimaryLlm = new ChatGoogle({
  model: "gemini-3.1-flash-lite",
  temperature: 0.8,
  maxRetries: 0,
  apiKey: process.env.GOOGLE_API_KEY,
});

export const hookFallbackLlm1 = new ChatOpenAI({
  model: "gpt-5.4-mini",
  temperature: 0.8,
  maxRetries: 0,
  timeout: 20000,
  apiKey: process.env.OPENAI_API_KEY,
});

export const hookFallbackLlm2 = new ChatOpenRouter({
  model: "openrouter/free",
  temperature: 0.8,
  maxRetries: 0,
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ThreadWriterNode Models
export const writerPrimaryLlm = new ChatGoogle({
  model: "gemini-3.5-flash",
  temperature: 0.8,
  maxRetries: 0,
  apiKey: process.env.GOOGLE_API_KEY,
});

export const writerFallbackLlm1 = new ChatOpenAI({
  model: "gpt-5.4",
  temperature: 0.8,
  presencePenalty: 0.4,
  maxRetries: 0,
  timeout: 30000,
  apiKey: process.env.OPENAI_API_KEY,
});

export const writerFallbackLlm2 = new ChatGoogle({
  model: "gemma-4-31b-it",
  temperature: 0.8,
  maxRetries: 0,
  apiKey: process.env.GOOGLE_API_KEY,
});

// ViralityCriticNode Models
export const criticPrimaryLlm = new ChatGoogle({
  model: "gemini-3.5-flash",
  temperature: 0.0,
  maxRetries: 0,
  apiKey: process.env.GOOGLE_API_KEY,
});

export const criticFallbackLlm = new ChatOpenAI({
  model: "gpt-5.4-mini",
  temperature: 0.0,
  maxRetries: 0,
  timeout: 25000,
  apiKey: process.env.OPENAI_API_KEY,
});
