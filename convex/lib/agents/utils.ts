"use node";

import {
  BaseChatModel,
  BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { BaseMessage, AIMessage, AIMessageChunk } from "@langchain/core/messages";
import { ChatResult, ChatGenerationChunk } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { createAgent } from "langchain";
import { z } from "zod";
import {
  modelCircuitBreaker,
  getModelIdentity,
  attachModelIdentity,
} from "./circuitBreaker.js";

export interface AgentResponse<T = Record<string, unknown>> {
  messages?: { content?: unknown; [key: string]: unknown }[];
  structuredResponse?: T;
  [key: string]: unknown;
}

export interface ProviderResponseFormat {
  google?: unknown;
  deepseek?: unknown;
  openai?: unknown;
  default?: unknown;
  [key: string]: unknown;
}

export interface AgentConfig {
  tools?: Parameters<typeof createAgent>[0]["tools"];
  systemPrompt: string;
  responseFormat?: ProviderResponseFormat | Parameters<typeof createAgent>[0]["responseFormat"];
}

export type AgentCandidate =
  | BaseChatModel
  | Runnable
  | { runnable: BaseChatModel | Runnable; timeout?: number };

export interface FallbackRunnable<RunInput = unknown, RunOutput = unknown> {
  invoke: (input: RunInput, config?: RunnableConfig) => Promise<RunOutput>;
}

export type FallbackCandidate<RunInput = unknown, RunOutput = unknown> =
  | FallbackRunnable<RunInput, RunOutput>
  | { runnable: FallbackRunnable<RunInput, RunOutput>; timeout?: number };

/**
 * Helper to bind a custom timeout to a specific model or agent in a fallback chain,
 * preserving ModelIdentity metadata.
 */
export function withTimeout<T extends object>(
  target: T,
  timeoutMs: number
): { runnable: T; timeout: number } {
  const result = { runnable: target, timeout: timeoutMs };
  const identity = getModelIdentity(target);
  if (identity) {
    attachModelIdentity(result, identity);
  }
  return result;
}

const FALLBACK_PER_MODEL_TIMEOUT_KEY = "__fallbackPerModelTimeoutMs";
const FALLBACK_HAS_OUTER_ALTERNATIVE_KEY = "__fallbackHasOuterAlternative";

interface FallbackConfigurable extends Record<string, unknown> {
  [FALLBACK_PER_MODEL_TIMEOUT_KEY]?: number;
  [FALLBACK_HAS_OUTER_ALTERNATIVE_KEY]?: boolean;
}

function hasFallbackModel(
  candidate: unknown
): candidate is { fallbackModel: FallbackChatModel } {
  if (!candidate || typeof candidate !== "object") return false;
  const direct = (candidate as { fallbackModel?: unknown }).fallbackModel;
  if (direct instanceof FallbackChatModel) return true;
  if ("runnable" in candidate) {
    const inner = (candidate as { runnable?: unknown }).runnable;
    if (inner && typeof inner === "object") {
      return (inner as { fallbackModel?: unknown }).fallbackModel instanceof FallbackChatModel;
    }
  }
  return false;
}

function getFallbackModel(candidate: unknown): FallbackChatModel | undefined {
  if (!candidate || typeof candidate !== "object") return undefined;
  const direct = (candidate as { fallbackModel?: unknown }).fallbackModel;
  if (direct instanceof FallbackChatModel) return direct;
  if ("runnable" in candidate) {
    const inner = (candidate as { runnable?: unknown }).runnable;
    if (inner && typeof inner === "object") {
      const innerModel = (inner as { fallbackModel?: unknown }).fallbackModel;
      if (innerModel instanceof FallbackChatModel) return innerModel;
    }
  }
  return undefined;
}

export function isCandidateAvailable(candidate: unknown): boolean {
  const fallbackModel = getFallbackModel(candidate);
  if (fallbackModel) {
    return fallbackModel.candidates.some((inner) => isCandidateAvailable(inner));
  }
  const identity = getModelIdentity(candidate);
  return !identity || modelCircuitBreaker.isAvailable(identity).available;
}

/**
 * Iterates through an array of models/agents, attempting to invoke them sequentially.
 * If one fails or times out, it catches the error and proceeds to the next model with a fresh timeout.
 * Allows per-model timeout overrides via withTimeout.
 *
 * For grouped `buildAgents` agents backed by `FallbackChatModel`:
 * - Availability is determined by whether ANY inner candidate is untripped (no outer group identity poisoning).
 * - Outer shared timeouts do NOT choke multi-model fallback groups; `timeout` is forwarded as the
 *   default per-model timeout window for each inner candidate inside `FallbackChatModel`.
 *
 * @param runnables Array of built agents, structured LLMs, or objects with timeout overrides.
 * @param params The invocation payload (e.g. { messages: [...] } or prompt string/messages).
 * @param options The runtime configuration including default per-attempt timeout.
 * @returns The successful result, or throws the final error if all models fail.
 */
export async function invokeWithFallbacks<RunInput = unknown, RunOutput = unknown>(
  runnables: FallbackCandidate<RunInput, RunOutput>[],
  params: RunInput,
  options?: RunnableConfig
): Promise<RunOutput> {
  const {
    timeout: defaultTimeoutMs,
    signal: parentSignal,
    configurable,
    ...restConfig
  } = options ?? {};
  const configurableObj =
    configurable && typeof configurable === "object"
      ? (configurable as FallbackConfigurable)
      : undefined;
  const inheritedPerModelTimeoutMs = configurableObj?.[FALLBACK_PER_MODEL_TIMEOUT_KEY];
  const resolvedDefaultTimeoutMs = defaultTimeoutMs ?? inheritedPerModelTimeoutMs;
  const hasOuterAlternativeFromCaller = configurableObj?.[FALLBACK_HAS_OUTER_ALTERNATIVE_KEY] === true;
  let lastError: unknown;

  // Check if all candidates are currently tripped; if so, fail open to avoid total deadlock
  // unless an outer fallback group has already signaled an untripped alternative.
  const allTripped =
    !hasOuterAlternativeFromCaller &&
    runnables.length > 0 &&
    runnables.every((candidate) => !isCandidateAvailable(candidate));

  if (allTripped) {
    console.warn(
      `[CircuitBreaker] All ${runnables.length} fallback candidates are currently tripped. Failing open to allow trial probe.`
    );
  }

  const inFlightFailedKeys = new Set<string>();
  const inFlightFailedModels = new Set<string>();
  const inFlightFailedKeyModels = new Set<string>();

  for (let i = 0; i < runnables.length; i++) {
    const candidate = runnables[i];
    const isGroupedAgent = hasFallbackModel(candidate);
    const identity = isGroupedAgent ? undefined : getModelIdentity(candidate);

    // 1. Circuit breaker check (bypassed if all candidates in the list are tripped)
    if (!allTripped) {
      if (isGroupedAgent) {
        if (!isCandidateAvailable(candidate)) {
          console.warn(
            `[CircuitBreaker] Skipping grouped agent at index ${i}: all inner model candidates are currently tripped.`
          );
          continue;
        }
      } else if (identity) {
        const cbStatus = modelCircuitBreaker.isAvailable(identity);
        if (!cbStatus.available) {
          console.warn(
            `[CircuitBreaker] Skipping candidate at index ${i} (${identity.modelId} on ${identity.keyGroup}): ${cbStatus.reason}`
          );
          continue;
        }
      }
    }

    // 2. In-flight fast-skipping (0ms overhead if key, model, or key_model combination already failed in current invocation)
    if (identity) {
      const keyModelKey = `${identity.keyGroup}::${identity.modelId}`;
      if (inFlightFailedKeyModels.has(keyModelKey)) {
        console.warn(
          `[Agent Fallback] Fast-skipping candidate at index ${i} (${identity.modelId} on ${identity.keyGroup}): Model+Key combination already failed in current attempt.`
        );
        continue;
      }
      if (inFlightFailedKeys.has(identity.keyGroup)) {
        console.warn(
          `[Agent Fallback] Fast-skipping candidate at index ${i} (${identity.modelId} on ${identity.keyGroup}): Key already failed in current attempt.`
        );
        continue;
      }
      if (inFlightFailedModels.has(identity.modelId)) {
        console.warn(
          `[Agent Fallback] Fast-skipping candidate at index ${i} (${identity.modelId} on ${identity.keyGroup}): Model already failed in current attempt.`
        );
        continue;
      }
    }

    const runnable = "runnable" in candidate ? candidate.runnable : candidate;
    const explicitCandidateTimeout =
      "timeout" in candidate && candidate.timeout !== undefined ? candidate.timeout : undefined;
    const effectiveTimeout =
      explicitCandidateTimeout !== undefined
        ? explicitCandidateTimeout
        : isGroupedAgent
        ? undefined
        : resolvedDefaultTimeoutMs;

    if (parentSignal?.aborted) {
      throw parentSignal.reason || new Error("Operation aborted by caller");
    }

    const attemptController = new AbortController();
    let attemptSignal: AbortSignal = attemptController.signal;
    let onParentAbort: (() => void) | undefined;

    if (parentSignal) {
      if (typeof AbortSignal.any === "function") {
        attemptSignal = AbortSignal.any([parentSignal, attemptController.signal]);
      } else {
        onParentAbort = () => attemptController.abort(parentSignal.reason);
        parentSignal.addEventListener("abort", onParentAbort, { once: true });
      }
    }

    const hasRemainingOuterAlternative =
      hasOuterAlternativeFromCaller ||
      runnables.slice(i + 1).some((laterCandidate) => isCandidateAvailable(laterCandidate));

    const attemptConfigurable: FallbackConfigurable | undefined = isGroupedAgent
      ? {
          ...configurableObj,
          ...(resolvedDefaultTimeoutMs !== undefined
            ? { [FALLBACK_PER_MODEL_TIMEOUT_KEY]: resolvedDefaultTimeoutMs }
            : {}),
          [FALLBACK_HAS_OUTER_ALTERNATIVE_KEY]: hasRemainingOuterAlternative,
        }
      : configurableObj;

    const attemptConfig: RunnableConfig = {
      ...restConfig,
      ...(attemptConfigurable !== undefined ? { configurable: attemptConfigurable } : {}),
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
      if (identity) {
        modelCircuitBreaker.recordSuccess(identity);
      }
      return result;
    } catch (e) {
      if (i < runnables.length - 1) {
        console.warn(`[Agent Fallback] Model at index ${i} failed/timed out. Trying next candidate...`, e);
      } else {
        console.warn(`[Agent Fallback] Final candidate at index ${i} failed/timed out. No more fallbacks available.`, e);
      }
      lastError = e;

      if (identity) {
        const classification = modelCircuitBreaker.recordFailure(identity, e);
        if (classification.skipScope === "key_model") {
          inFlightFailedKeyModels.add(`${identity.keyGroup}::${identity.modelId}`);
        } else if (classification.skipScope === "key") {
          inFlightFailedKeys.add(identity.keyGroup);
        } else if (classification.skipScope === "model") {
          inFlightFailedModels.add(identity.modelId);
        }
      }
    } finally {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      if (parentSignal && onParentAbort) {
        parentSignal.removeEventListener("abort", onParentAbort);
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(typeof lastError === "string" ? lastError : "All fallback models failed.");
}

/**
 * A resilient BaseChatModel wrapper that executes candidate models sequentially using invokeWithFallbacks.
 * Enables an agent's multi-turn tool loops to survive model failures without losing intermediate
 * state, tool executions, or message history.
 */
export class FallbackChatModel extends BaseChatModel {
  readonly candidates: AgentCandidate[];

  constructor(candidates: AgentCandidate[]) {
    super({});
    if (candidates.length === 0) {
      throw new Error("FallbackChatModel requires at least one candidate model.");
    }
    this.candidates = candidates;
    const firstCandidate = candidates[0];
    const candidateRunnable = "runnable" in firstCandidate ? firstCandidate.runnable : firstCandidate;
    const firstIdentity = getModelIdentity(firstCandidate);
    const candidateObj = candidateRunnable as unknown as Record<string, unknown>;
    if (firstIdentity?.modelId) {
      this.name = firstIdentity.modelId;
    } else if (typeof candidateObj.modelName === "string") {
      this.name = candidateObj.modelName;
    } else if (typeof candidateObj.model === "string") {
      this.name = candidateObj.model;
    }
  }

  _llmType(): string {
    return "fallback_chat_model";
  }

  /**
   * Expose `structuredOutput: true` so `createAgent` defaults raw schemas to `ProviderStrategy`
   * unless callers pass explicit provider-partitioned `ProviderResponseFormat` entries via `buildAgents`.
   */
  override get profile(): { structuredOutput: boolean } {
    return { structuredOutput: true };
  }

  override bindTools(
    tools: Parameters<NonNullable<BaseChatModel["bindTools"]>>[0],
    kwargs?: Parameters<NonNullable<BaseChatModel["bindTools"]>>[1]
  ): Runnable<BaseLanguageModelInput, AIMessageChunk, BaseChatModelCallOptions> {
    const boundCandidates: AgentCandidate[] = this.candidates.map((candidate) => {
      const model = "runnable" in candidate ? candidate.runnable : candidate;
      const timeout = "timeout" in candidate ? candidate.timeout : undefined;
      const identity = getModelIdentity(candidate);

      let boundModel: BaseChatModel | Runnable;
      if ("bindTools" in model && typeof (model as { bindTools: unknown }).bindTools === "function") {
        try {
          boundModel = (model as { bindTools: (t: unknown[], o?: unknown) => Runnable }).bindTools(
            tools,
            kwargs
          );
        } catch (err) {
          console.warn("[FallbackChatModel] Failed to bind tools to candidate model, falling back to unbound model:", err);
          boundModel = model;
        }
      } else {
        boundModel = model;
      }

      if (identity) {
        attachModelIdentity(boundModel, identity);
      }
      const result = timeout !== undefined
        ? { runnable: boundModel, timeout }
        : boundModel;
      if (identity && timeout !== undefined) {
        attachModelIdentity(result, identity);
      }
      return result;
    });

    return new FallbackChatModel(boundCandidates);
  }

  override async invoke(
    input: BaseLanguageModelInput,
    options?: Partial<BaseChatModelCallOptions>
  ): Promise<AIMessageChunk> {
    const rawPerModelTimeout = options?.configurable?.[FALLBACK_PER_MODEL_TIMEOUT_KEY];
    const perModelTimeoutMs =
      options?.timeout ??
      (typeof rawPerModelTimeout === "number" ? rawPerModelTimeout : undefined);
    const innerConfig: RunnableConfig = {
      ...options,
      ...(perModelTimeoutMs !== undefined ? { timeout: perModelTimeoutMs } : {}),
    };
    const rawResult = await invokeWithFallbacks<BaseLanguageModelInput, unknown>(
      this.candidates as FallbackCandidate<BaseLanguageModelInput, unknown>[],
      input,
      innerConfig
    );

    if (rawResult instanceof AIMessageChunk) {
      return rawResult;
    }
    if (rawResult instanceof AIMessage) {
      const chunk = new AIMessageChunk({
        content: rawResult.content,
        tool_calls: rawResult.tool_calls,
        usage_metadata: rawResult.usage_metadata,
        response_metadata: rawResult.response_metadata,
        id: rawResult.id,
        additional_kwargs: rawResult.additional_kwargs,
      });
      if (rawResult.invalid_tool_calls && rawResult.invalid_tool_calls.length > 0) {
        chunk.invalid_tool_calls = rawResult.invalid_tool_calls;
      }
      return chunk;
    }
    if (typeof rawResult === "object" && rawResult !== null && "generations" in rawResult) {
      const chatResult = rawResult as ChatResult;
      const firstGen = chatResult.generations?.[0];
      if (firstGen?.message instanceof AIMessageChunk) {
        return firstGen.message;
      }
      if (firstGen?.message instanceof AIMessage) {
        const chunk = new AIMessageChunk({
          content: firstGen.message.content,
          tool_calls: firstGen.message.tool_calls,
          usage_metadata: firstGen.message.usage_metadata,
          response_metadata: firstGen.message.response_metadata,
          id: firstGen.message.id,
          additional_kwargs: firstGen.message.additional_kwargs,
        });
        if (firstGen.message.invalid_tool_calls && firstGen.message.invalid_tool_calls.length > 0) {
          chunk.invalid_tool_calls = firstGen.message.invalid_tool_calls;
        }
        return chunk;
      }
      return new AIMessageChunk({
        content: firstGen?.text ?? "",
      });
    }
    if (typeof rawResult === "object" && rawResult !== null && "content" in rawResult) {
      const obj = rawResult as {
        content: unknown;
        tool_calls?: unknown[];
        invalid_tool_calls?: unknown[];
        usage_metadata?: unknown;
        response_metadata?: Record<string, unknown>;
        id?: string;
        additional_kwargs?: Record<string, unknown>;
      };
      const chunk = new AIMessageChunk({
        content: typeof obj.content === "string" || Array.isArray(obj.content) ? (obj.content as never) : safeStringify(obj.content),
        tool_calls: Array.isArray(obj.tool_calls) ? (obj.tool_calls as never) : undefined,
        usage_metadata: obj.usage_metadata as never,
        response_metadata: obj.response_metadata,
        id: obj.id,
        additional_kwargs: obj.additional_kwargs,
      });
      if (Array.isArray(obj.invalid_tool_calls) && obj.invalid_tool_calls.length > 0) {
        chunk.invalid_tool_calls = obj.invalid_tool_calls as never;
      }
      return chunk;
    }
    return new AIMessageChunk({
      content: typeof rawResult === "string" ? rawResult : safeStringify(rawResult),
    });
  }

  async _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    _runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    const aiMessage = await this.invoke(messages, options);
    return {
      generations: [
        {
          text: extractMessageText(aiMessage.content),
          message: aiMessage,
        },
      ],
      llmOutput: aiMessage.usage_metadata ? { tokenUsage: aiMessage.usage_metadata } : undefined,
    };
  }

  override async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    const res = await this.invoke(messages, options);
    const chunk = new ChatGenerationChunk({
      message: res,
      text: extractMessageText(res.content),
    });
    yield chunk;
    await runManager?.handleLLMNewToken(extractMessageText(res.content));
  }
}

export function isProviderResponseFormat(rf: unknown): rf is ProviderResponseFormat {
  return (
    typeof rf === "object" &&
    rf !== null &&
    !Array.isArray(rf) &&
    !("schema" in rf) &&
    ("google" in rf || "deepseek" in rf || "default" in rf)
  );
}

/**
 * Builds a resilient agent configured with a FallbackChatModel,
 * preserving any custom per-model timeout overrides and ModelIdentity metadata.
 * Executes model fallbacks within the single agent graph so intermediate tool executions,
 * web searches, and message history are never lost if a model fails during multi-turn loops.
 * When provided with a ProviderResponseFormat (e.g. `{ google: toolStrategy(s), deepseek: providerStrategy(s) }`),
 * candidates are partitioned into provider-specific FallbackChatModel agent groups so each provider uses
 * its required structured output strategy:
 * - Thinking Gemini (`thinkingLevel: "high"`/`"medium"`/`"low"`): MUST use `toolStrategy` (`ProviderStrategy.parse` breaks
 *   on index-0 `{ thought: true, type: "text" }` blocks returned by `@langchain/google`).
 * - Non-thinking Gemini (`thinkingLevel: "minimal"`/`"off"`): uses `providerStrategy` (native `responseSchema`).
 * - DeepSeek (`createAgent`): MUST use `providerStrategy` paired with `modelKwargs.response_format: { type: "json_object" }`
 *   (overrides `json_schema`, and avoids `toolStrategy` multi-turn retries where `@langchain/openai` drops `reasoning_content`).
 * @param models Array of Chat models or model objects with custom timeouts.
 * @param config The shared tools, prompt, and response schema.
 */
function getCandidateProvider(candidate: AgentCandidate): string {
  const identity = getModelIdentity(candidate);
  if (identity?.provider) return identity.provider;
  const model = "runnable" in candidate ? candidate.runnable : candidate;
  const modelObj = model as unknown as Record<string, unknown>;
  const rawName = modelObj.name ?? modelObj.modelName ?? modelObj.model ?? "";
  const name = typeof rawName === "string" ? rawName.toLowerCase() : "";
  if (name.includes("deepseek")) return "deepseek";
  if (name.includes("gemini") || name.includes("google")) return "google";
  if (name.includes("gpt") || name.includes("openai")) return "openai";
  return "default";
}

export function buildAgents<T extends Record<string, unknown> = Record<string, unknown>>(
  models: AgentCandidate[],
  config: AgentConfig
): FallbackCandidate<unknown, AgentResponse<T>>[] {
  if (models.length === 0) return [];

  if (config.responseFormat !== undefined) {
    const providerConfig: ProviderResponseFormat = isProviderResponseFormat(config.responseFormat)
      ? config.responseFormat
      : { default: config.responseFormat };

    const groups: { candidates: AgentCandidate[]; format: unknown; provider: string }[] = [];
    let currentGroup: { candidates: AgentCandidate[]; format: unknown; provider: string } | null = null;

    for (const candidate of models) {
      const provider = getCandidateProvider(candidate);
      const format = providerConfig[provider] ?? providerConfig.default;

      if (!currentGroup || currentGroup.provider !== provider || currentGroup.format !== format) {
        currentGroup = { candidates: [candidate], format, provider };
        groups.push(currentGroup);
      } else {
        currentGroup.candidates.push(candidate);
      }
    }

    return groups.map((group) => {
      const fallbackModel = new FallbackChatModel(group.candidates);

      const agent = group.format !== undefined
        ? createAgent({
            model: fallbackModel,
            tools: config.tools || [],
            systemPrompt: config.systemPrompt,
            responseFormat: group.format as never,
          })
        : createAgent({
            model: fallbackModel,
            tools: config.tools || [],
            systemPrompt: config.systemPrompt,
          });

      Object.defineProperty(agent, "fallbackModel", {
        value: fallbackModel,
        enumerable: false,
        configurable: true,
      });

      // Do NOT attach candidates[0]'s identity onto the grouped agent: inner FallbackChatModel
      // manages independent per-model ModelIdentity checks/tracking and timeout windows.
      return agent as unknown as FallbackCandidate<unknown, AgentResponse<T>>;
    });
  }

  const fallbackModel = new FallbackChatModel(models);

  const agent = createAgent({
    model: fallbackModel,
    tools: config.tools || [],
    systemPrompt: config.systemPrompt,
  });

  // Attach reference to fallbackModel for introspection and testing
  Object.defineProperty(agent, "fallbackModel", {
    value: fallbackModel,
    enumerable: false,
    configurable: true,
  });

  return [agent as unknown as FallbackCandidate<unknown, AgentResponse<T>>];
}

/**
 * Safely extracts human-readable string text from message content,
 * supporting plain strings, arrays of text/thinking blocks, and objects.
 */
export function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const textParts = content
      .map((block) => {
        if (typeof block === "string") return block;
        if (typeof block === "object" && block !== null) {
          const obj = block as { text?: unknown; thought?: unknown; type?: unknown };
          if (
            obj.thought === true ||
            obj.type === "thinking" ||
            obj.type === "reasoning" ||
            obj.type === "redacted_thinking"
          ) {
            return "";
          }
          if (typeof obj.text === "string") {
            return obj.text;
          }
        }
        return "";
      })
      .filter(Boolean);
    if (textParts.length > 0) return textParts.join("\n");
  }
  return safeStringify(content);
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
            .map(([k, v]) => `- **${formatHeaderTitle(k)}:** ${safeStringify(v)}`)
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
                .map(([k, v]) => `  - **${formatHeaderTitle(k)}:** ${safeStringify(v)}`)
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

export const BANNED_ENGAGEMENT_PHRASES = [
  "a thread 🧵",
  "read below",
  "let's dive in",
  "here is why",
  "save this tweet",
  "what do you think?",
  "let's discuss",
  "in today's fast-paced world",
  "have you ever wondered",
  "look no further",
  "in this post, we will explore",
  "key takeaway",
  "crucial step",
  "remember to",
  "let's look at",
  "here's the deal",
  "retweet",
  "like and follow",
];

export interface ActionablePostCritique {
  post_index: number;
  critique: string;
  fix_directive?: string;
  status?: "open" | "resolved" | "unresolved";
}

const NON_DEFECT_PHRASES = new Set([
  "none",
  "n/a",
  "no issues",
  "no issue",
  "no fixes needed",
  "no fix needed",
  "passes",
  "passes all criteria",
  "looks good",
  "solid",
  "clean",
]);

/**
 * Filters post-specific critiques so only posts that actually have actionable flaws
 * or required fixes are returned.
 */
export function filterActionablePostCritiques(
  rawCritiques: Array<{ post_index: number; critique?: string; fix_directive?: string; status?: "open" | "resolved" | "unresolved" }> | undefined | null
): ActionablePostCritique[] {
  if (!rawCritiques || !Array.isArray(rawCritiques)) {
    return [];
  }

  return rawCritiques
    .filter((pc) => {
      // Discard resolved critiques - they are historical milestones, not open defects requiring fixes
      if (pc.status === "resolved") {
        return false;
      }

      const critiqueText = (pc.critique || "").trim();
      const fixText = (pc.fix_directive || "").trim();
      if (critiqueText.length === 0 && fixText.length === 0) {
        return false;
      }

      const lowerCritique = critiqueText.toLowerCase();
      const lowerFix = fixText.toLowerCase();

      if (
        NON_DEFECT_PHRASES.has(lowerCritique) &&
        (fixText.length === 0 || NON_DEFECT_PHRASES.has(lowerFix))
      ) {
        return false;
      }

      return true;
    })
    .map((pc) => ({
      post_index: pc.post_index,
      critique: (pc.critique || "").trim(),
      ...(pc.fix_directive && pc.fix_directive.trim().length > 0
        ? { fix_directive: pc.fix_directive.trim() }
        : {}),
      ...(pc.status ? { status: pc.status } : {}),
    }));
}

export interface AuditPostCritique {
  post_index: number;
  critique: string;
  fix_directive?: string;
  status: "open" | "resolved" | "unresolved";
}

export interface AuditHistoryEntry {
  iteration: number;
  virality_score: number;
  post_critiques: AuditPostCritique[];
}

export const differentialCriticSchema = z.object({
  overall_critique: z.string(),
  issue_evaluations: z.array(
    z.object({
      post_index: z.number(),
      prior_issue: z.string(),
      status: z.enum(["resolved", "unresolved"]),
      reasoning: z.string(),
    })
  ),
  new_violations: z.array(
    z.object({
      post_index: z.number(),
      violation_type: z.union([
        z.enum([
          "url",
          "em_dash",
          "asterisk",
          "formatting",
          "character_limit",
          "banned_phrase",
          "duplicate_post",
          "factual_error",
          "repetition",
          "coherence_break",
          "ai_tell",
        ]),
        z.string(),
      ]),
      critique: z.string(),
      fix_directive: z.string().optional(),
    })
  ).default([]),
  suggested_score: z.number(),
});

export type DifferentialCriticResponse = z.infer<typeof differentialCriticSchema>;

const EXPLICIT_POST_PREFIX_STRIP_REGEX = /^\[?Post\s+\d+\]?\s*[:-]\s*/i;

function stripSyntheticPostPrefix(
  candidatePost: string,
  originalPost: string | undefined
): string {
  if (!EXPLICIT_POST_PREFIX_STRIP_REGEX.test(candidatePost)) {
    return candidatePost;
  }
  if (originalPost && EXPLICIT_POST_PREFIX_STRIP_REGEX.test(originalPost)) {
    return candidatePost;
  }
  const stripped = candidatePost.replace(EXPLICIT_POST_PREFIX_STRIP_REGEX, "").trim();
  return stripped.length > 0 ? stripped : candidatePost;
}

/**
 * Surgically reconciles a revised draft with the previous draft based on flagged post indices.
 * Enforces Pillar 1 (Surgical Post Pinning):
 * All unflagged posts are pinned and guaranteed character-for-character identical to Draft_{N-1}.
 * Flagged posts are replaced by the candidate rewrite.
 *
 * @param previousDraft The previous thread draft array.
 * @param candidateDraft The new draft generated by the writer model.
 * @param flaggedIndices 1-based indices of posts requiring revision.
 */
export function reconcileSurgicalDraft(
  previousDraft: string[] | undefined | null,
  candidateDraft: string[] | undefined | null,
  flaggedIndices: number[]
): string[] {
  if (!previousDraft || previousDraft.length === 0) {
    return candidateDraft || [];
  }
  if (!candidateDraft || candidateDraft.length === 0) {
    return previousDraft;
  }
  if (!flaggedIndices || flaggedIndices.length === 0) {
    return previousDraft;
  }

  const validFlagged = flaggedIndices.filter((idx) => typeof idx === "number" && Number.isInteger(idx) && idx >= 1 && idx <= previousDraft.length);
  if (validFlagged.length === 0) {
    return previousDraft;
  }

  // If every single post is flagged and candidate draft covers the length, accept candidate
  if (validFlagged.length === previousDraft.length && candidateDraft.length >= previousDraft.length) {
    return candidateDraft.map((cand, i) =>
      typeof cand === "string" ? stripSyntheticPostPrefix(cand, previousDraft[i]) : cand
    );
  }

  const flaggedSet = new Set(validFlagged);
  const sortedFlagged = [...validFlagged].sort((a, b) => a - b);
  const flagToCandidateMap = new Map<number, string>();

  // Check if candidate items have explicit post indicators (e.g., "Post 2:" or "[Post 2]")
  const explicitlyLabeledIndices = new Set<number>();
  const consumedCandidateIndices = new Set<number>();
  candidateDraft.forEach((cand, candIdx) => {
    if (typeof cand === "string") {
      const match = cand.match(/^\[?Post\s+(\d+)\]?[:\s-]/i);
      if (match) {
        const postIdx = parseInt(match[1], 10);
        if (flaggedSet.has(postIdx) && !flagToCandidateMap.has(postIdx)) {
          flagToCandidateMap.set(
            postIdx,
            stripSyntheticPostPrefix(cand, previousDraft[postIdx - 1])
          );
          explicitlyLabeledIndices.add(postIdx);
          consumedCandidateIndices.add(candIdx);
        }
      }
    }
  });

  const remainingFlagged = sortedFlagged.filter((idx) => !explicitlyLabeledIndices.has(idx));

  if (remainingFlagged.length > 0) {
    const unconsumedCandidates = candidateDraft.filter((_, candIdx) => !consumedCandidateIndices.has(candIdx));
    const isRevisedOnlyShape =
      unconsumedCandidates.length === remainingFlagged.length &&
      candidateDraft.length < previousDraft.length;

    if (isRevisedOnlyShape) {
      // Model returned revised posts only, exact count matching remaining flagged indices.
      remainingFlagged.forEach((postIdx, k) => {
        const candidateAtPos = unconsumedCandidates[k];
        if (candidateAtPos?.trim()) {
          flagToCandidateMap.set(
            postIdx,
            stripSyntheticPostPrefix(candidateAtPos, previousDraft[postIdx - 1])
          );
        }
      });
    } else {
      // Model returned a full or near-full thread array; map by 1-based post_index
      // so candidateDraft[0] (Post 1 / Hook) never shifts onto Post 2 when length differs.
      remainingFlagged.forEach((postIdx) => {
        const candidateAtPos = candidateDraft[postIdx - 1];
        if (candidateAtPos?.trim()) {
          flagToCandidateMap.set(
            postIdx,
            stripSyntheticPostPrefix(candidateAtPos, previousDraft[postIdx - 1])
          );
        }
      });
    }
  }

  return previousDraft.map((originalPost, i) => {
    const postIndex = i + 1;
    if (flaggedSet.has(postIndex)) {
      const revised = flagToCandidateMap.get(postIndex);
      return typeof revised === "string" && revised.trim().length > 0 ? revised : originalPost;
    }
    return originalPost;
  });
}

export interface CalculateMonotonicScoreOptions {
  previousScore?: number;
  suggestedScore?: number;
  totalIssues: number;
  resolvedCount: number;
  hasNewViolations?: boolean;
}

/**
 * Calculates a monotonic score invariant enforcing Pillar 3:
 * - Guarantees Score_{N} >= Score_{N-1}.
 * - Requires all prior issues resolved, zero violations, AND suggestedScore >= 85
 *   (when provided) before granting a >= 88 pass score, preventing synthetic score inflation.
 */
export function calculateMonotonicScore(options: CalculateMonotonicScoreOptions): number {
  const {
    previousScore = 70,
    suggestedScore,
    totalIssues,
    resolvedCount,
    hasNewViolations = false,
  } = options;

  const safePrev = typeof previousScore === "number" && Number.isFinite(previousScore)
    ? Math.min(100, Math.max(0, previousScore))
    : 70;

  const safeSuggested = typeof suggestedScore === "number" && Number.isFinite(suggestedScore)
    ? Math.min(100, Math.max(0, suggestedScore))
    : undefined;

  const safeTotal = typeof totalIssues === "number" && Number.isFinite(totalIssues) && totalIssues > 0
    ? Math.floor(totalIssues)
    : 0;

  const safeResolved = typeof resolvedCount === "number" && Number.isFinite(resolvedCount) && resolvedCount > 0
    ? Math.floor(resolvedCount)
    : 0;

  const clampedResolved = Math.min(safeResolved, safeTotal);
  const isFullResolution = (safeTotal === 0 || clampedResolved === safeTotal) && !hasNewViolations;

  let calculatedScore: number;
  if (isFullResolution) {
    if (safeSuggested !== undefined && safeSuggested < 85) {
      // Do NOT snap an explicitly low critic score (< 85) across the 85-point pass line.
      calculatedScore = Math.min(84, Math.max(safePrev, safeSuggested));
    } else {
      // Passing floor (>= 88) when all prior issues are resolved with zero violations and critic concurs (>= 85)
      calculatedScore = Math.max(safePrev + 10, 88);
      if (safeSuggested !== undefined) {
        calculatedScore = Math.max(calculatedScore, safeSuggested);
      }
    }
  } else {
    // Proportional progress credit based on fraction of resolved issues
    const progressRatio = safeTotal > 0 ? clampedResolved / safeTotal : 0;
    const progressBonus = Math.round(progressRatio * 15);
    calculatedScore = Math.max(safePrev, safePrev + progressBonus);

    // If issues remain unresolved or platform violations exist:
    // suggestedScore CANNOT push an unresolved thread across the passing line (>= 85)
    if (safeSuggested !== undefined && !hasNewViolations) {
      const cappedSuggested = Math.min(84, safeSuggested);
      calculatedScore = Math.max(calculatedScore, cappedSuggested);
    }

    // When issues are unresolved or platform violations exist, cap score below the passing line (85)
    // unless previousScore was already higher (monotonicity guarantee)
    if (safePrev < 85) {
      calculatedScore = Math.min(84, calculatedScore);
    }
  }

  // Monotonic floor: Score_N >= Score_{N-1}
  calculatedScore = Math.max(safePrev, calculatedScore);
  return Math.min(100, Math.max(0, Math.round(calculatedScore)));
}

/**
 * Extracts 1-based post indices mentioned in formatting error strings (e.g., "Post 2 (Body) is ...").
 */
export function parseFlaggedPostIndicesFromErrors(critiqueText: string | undefined | null): number[] {
  if (!critiqueText) return [];
  const matches = critiqueText.matchAll(/Posts?\s*#?\s*(\d+)/gi);
  const indices = new Set<number>();
  for (const match of matches) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0) {
      indices.add(num);
    }
  }
  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Builds the <PINNED_POSTS> prompt context for ThreadWriterNode when operating in Surgical Mode.
 */
export function buildSurgicalWriterContext(
  previousDraft: string[],
  flaggedIndices: number[]
): { pinnedPostsContext: string; isSurgical: boolean; pinnedIndices: number[] } {
  if (!previousDraft || previousDraft.length === 0 || !flaggedIndices || flaggedIndices.length === 0) {
    return { pinnedPostsContext: "", isSurgical: false, pinnedIndices: [] };
  }

  const validFlagged = flaggedIndices.filter((idx) => typeof idx === "number" && Number.isInteger(idx) && idx >= 1 && idx <= previousDraft.length);
  if (validFlagged.length === 0 || validFlagged.length >= previousDraft.length) {
    return { pinnedPostsContext: "", isSurgical: false, pinnedIndices: [] };
  }

  const flaggedSet = new Set(validFlagged);
  const pinnedIndices: number[] = [];
  const pinnedLines: string[] = [];

  previousDraft.forEach((post, i) => {
    const postIdx = i + 1;
    if (!flaggedSet.has(postIdx)) {
      pinnedIndices.push(postIdx);
      pinnedLines.push(`Post ${postIdx} (PINNED - DO NOT MODIFY):\n"${post}"`);
    }
  });

  if (pinnedIndices.length === 0) {
    return { pinnedPostsContext: "", isSurgical: false, pinnedIndices: [] };
  }

  const sortedFlagged = [...flaggedSet].sort((a, b) => a - b);
  const pinnedPostsContext =
    "\n\n<PINNED_POSTS>\n" +
    "The following posts are PINNED and already approved. Do NOT alter or rephrase them:\n" +
    pinnedLines.join("\n\n") +
    `\n\nSURGICAL REWRITE DIRECTIVE: You must revise ONLY the flagged posts (Post ${sortedFlagged.join(", ")}). Output the complete ${previousDraft.length}-post thread_draft array keeping all unflagged posts verbatim at their original positions, with no "Post N:" prefix labels inside the strings.\n` +
    "</PINNED_POSTS>";

  return {
    pinnedPostsContext,
    isSurgical: true,
    pinnedIndices,
  };
}

/**
 * Shared character validation runner used across all thread generation graphs.
 */
export async function runCharacterValidation(
  validatorTool: { invoke: (input: { thread_draft: string[] }, config?: RunnableConfig) => Promise<string> },
  threadDraft: string[],
  retries: Record<string, number> | undefined,
  config?: RunnableConfig
) {
  const validationStr = await validatorTool.invoke(
    { thread_draft: threadDraft },
    { ...config, timeout: 60000 }
  );
  const validation = JSON.parse(validationStr) as { isValid: boolean; errors: string[] };

  if (!validation.isValid) {
    return {
      is_character_valid: false,
      character_critique: `FORMATTING ERRORS REQUIRED TO FIX:\n${validation.errors.join("\n")}`,
      retries: { ...(retries || {}), validator: (retries?.validator || 0) + 1 },
    };
  }

  return {
    is_character_valid: true,
    character_critique: "",
  };
}

export interface BuildHookWriterContextOptions {
  selectedHook?: string;
  isPost1Flagged: boolean;
  tagName?: "HOOK" | "SELECTED_HOOK";
}

/**
 * Formats the hook context for ThreadWriterNode:
 * - On initial drafts or rewrites where Post 1 is unflagged, preserves `<HOOK>`/`<SELECTED_HOOK>` as law.
 * - When Critic or CharacterValidator explicitly flagged Post 1 (`isPost1Flagged === true`),
 *   suppresses the verbatim-hook mandate and emits `<HOOK_OVERRIDE_REQUIRED>` so fix directives take precedence.
 */
export function buildHookWriterContext({
  selectedHook,
  isPost1Flagged,
  tagName = "HOOK",
}: BuildHookWriterContextOptions): string {
  const hookText = selectedHook || "";
  if (!isPost1Flagged) {
    return `<${tagName}>\n${hookText}\n</${tagName}>`;
  }
  return [
    "<HOOK_OVERRIDE_REQUIRED>",
    "Post 1 from the previous draft was flagged by Critic/Validator audit and MUST be rewritten to satisfy the Post 1 critique and fix directives.",
    `Override any "The Hook is Law" or verbatim-${tagName} rule for Post 1: implement the Post 1 fix directive even if that changes the opening phrasing, angle, or claim.`,
    hookText ? `Superseded initial hook (reference only, do NOT preserve verbatim): ${hookText}` : "",
    "</HOOK_OVERRIDE_REQUIRED>",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Combines differential critic post critiques and character validator errors
 * to determine surgical post-pinning indices and formatted context strings.
 */
export function buildWriterRevisionContext(params: {
  threadDraft?: string[];
  critique?: string;
  postCritiques?: Array<{
    post_index: number;
    critique?: string;
    fix_directive?: string;
    status?: "open" | "resolved" | "unresolved";
  }>;
  characterCritique?: string;
  guidance?: string;
}) {
  const previousDraftContext =
    params.threadDraft && params.threadDraft.length > 0
      ? `\n\n<PREVIOUS_THREAD_DRAFT>\n${JSON.stringify(params.threadDraft, null, 2)}\n</PREVIOUS_THREAD_DRAFT>`
      : "";
  const critiqueContext = params.critique
    ? `\n\n<CRITIQUE_TO_ADDRESS>\n${params.critique}\n</CRITIQUE_TO_ADDRESS>`
    : "";
  const actionable = filterActionablePostCritiques(params.postCritiques);
  const postCritiquesContext =
    actionable.length > 0
      ? "\n\n<POST_SPECIFIC_CRITIQUES>\n" +
        actionable
          .map(
            (pc) =>
              `Post ${pc.post_index}: ${pc.critique}${
                pc.fix_directive ? `\nFix Directive: ${pc.fix_directive}` : ""
              }`
          )
          .join("\n\n") +
        "\n</POST_SPECIFIC_CRITIQUES>"
      : "";
  const charCritiqueContext = params.characterCritique
    ? `\n\n<CHARACTER_AND_FORMATTING_CONSTRAINTS_FAILED>\n${params.characterCritique}\nFix the previous draft to respect these exact formatting constraints.\n</CHARACTER_AND_FORMATTING_CONSTRAINTS_FAILED>`
    : "";
  const guidanceContext = params.guidance
    ? `\n\n<ADDITIONAL_GUIDANCE>\n${params.guidance}\n</ADDITIONAL_GUIDANCE>`
    : "";

  const draft = params.threadDraft || [];
  const formattingFlagged = parseFlaggedPostIndicesFromErrors(params.characterCritique);
  const allFlaggedIndices = Array.from(
    new Set([...actionable.map((pc) => pc.post_index), ...formattingFlagged])
  );
  const isPost1Flagged = allFlaggedIndices.includes(1);
  const flaggedIndices = allFlaggedIndices.filter(
    (idx) => draft.length > 0 && idx >= 1 && idx <= draft.length
  );

  const isSurgical =
    draft.length > 0 &&
    flaggedIndices.length > 0 &&
    flaggedIndices.length < draft.length;

  const { pinnedPostsContext } = isSurgical
    ? buildSurgicalWriterContext(draft, flaggedIndices)
    : { pinnedPostsContext: "" };

  return {
    actionable,
    previousDraftContext,
    critiqueContext,
    postCritiquesContext,
    charCritiqueContext,
    guidanceContext,
    pinnedPostsContext,
    isSurgical,
    isPost1Flagged,
    flaggedIndices,
  };
}

export interface BuildDifferentialCriticPromptOptions {
  iterations: number;
  priorActionableCritiques: ActionablePostCritique[];
  threadDraft: string[];
  previousThreadDraft?: string[];
  sourceContext?: string;
  extraContext?: string;
  deltaContext?: string;
  guidanceContext?: string;
}

/**
 * Formats the user prompt payload for Differential Critic Mode (Iteration >= 2)
 * with source/dossier grounding and modified-post indicators.
 */
export function buildDifferentialCriticUserPrompt({
  iterations,
  priorActionableCritiques,
  threadDraft,
  previousThreadDraft,
  sourceContext = "",
  extraContext = "",
  deltaContext = "",
  guidanceContext = "",
}: BuildDifferentialCriticPromptOptions): string {
  const priorPunchlistStr = priorActionableCritiques
    .map(
      (pc) =>
        `Post ${pc.post_index}: ${pc.critique}${
          pc.fix_directive ? `\nFix Directive: ${pc.fix_directive}` : ""
        }`
    )
    .join("\n\n");

  const modifiedIndices: number[] = [];
  if (Array.isArray(previousThreadDraft) && previousThreadDraft.length > 0) {
    const maxLen = Math.max(previousThreadDraft.length, threadDraft.length);
    for (let i = 0; i < maxLen; i++) {
      if (previousThreadDraft[i] !== threadDraft[i]) {
        modifiedIndices.push(i + 1);
      }
    }
  }

  const prevDraftBlock =
    Array.isArray(previousThreadDraft) && previousThreadDraft.length > 0
      ? `\n\n<PREVIOUS_THREAD_DRAFT>\n${JSON.stringify(previousThreadDraft, null, 2)}\n</PREVIOUS_THREAD_DRAFT>`
      : "";

  const modifiedBlock =
    modifiedIndices.length > 0
      ? `\n\n<MODIFIED_POST_INDICES>\n${modifiedIndices.map((idx) => `Post ${idx}`).join(", ")}\n</MODIFIED_POST_INDICES>`
      : "";

  return `<CURRENT_ITERATION_ATTEMPT>\n${iterations + 1}\n</CURRENT_ITERATION_ATTEMPT>${sourceContext}${extraContext}${deltaContext}\n\n<PRIOR_ISSUES_PUNCHLIST>\n${priorPunchlistStr}\n</PRIOR_ISSUES_PUNCHLIST>${prevDraftBlock}${modifiedBlock}\n\n<THREAD>\n${JSON.stringify(threadDraft, null, 2)}\n</THREAD>${guidanceContext}`;
}

const MECHANICAL_VIOLATION_TYPES = new Set([
  "url",
  "em_dash",
  "asterisk",
  "character_limit",
  "formatting",
  "banned_phrase",
]);

const THREAD_WIDE_SEMANTIC_VIOLATIONS = new Set([
  "factual_error",
  "repetition",
]);

const EDIT_SCOPED_SEMANTIC_VIOLATIONS = new Set([
  "coherence_break",
  "ai_tell",
]);

function normalizePostForSimilarity(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTokenAndBigramSets(normalizedText: string): {
  tokens: string[];
  tokenSet: Set<string>;
  bigrams: Set<string>;
} {
  const tokens = normalizedText.split(" ").filter(Boolean);
  const tokenSet = new Set(tokens);
  const bigrams = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.add(`${tokens[i]}::${tokens[i + 1]}`);
  }
  return { tokens, tokenSet, bigrams };
}

function computeJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function verifyMechanicalViolation(postText: string, violationType: string): boolean {
  const vType = violationType.toLowerCase().trim();
  if (vType === "url") {
    return /(https?:\/\/[^\s]+|www\.[^\s]+)/i.test(postText);
  }
  if (vType === "em_dash") {
    return /(\u2014|\u2013|--)/.test(postText);
  }
  if (vType === "asterisk") {
    return /\*/.test(postText);
  }
  if (vType === "character_limit") {
    return postText.length > 500;
  }
  if (vType === "formatting") {
    const lineBreaks = (postText.match(/\n/g) || []).length;
    const hasMarkdown = /(__|~~|`|#\s+|>+\s+|\[.*?\]\(.*?\))/.test(postText);
    return lineBreaks > 4 || postText.length > 500 || hasMarkdown;
  }
  if (vType === "banned_phrase") {
    const lower = postText.toLowerCase();
    return BANNED_ENGAGEMENT_PHRASES.some((phrase) => lower.includes(phrase));
  }
  return false;
}

export interface DeterministicDraftRegression {
  post_index: number;
  violation_type: string;
  critique: string;
  fix_directive: string;
}

/**
 * Runs deterministic post-rewrite sanity checks across a drafted thread:
 * 1. Exact and high-overlap near-duplicate posts across the thread.
 * 2. Hard mechanical platform rules (URL, em/en dash, asterisk, formatting, >500 chars, banned phrase).
 * 3. Synthetic "Post N:" prefix leaks when absent from the prior draft.
 */
export function detectDeterministicDraftRegressions(
  threadDraft: string[],
  previousDraft?: string[]
): DeterministicDraftRegression[] {
  const regressions: DeterministicDraftRegression[] = [];
  if (!Array.isArray(threadDraft) || threadDraft.length === 0) {
    return regressions;
  }

  const normalizedEntries = threadDraft.map((post) => {
    const text = typeof post === "string" ? post : "";
    const norm = normalizePostForSimilarity(text);
    return { text, norm, ...buildTokenAndBigramSets(norm) };
  });

  const duplicateFlagged = new Set<number>();
  for (let i = 0; i < normalizedEntries.length; i++) {
    const first = normalizedEntries[i];
    if (!first.norm) continue;

    for (let j = i + 1; j < normalizedEntries.length; j++) {
      if (duplicateFlagged.has(j)) continue;
      const second = normalizedEntries[j];
      if (!second.norm) continue;

      if (first.norm === second.norm) {
        duplicateFlagged.add(j);
        regressions.push({
          post_index: j + 1,
          violation_type: "duplicate_post",
          critique: `Post ${j + 1} is an exact duplicate of Post ${i + 1}.`,
          fix_directive: `Rewrite Post ${j + 1} with distinct facts, mechanism, or progression instead of repeating Post ${i + 1}.`,
        });
        continue;
      }

      if (first.tokens.length >= 6 && second.tokens.length >= 6) {
        const tokenSim = computeJaccard(first.tokenSet, second.tokenSet);
        const bigramSim = computeJaccard(first.bigrams, second.bigrams);
        if (tokenSim >= 0.72 && bigramSim >= 0.55) {
          duplicateFlagged.add(j);
          regressions.push({
            post_index: j + 1,
            violation_type: "duplicate_post",
            critique: `Post ${j + 1} closely duplicates Post ${i + 1} (${Math.round(tokenSim * 100)}% word overlap).`,
            fix_directive: `Rewrite Post ${j + 1} to introduce genuinely new information rather than paraphrasing Post ${i + 1}.`,
          });
        }
      }
    }
  }

  const mechanicalTypes = ["url", "em_dash", "asterisk", "character_limit", "formatting", "banned_phrase"] as const;
  for (let i = 0; i < normalizedEntries.length; i++) {
    const postText = normalizedEntries[i].text;
    const postIndex = i + 1;

    if (
      previousDraft &&
      EXPLICIT_POST_PREFIX_STRIP_REGEX.test(postText) &&
      !EXPLICIT_POST_PREFIX_STRIP_REGEX.test(previousDraft[i] || "")
    ) {
      regressions.push({
        post_index: postIndex,
        violation_type: "formatting",
        critique: `Post ${postIndex} contains an unintended "Post N:" prefix label.`,
        fix_directive: `Remove the leading "Post ${postIndex}:" label while keeping the post content intact.`,
      });
    }

    for (const mType of mechanicalTypes) {
      if (verifyMechanicalViolation(postText, mType)) {
        regressions.push({
          post_index: postIndex,
          violation_type: mType,
          critique: `Deterministic check detected ${mType} violation in Post ${postIndex}.`,
          fix_directive: `Remove ${mType} violation immediately.`,
        });
      }
    }
  }

  return regressions;
}

export interface ProcessDifferentialEvaluationOptions {
  threadDraft: string[];
  previousThreadDraft?: string[];
  editablePostIndices?: number[];
  iterations: number;
  previousScore?: number;
  bestThreadDraft?: string[];
  bestViralityScore?: number;
  auditHistory?: AuditHistoryEntry[];
  priorActionableCritiques: ActionablePostCritique[];
  structuredResponse: DifferentialCriticResponse;
}

export interface DifferentialEvaluationResult {
  is_approved: boolean;
  critique: string;
  virality_score: number;
  post_critiques: ActionablePostCritique[];
  best_thread_draft: string[];
  best_virality_score: number;
  audit_history: AuditHistoryEntry[];
}

/**
 * Reconciles differential critic evaluations for Iteration >= 2 across all thread factories.
 * Enforces:
 * - Pillar 2 (Change-Scoped Closed-World Audit): Unchanged, unflagged posts are shielded from
 *   subjective style churn, while flagged/rewritten posts, factual regressions, repetition,
 *   and deterministic duplicates/platform defects are strictly caught.
 * - Pillar 3 (Algorithmic Score Monotonicity): Guaranteed floor Score_N >= Score_{N-1} without
 *   synthetically inflating weak (< 85 suggested) drafts into automatic approval.
 * - Pillar 4 (Pareto Checkpointing): Tracks best performing thread draft and score frontier.
 */
export function processDifferentialEvaluation(
  options: ProcessDifferentialEvaluationOptions
): DifferentialEvaluationResult {
  const {
    threadDraft,
    previousThreadDraft,
    editablePostIndices,
    iterations,
    previousScore = 70,
    bestThreadDraft,
    bestViralityScore,
    auditHistory = [],
    priorActionableCritiques,
    structuredResponse,
  } = options;

  const {
    overall_critique = "",
    issue_evaluations = [],
    new_violations = [],
    suggested_score,
  } = structuredResponse;

  // 1. Map prior issues and evaluate ONLY legitimate punchlist items (Pillar 2: Closed-World Invariant)
  const remainingIndices = new Set(priorActionableCritiques.map((_, i) => i));
  const normalizeIssueKey = (text: string) => text.trim().toLowerCase();

  // Match each evaluation from the model to the exact prior issue (same post_index + closest issue text)
  const matchedPriorIndices = new Map<number, (typeof issue_evaluations)[0]>();
  for (const evalItem of issue_evaluations) {
    const evalText = normalizeIssueKey(evalItem.prior_issue || "");
    let matchedIdx: number | undefined;

    for (const idx of remainingIndices) {
      const prior = priorActionableCritiques[idx];
      if (prior.post_index !== evalItem.post_index) continue;
      const priorText = normalizeIssueKey(prior.critique || "");
      if (evalText && priorText && (evalText === priorText || priorText.includes(evalText) || evalText.includes(priorText))) {
        matchedIdx = idx;
        break;
      }
    }

    // Fallback to first unmatched prior issue on that post_index if wording drifted
    if (matchedIdx === undefined) {
      for (const idx of remainingIndices) {
        if (priorActionableCritiques[idx].post_index === evalItem.post_index) {
          matchedIdx = idx;
          break;
        }
      }
    }

    if (matchedIdx !== undefined) {
      remainingIndices.delete(matchedIdx);
      matchedPriorIndices.set(matchedIdx, evalItem);
    }
  }

  const unresolvedEvaluations: AuditPostCritique[] = [];
  let resolvedCount = 0;

  for (let i = 0; i < priorActionableCritiques.length; i++) {
    const prior = priorActionableCritiques[i];
    const evaluation = matchedPriorIndices.get(i);
    if (evaluation && evaluation.status === "resolved") {
      resolvedCount++;
    } else {
      unresolvedEvaluations.push({
        post_index: prior.post_index,
        critique: prior.critique,
        fix_directive: prior.fix_directive || evaluation?.reasoning || "Resolve defect from prior iteration.",
        status: "unresolved" as const,
      });
    }
  }

  // Track posts eligible for change-scoped semantic review (flagged prior or modified vs previousThreadDraft)
  const editablePostSet = new Set<number>([
    ...priorActionableCritiques.map((pc) => pc.post_index),
    ...(editablePostIndices || []),
  ]);
  if (Array.isArray(previousThreadDraft)) {
    const maxLen = Math.max(previousThreadDraft.length, threadDraft.length);
    for (let i = 0; i < maxLen; i++) {
      if (previousThreadDraft[i] !== threadDraft[i]) {
        editablePostSet.add(i + 1);
      }
    }
  }

  // 2. Validate LLM new_violations + merge deterministic post-rewrite sanity checks
  const verifiedViolations: AuditPostCritique[] = [];
  const recordedViolationKeys = new Set<string>();

  const recordVerifiedViolation = (params: {
    post_index: number;
    vType: string;
    critique: string;
    fix_directive: string;
  }) => {
    const dedupeKey = `${params.post_index}::${params.vType}`;
    if (recordedViolationKeys.has(dedupeKey)) {
      return;
    }
    recordedViolationKeys.add(dedupeKey);

    const existingViolation = verifiedViolations.find((vi) => vi.post_index === params.post_index);
    if (existingViolation) {
      existingViolation.critique += ` | [New Platform Violation - ${params.vType}]: ${params.critique}`;
      existingViolation.fix_directive = existingViolation.fix_directive
        ? `${existingViolation.fix_directive}; ${params.fix_directive}`
        : params.fix_directive;
    } else {
      verifiedViolations.push({
        post_index: params.post_index,
        critique: `[New Platform Violation - ${params.vType}]: ${params.critique}`,
        fix_directive: params.fix_directive,
        status: "open" as const,
      });
    }
  };

  for (const v of new_violations) {
    if (typeof v.post_index !== "number" || v.post_index < 1 || v.post_index > threadDraft.length) {
      continue;
    }
    const postText = threadDraft[v.post_index - 1] || "";
    const vType = (v.violation_type || "").toLowerCase().trim();
    const customFix = (v.fix_directive || "").trim();

    if (MECHANICAL_VIOLATION_TYPES.has(vType)) {
      if (verifyMechanicalViolation(postText, vType)) {
        recordVerifiedViolation({
          post_index: v.post_index,
          vType,
          critique: v.critique,
          fix_directive: customFix || `Remove ${vType} violation immediately.`,
        });
      }
      continue;
    }

    if (vType === "duplicate_post") {
      // Verified deterministically below (prevents hallucinated duplicate claims on distinct posts)
      continue;
    }

    if (THREAD_WIDE_SEMANTIC_VIOLATIONS.has(vType)) {
      recordVerifiedViolation({
        post_index: v.post_index,
        vType,
        critique: v.critique,
        fix_directive: customFix || v.critique || `Resolve ${vType} immediately.`,
      });
      continue;
    }

    if (EDIT_SCOPED_SEMANTIC_VIOLATIONS.has(vType) && editablePostSet.has(v.post_index)) {
      recordVerifiedViolation({
        post_index: v.post_index,
        vType,
        critique: v.critique,
        fix_directive: customFix || v.critique || `Resolve ${vType} in edited post.`,
      });
    }
  }

  // Deterministic pass guarantees duplicates or missed platform violations cannot slip past LLM auditor
  const deterministicRegressions = detectDeterministicDraftRegressions(threadDraft, previousThreadDraft);
  for (const reg of deterministicRegressions) {
    recordVerifiedViolation({
      post_index: reg.post_index,
      vType: reg.violation_type,
      critique: reg.critique,
      fix_directive: reg.fix_directive,
    });
  }

  // 3. Score calculation (Pillar 3)
  const totalIssues = priorActionableCritiques.length;
  const hasNewViolations = verifiedViolations.length > 0;
  const calculatedScore = calculateMonotonicScore({
    previousScore,
    suggestedScore: suggested_score,
    totalIssues,
    resolvedCount,
    hasNewViolations,
  });

  const nextPostCritiques = [...unresolvedEvaluations, ...verifiedViolations];
  const is_approved = calculatedScore >= 85 && nextPostCritiques.length === 0;

  // 4. Pareto Frontier Checkpointing (Pillar 4)
  let best_thread_draft = bestThreadDraft || threadDraft;
  let best_virality_score = bestViralityScore ?? calculatedScore;
  if (calculatedScore > (bestViralityScore ?? -1)) {
    best_virality_score = calculatedScore;
    best_thread_draft = threadDraft;
  }

  // 5. Audit History Logging
  const auditEntry: AuditHistoryEntry = {
    iteration: iterations + 1,
    virality_score: calculatedScore,
    post_critiques: [
      ...priorActionableCritiques.map((prior, idx) => {
        const evalItem = matchedPriorIndices.get(idx);
        const status = evalItem?.status === "resolved" ? ("resolved" as const) : ("unresolved" as const);
        return {
          post_index: prior.post_index,
          critique: prior.critique,
          fix_directive: prior.fix_directive,
          status,
        };
      }),
      ...verifiedViolations,
    ],
  };
  const updatedAuditHistory = [...auditHistory, auditEntry];

  return {
    is_approved,
    critique: overall_critique || "",
    virality_score: calculatedScore,
    post_critiques: nextPostCritiques,
    best_thread_draft,
    best_virality_score,
    audit_history: updatedAuditHistory,
  };
}


