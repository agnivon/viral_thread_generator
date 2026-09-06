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
  | { runnable: BaseChatModel; timeout?: number };

/**
 * Builds an array of identical agents configured with different fallback models,
 * preserving any custom per-model timeout overrides.
 * @param models Array of Chat models or model objects with custom timeouts.
 * @param config The shared tools, prompt, and response schema.
 */
export function buildAgents(models: AgentCandidate[], config: AgentConfig) {
  return models.map((candidate) => {
    const model = "runnable" in candidate ? candidate.runnable : candidate;
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
): { runnable: T; timeout: number } {
  return { runnable: target, timeout: timeoutMs };
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

function safeStringify(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean" || typeof val === "bigint") return String(val);
  try {
    return JSON.stringify(val);
  } catch {
    return "";
  }
}

function formatHeaderTitle(key: string): string {
  const words = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/);
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function jsonToMarkdown(data: unknown, depth = 3): string {
  if (typeof data === "string") return data.trim();
  if (typeof data === "number" || typeof data === "boolean") return String(data);
  if (!data) return "";

  const headingPrefix = "#".repeat(Math.min(depth, 6));

  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return Object.entries(item as Record<string, unknown>)
            .map(([k, v]) => `- **${formatHeaderTitle(k)}:** ${typeof v === "object" && v !== null ? safeStringify(v) : safeStringify(v)}`)
            .join("\n");
        }
        return `- ${safeStringify(item)}`;
      })
      .join("\n");
  }

  if (typeof data === "object") {
    const sections: string[] = [];
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value === undefined || value === null) continue;
      const title = formatHeaderTitle(key);
      const header = `${headingPrefix} ${title}`;

      if (Array.isArray(value)) {
        const listContent = value
          .map((item) => {
            if (typeof item === "object" && item !== null) {
              return Object.entries(item as Record<string, unknown>)
                .map(([k, v]) => `  - **${formatHeaderTitle(k)}:** ${typeof v === "object" && v !== null ? safeStringify(v) : safeStringify(v)}`)
                .join("\n");
            }
            return `- ${safeStringify(item)}`;
          })
          .join("\n");
        sections.push(`${header}\n\n${listContent}`);
      } else if (typeof value === "object") {
        const subContent = jsonToMarkdown(value, depth + 1);
        sections.push(`${header}\n\n${subContent}`);
      } else {
        sections.push(`${header}\n\n${safeStringify(value).trim()}`);
      }
    }
    return sections.join("\n\n");
  }

  return safeStringify(data);
}

/**
 * Normalizes raw research dossier / context content.
 * Guarantees that even if an LLM returns stringified JSON, nested objects, or codeblock-wrapped
 * JSON payloads, it is parsed and converted into a clean, human-readable Markdown dossier.
 */
export function normalizeResearchDossier(rawContent: unknown): string {
  if (!rawContent) return "";

  if (typeof rawContent === "object") {
    const obj = rawContent as Record<string, unknown>;
    const nested = obj.research_context ?? obj.research_dossier ?? obj.dossier;
    if (typeof nested === "string" && nested) {
      return normalizeResearchDossier(nested);
    }
    return jsonToMarkdown(rawContent);
  }

  if (typeof rawContent !== "string") {
    return safeStringify(rawContent);
  }

  let text = rawContent.trim();
  if (!text) return "";

  // Strip wrapping markdown codeblock fences if present (e.g. ```markdown ... ``` or ```json ... ```)
  const codeBlockMatch = text.match(/^```(?:markdown|json|text)?\s*([\s\S]*?)\s*```$/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }

  // Check if string looks like JSON (starts with { or [)
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === "string") {
        return normalizeResearchDossier(parsed);
      }
      if (typeof parsed === "object" && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        const inner = obj.research_context ?? obj.research_dossier ?? obj.dossier;
        if (inner && typeof inner === "string") {
          return normalizeResearchDossier(inner);
        }
        return jsonToMarkdown(parsed);
      }
    } catch {
      // If JSON.parse fails, treat as raw text
    }
  }

  return text;
}

