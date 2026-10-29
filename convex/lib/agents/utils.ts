"use node";

import {
  BaseChatModel,
  BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { BaseMessage, AIMessage, AIMessageChunk } from "@langchain/core/messages";
import { ChatResult } from "@langchain/core/outputs";
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

export interface AgentConfig {
  tools?: Parameters<typeof createAgent>[0]["tools"];
  systemPrompt: string;
  responseFormat?: unknown;
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

/**
 * Iterates through an array of models/agents, attempting to invoke them sequentially.
 * If one fails or times out, it catches the error and proceeds to the next model with a fresh timeout.
 * Allows per-model timeout overrides via withTimeout.
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
  const { timeout: defaultTimeoutMs, signal: parentSignal, ...restConfig } = options ?? {};
  let lastError: unknown;

  // Check if all candidates are currently tripped; if so, fail open to avoid total deadlock
  const allTripped =
    runnables.length > 0 &&
    runnables.every((candidate) => {
      const identity = getModelIdentity(candidate);
      return identity && !modelCircuitBreaker.isAvailable(identity).available;
    });

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
    const identity = getModelIdentity(candidate);

    // 1. Circuit breaker check (bypassed if all candidates in the list are tripped)
    if (!allTripped && identity) {
      const cbStatus = modelCircuitBreaker.isAvailable(identity);
      if (!cbStatus.available) {
        console.warn(
          `[CircuitBreaker] Skipping candidate at index ${i} (${identity.modelId} on ${identity.keyGroup}): ${cbStatus.reason}`
        );
        continue;
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
      if (identity) {
        modelCircuitBreaker.recordSuccess(identity);
      }
      return result;
    } catch (e) {
      console.warn(`[Agent Fallback] Model at index ${i} failed/timed out. Trying next...`, e);
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
    const firstIdentity = getModelIdentity(candidates[0]);
    if (firstIdentity?.modelId) {
      this.name = firstIdentity.modelId;
    }
  }

  _llmType(): string {
    return "fallback_chat_model";
  }

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
    const rawResult = await invokeWithFallbacks<BaseLanguageModelInput, unknown>(
      this.candidates as FallbackCandidate<BaseLanguageModelInput, unknown>[],
      input,
      options as RunnableConfig
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
        content: typeof obj.content === "string" ? obj.content : safeStringify(obj.content),
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
          text: typeof aiMessage.content === "string" ? aiMessage.content : safeStringify(aiMessage.content),
          message: aiMessage,
        },
      ],
      llmOutput: aiMessage.usage_metadata ? { tokenUsage: aiMessage.usage_metadata } : undefined,
    };
  }
}

/**
 * Builds a resilient agent configured with a FallbackChatModel,
 * preserving any custom per-model timeout overrides and ModelIdentity metadata.
 * Executes model fallbacks within the single agent graph so intermediate tool executions,
 * web searches, and message history are never lost if a model fails during multi-turn loops.
 * @param models Array of Chat models or model objects with custom timeouts.
 * @param config The shared tools, prompt, and response schema.
 */
export function buildAgents<T extends Record<string, unknown> = Record<string, unknown>>(
  models: AgentCandidate[],
  config: AgentConfig
): FallbackCandidate<unknown, AgentResponse<T>>[] {
  if (models.length === 0) return [];

  const fallbackModel = new FallbackChatModel(models);

  const agent = config.responseFormat !== undefined
    ? createAgent({
        model: fallbackModel,
        tools: config.tools || [],
        systemPrompt: config.systemPrompt,
        responseFormat: config.responseFormat as never,
      })
    : createAgent({
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
        z.enum(["url", "em_dash", "asterisk", "formatting", "character_limit", "banned_phrase"]),
        z.string(),
      ]),
      critique: z.string(),
    })
  ).default([]),
  suggested_score: z.number(),
});

