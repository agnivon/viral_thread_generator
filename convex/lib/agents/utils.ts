"use node";

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { RunnableConfig } from "@langchain/core/runnables";
import { createAgent } from "langchain";

export interface AgentConfig {
  tools?: any[];
  systemPrompt: string;
  responseFormat: any;
}

export type AgentCandidate =
  | BaseChatModel
  | { model: BaseChatModel; timeout?: number };

/**
 * Builds an array of identical agents configured with different fallback models,
 * preserving any custom per-model timeout overrides.
 * @param models Array of Chat models or model objects with custom timeouts.
 * @param config The shared tools, prompt, and response schema.
 */
export function buildAgents(models: AgentCandidate[], config: AgentConfig) {
  return models.map((candidate) => {
    const model = "model" in candidate ? candidate.model : candidate;
    const timeout = "timeout" in candidate ? candidate.timeout : undefined;
    const agent = createAgent({
      model,
      tools: config.tools || [],
      systemPrompt: config.systemPrompt,
      responseFormat: config.responseFormat,
    });
    return timeout !== undefined ? { runnable: agent, timeout } : agent;
  });
}

export interface FallbackRunnable<RunInput = any, RunOutput = any> {
  invoke: (input: RunInput, config?: RunnableConfig) => Promise<RunOutput>;
}

export type FallbackCandidate<RunInput = any, RunOutput = any> =
  | FallbackRunnable<RunInput, RunOutput>
  | { runnable: FallbackRunnable<RunInput, RunOutput>; timeout?: number };

/**
 * Helper to bind a custom timeout to a specific model or agent in a fallback chain.
 */
export function withTimeout<T extends FallbackRunnable<any, any> | BaseChatModel>(
  target: T,
  timeoutMs: number
): T extends BaseChatModel ? { model: T; timeout: number } : { runnable: T; timeout: number } {
  return (
    "invoke" in target && typeof (target as any).invoke === "function" && !("pipe" in target && "bindTools" in target)
      ? { runnable: target, timeout: timeoutMs }
      : { model: target, timeout: timeoutMs }
  ) as any;
}

/**
 * Iterates through an array of models/agents, attempting to invoke them sequentially.
 * If one fails or times out, it catches the error and proceeds to the next model with a fresh timeout.
 * Allows per-model timeout overrides via withTimeout.
 * @param runnables Array of built agents, structured LLMs, or objects with timeout overrides.
 * @param params The invocation payload (e.g. { messages: [...] } or prompt string/messages).
 * @param options The runtime configuration including default per-attempt timeout.
 * @returns The successful result, or throws the final error if all models fail.
 */
export async function invokeWithFallbacks<RunInput = any, RunOutput = any>(
  runnables: FallbackCandidate<RunInput, RunOutput>[],
  params: RunInput,
  options?: RunnableConfig
): Promise<RunOutput> {
  const { timeout: defaultTimeoutMs, signal: parentSignal, ...restConfig } = options ?? {};
  let lastError: unknown;

  for (let i = 0; i < runnables.length; i++) {
    const candidate = runnables[i];
    const runnable = "runnable" in candidate ? candidate.runnable : candidate;
    const effectiveTimeout =
      "timeout" in candidate && candidate.timeout !== undefined ? candidate.timeout : defaultTimeoutMs;

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
      const rawPromise = runnable.invoke(params, attemptConfig);
      // Suppress unhandled rejections from the underlying promise when aborted post-timeout
      rawPromise.catch(() => {});

      let attemptPromise: Promise<RunOutput> = rawPromise;

      if (effectiveTimeout && effectiveTimeout > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutTimer = setTimeout(() => {
            const timeoutErr = new Error(`[Model Timeout] Model at index ${i} timed out after ${effectiveTimeout}ms`);
            timeoutErr.name = "TimeoutError";
            attemptController.abort(timeoutErr);
            reject(timeoutErr);
          }, effectiveTimeout);
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
