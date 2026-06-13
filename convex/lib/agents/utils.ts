"use node";

import { createAgent } from "langchain";
import { z } from "zod";

export interface AgentConfig {
  tools?: any[];
  systemPrompt: string;
  responseFormat: z.ZodType<any>;
}

/**
 * Builds an array of identical agents configured with different fallback models.
 * @param models Array of Chat models (Primary, Fallback 1, Fallback 2, etc.)
 * @param config The shared tools, prompt, and response schema.
 */
export function buildAgents(models: any[], config: AgentConfig) {
  return models.map((model) =>
    createAgent({
      model,
      tools: config.tools || [],
      systemPrompt: config.systemPrompt,
      responseFormat: config.responseFormat,
    })
  );
}

/**
 * Iterates through an array of agents, attempting to invoke them sequentially.
 * If one fails, it catches the error and proceeds to the next agent.
 * @param agents Array of built agents.
 * @param params The invocation payload (e.g. { messages: [...] }).
 * @returns The successful result, or throws the final error if all agents fail.
 */
export async function invokeWithFallbacks(agents: any[], params: any) {
  let lastError: unknown;
  for (let i = 0; i < agents.length; i++) {
    try {
      const result = await agents[i].invoke(params);
      return result;
    } catch (e) {
      console.warn(`[Agent Fallback] Model at index ${i} failed. Trying next...`, e);
      lastError = e;
    }
  }
  throw lastError || new Error("All fallback models failed.");
}
