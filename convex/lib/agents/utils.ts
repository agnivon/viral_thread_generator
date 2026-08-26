"use node";

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { RunnableConfig } from "@langchain/core/runnables";
import { createAgent } from "langchain";

export interface AgentConfig {
  tools?: any[];
  systemPrompt: string;
  responseFormat: any;
}

/**
 * Builds an array of identical agents configured with different fallback models.
 * @param models Array of Chat models (Primary, Fallback 1, Fallback 2, etc.)
 * @param config The shared tools, prompt, and response schema.
 */
export function buildAgents(models: BaseChatModel[], config: AgentConfig) {
  return models.map((model) => {
    return createAgent({
      model,
      tools: config.tools || [],
      systemPrompt: config.systemPrompt,
      responseFormat: config.responseFormat,
    });
  });
}

export interface FallbackRunnable<RunInput = unknown, RunOutput = unknown> {
  invoke: (input: RunInput, config?: RunnableConfig) => Promise<RunOutput>;
}

/**
 * Iterates through an array of models/agents, attempting to invoke them sequentially.
 * If one fails or times out, it catches the error and proceeds to the next model with a fresh timeout.
 * @param runnables Array of built agents, structured LLMs, or chat models.
 * @param params The invocation payload (e.g. { messages: [...] } or prompt string/messages).
 * @param options The runtime configuration including per-attempt timeout.
 * @returns The successful result, or throws the final error if all models fail.
 */
export async function invokeWithFallbacks<RunInput = any, RunOutput = any>(
  runnables: FallbackRunnable<RunInput, RunOutput>[],
  params: RunInput,
  options?: RunnableConfig
): Promise<RunOutput> {
  const { timeout: timeoutMs, signal: parentSignal, ...restConfig } = options ?? {};
  let lastError: unknown;

  for (let i = 0; i < runnables.length; i++) {
    if (parentSignal?.aborted) {
      throw parentSignal.reason || new Error("Operation aborted by caller");
    }

    const attemptController = new AbortController();
    let attemptSignal: AbortSignal = attemptController.signal;

    if (parentSignal) {
      if (typeof AbortSignal.any === "function") {
        attemptSignal = AbortSignal.any([parentSignal, attemptController.signal]);
      } else {
        const onParentAbort = () => attemptController.abort(parentSignal.reason);
        parentSignal.addEventListener("abort", onParentAbort, { once: true });
      }
    }

    const attemptConfig: RunnableConfig = {
      ...restConfig,
      signal: attemptSignal,
    };

    let timeoutTimer: NodeJS.Timeout | undefined;

    try {
      const rawPromise = runnables[i].invoke(params, attemptConfig);
      // Suppress unhandled rejections from the underlying promise when aborted post-timeout
      rawPromise.catch(() => {});

      let attemptPromise: Promise<RunOutput> = rawPromise;

      if (timeoutMs && timeoutMs > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutTimer = setTimeout(() => {
            const timeoutErr = new Error(`[Model Timeout] Model at index ${i} timed out after ${timeoutMs}ms`);
            timeoutErr.name = "TimeoutError";
            attemptController.abort(timeoutErr);
            reject(timeoutErr);
          }, timeoutMs);
        });
        attemptPromise = Promise.race([rawPromise, timeoutPromise]);
      }

      const result = await attemptPromise;
      return result;
    } catch (e) {
      console.warn(`[Agent Fallback] Model at index ${i} failed/timed out. Trying next...`, e);
      lastError = e;
    } finally {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(typeof lastError === "string" ? lastError : "All fallback models failed.");
}