export type DifferentialCriticResponse = z.infer<typeof differentialCriticSchema>;

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
    return candidateDraft;
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
          flagToCandidateMap.set(postIdx, cand);
          explicitlyLabeledIndices.add(postIdx);
          consumedCandidateIndices.add(candIdx);
        }
      }
    }
  });

  const remainingFlagged = sortedFlagged.filter((idx) => !explicitlyLabeledIndices.has(idx));

  if (remainingFlagged.length > 0) {
    if (candidateDraft.length === previousDraft.length) {
      // Model returned a full thread array; map by 1-based post_index
      remainingFlagged.forEach((postIdx) => {
        const candidateAtPos = candidateDraft[postIdx - 1];
        if (candidateAtPos?.trim()) {
          flagToCandidateMap.set(postIdx, candidateAtPos);
        }
      });
    } else {
      // Model returned revised posts only.
      // Map remaining unconsumed candidates in order to remaining flagged indices.
      const unconsumedCandidates = candidateDraft.filter((_, candIdx) => !consumedCandidateIndices.has(candIdx));
      remainingFlagged.forEach((postIdx, k) => {
        const candidateAtPos = unconsumedCandidates[k];
        if (candidateAtPos?.trim()) {
          flagToCandidateMap.set(postIdx, candidateAtPos);
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
 * Score_{N} = min(100, max(Score_{N-1}, RawScore_N) + sum_{j in Resolved} Delta_j)
 * Guarantees Score_{N} >= Score_{N-1}.
 * If all prior issues are resolved and zero platform penalties exist, score is guaranteed >= 88.
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
    // Guaranteed pass floor (>= 88) when all prior issues are resolved with zero violations
    calculatedScore = Math.max(safePrev + 10, 88);
    if (safeSuggested !== undefined) {
      calculatedScore = Math.max(calculatedScore, safeSuggested);
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
    `\n\nSURGICAL REWRITE DIRECTIVE: You must revise ONLY the flagged posts (Post ${sortedFlagged.join(", ")}). Keep all unflagged posts identical.\n` +
    "</PINNED_POSTS>";

  return {
    pinnedPostsContext,
    isSurgical: true,
    pinnedIndices,
  };
}

export interface ProcessDifferentialEvaluationOptions {
  threadDraft: string[];
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
 * - Pillar 2 (Closed-World Audit Registry): Filters out any new subjective critiques on unflagged posts.
 * - Pillar 3 (Algorithmic Score Monotonicity): Guaranteed floor Score_N >= Score_{N-1} and pass >= 88.
 * - Pillar 4 (Pareto Checkpointing): Tracks best performing thread draft and score frontier.
 */
export function processDifferentialEvaluation(
  options: ProcessDifferentialEvaluationOptions
): DifferentialEvaluationResult {
  const {
    threadDraft,
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
  const priorIssuesMap = new Map(priorActionableCritiques.map((pc) => [pc.post_index, pc]));
  const evaluationsByPost = new Map<number, (typeof issue_evaluations)[0]>();
  for (const evalItem of issue_evaluations) {
    if (priorIssuesMap.has(evalItem.post_index)) {
      evaluationsByPost.set(evalItem.post_index, evalItem);
    }
  }

  const unresolvedEvaluations: AuditPostCritique[] = [];
  let resolvedCount = 0;

  for (const prior of priorActionableCritiques) {
    const evaluation = evaluationsByPost.get(prior.post_index);
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

  // 2. Validate and filter new violations: must be in-bounds and verified against actual content
  const allowedViolationTypes = new Set(["url", "em_dash", "asterisk", "character_limit", "formatting", "banned_phrase"]);
  const verifiedViolations: AuditPostCritique[] = [];
  for (const v of new_violations) {
    if (typeof v.post_index !== "number" || v.post_index < 1 || v.post_index > threadDraft.length) {
      continue;
    }
    const postText = threadDraft[v.post_index - 1] || "";
    const vType = (v.violation_type || "").toLowerCase().trim();

    // Reject non-platform/subjective critiques (Pillar 2: Closed-World Invariant)
    if (!allowedViolationTypes.has(vType)) {
      continue;
    }

    // Objective deterministic content verification against postText
    let isGenuineViolation = false;
    if (vType === "url") {
      isGenuineViolation = /(https?:\/\/[^\s]+|www\.[^\s]+)/i.test(postText);
    } else if (vType === "em_dash") {
      isGenuineViolation = /(\u2014|\u2013|--)/.test(postText);
    } else if (vType === "asterisk") {
      isGenuineViolation = /\*/.test(postText);
    } else if (vType === "character_limit") {
      isGenuineViolation = postText.length > 500;
    } else if (vType === "formatting") {
      const lineBreaks = (postText.match(/\n/g) || []).length;
      const hasMarkdown = /(__|~~|`|#\s+|>+\s+|\[.*?\]\(.*?\))/.test(postText);
      isGenuineViolation = lineBreaks > 4 || postText.length > 500 || hasMarkdown;
    } else if (vType === "banned_phrase") {
      const lower = postText.toLowerCase();
      isGenuineViolation = BANNED_ENGAGEMENT_PHRASES.some((phrase) => lower.includes(phrase));
    }

    if (isGenuineViolation) {
      const existingViolation = verifiedViolations.find((vi) => vi.post_index === v.post_index);
      if (existingViolation) {
        existingViolation.critique += ` | [New Platform Violation - ${v.violation_type}]: ${v.critique}`;
        existingViolation.fix_directive += ` and ${v.violation_type}`;
      } else {
        verifiedViolations.push({
          post_index: v.post_index,
          critique: `[New Platform Violation - ${v.violation_type}]: ${v.critique}`,
          fix_directive: `Remove ${v.violation_type} violation immediately.`,
          status: "open" as const,
        });
      }
    }
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
      ...priorActionableCritiques.map((prior) => {
        const evalItem = evaluationsByPost.get(prior.post_index);
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


