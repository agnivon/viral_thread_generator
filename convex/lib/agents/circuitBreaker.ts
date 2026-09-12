"use node";

import { AsyncLocalStorage } from "node:async_hooks";
import { internal } from "../../_generated/api.js";
import type { ActionCtx } from "../../_generated/server.js";

export interface PersistentTripEntry {
  type: "key" | "model" | "key_model";
  target: string;
  trippedUntil: number;
  reason: string;
  category: string;
}

interface AsyncContextStore {
  ctx: ActionCtx;
  pendingMutations: Set<Promise<unknown>>;
}

const asyncContextStorage = new AsyncLocalStorage<AsyncContextStore>();

export interface ModelIdentity {
  provider: "google" | "openai" | "deepseek" | "openrouter";
  keyGroup: string;
  modelId: string;
}

export const MODEL_IDENTITY = Symbol("MODEL_IDENTITY");

/**
 * Attaches metadata to a model or runnable for identification in fallback chains.
 */
export function attachModelIdentity<T extends object>(target: T, identity: ModelIdentity): T {
  Object.defineProperty(target, MODEL_IDENTITY, {
    value: identity,
    writable: false,
    enumerable: false,
    configurable: true,
  });
  return target;
}

/**
 * Resolves ModelIdentity from a model, agent, or runnable wrapper (e.g. RunnableBinding, withTimeout).
 */
export function getModelIdentity(candidate: unknown): ModelIdentity | undefined {
  if (!candidate || (typeof candidate !== "object" && typeof candidate !== "function")) {
    return undefined;
  }

  const obj = candidate as Record<string, unknown> & {
    [MODEL_IDENTITY]?: ModelIdentity;
    runnable?: unknown;
    bound?: unknown;
    model?: unknown;
    first?: unknown;
    steps?: unknown[];
  };

  if (obj[MODEL_IDENTITY]) {
    return obj[MODEL_IDENTITY];
  }

  if (obj.runnable) {
    const meta = getModelIdentity(obj.runnable);
    if (meta) return meta;
  }

  if (obj.bound) {
    const meta = getModelIdentity(obj.bound);
    if (meta) return meta;
  }

  if (obj.model) {
    const meta = getModelIdentity(obj.model);
    if (meta) return meta;
  }

  if (obj.first) {
    const meta = getModelIdentity(obj.first);
    if (meta) return meta;
  }

  if (Array.isArray(obj.steps) && obj.steps.length > 0) {
    const meta = getModelIdentity(obj.steps[0]);
    if (meta) return meta;
  }

  return undefined;
}

export type SkipScope = "key" | "model" | "key_model" | "none";

export interface ModelErrorClassification {
  status?: number;
  code?: string;
  category:
    | "RATE_LIMIT_429"
    | "SERVICE_UNAVAILABLE_503"
    | "AUTH_ERROR_401_403"
    | "SERVER_ERROR_500_502"
    | "CONTEXT_LIMIT_400"
    | "TIMEOUT"
    | "UNKNOWN";
  skipScope: SkipScope;
  cooldownMs: number;
  reason: string;
}

function parseStatusCode(val: unknown): number | undefined {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 100 && parsed <= 599) return parsed;
  }
  return undefined;
}

function extractErrorDetails(error: unknown): {
  status?: number;
  code?: string;
  message: string;
} {
  let current: unknown = error;
  let status: number | undefined;
  let code: string | undefined;
  let combinedMessage = "";
  const visited = new Set<unknown>();

  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const err = current as Record<string, unknown>;

    if (typeof err.message === "string" && err.message) {
      combinedMessage += (combinedMessage ? " | " : "") + err.message;
    }

    if (status === undefined) {
      status =
        parseStatusCode(err.status) ??
        parseStatusCode(err.statusCode) ??
        parseStatusCode((err.response as Record<string, unknown> | undefined)?.status) ??
        parseStatusCode((err.error as Record<string, unknown> | undefined)?.code);
    }

    if (code === undefined) {
      if (typeof err.code === "string") {
        code = err.code;
      } else if (typeof (err.error as Record<string, unknown> | undefined)?.code === "string") {
        code = (err.error as Record<string, unknown>).code as string;
      } else if (typeof (err.error as Record<string, unknown> | undefined)?.status === "string") {
        code = (err.error as Record<string, unknown>).status as string;
      }
    }

    current = err.cause ?? err.error;
  }

  if (!combinedMessage) {
    if (error instanceof Error) {
      combinedMessage = error.message;
    } else if (typeof error === "string") {
      combinedMessage = error;
    } else {
      combinedMessage = "";
    }
  }

  return { status, code, message: combinedMessage };
}

export const CIRCUIT_COOLDOWNS = {
  RATE_LIMIT_429: 12 * 60 * 60 * 1000, // 12 hours
  SERVICE_UNAVAILABLE_503: 1 * 60 * 60 * 1000, // 1 hour
  AUTH_ERROR_401_403: 12 * 60 * 60 * 1000, // 12 hours
  SERVER_ERROR_500_502: 10 * 60 * 1000, // 10 mins
  CONTEXT_LIMIT_400: 0,
  TIMEOUT: 0,
  UNKNOWN: 0,
} as const;

/**
 * Classifies model invocation errors based on operational rules:
 * - 429: skip key+model combination (cooldown 12h)
 * - 503: skip key+model combination (cooldown 1h)
 * - 401/403: skip key (cooldown 12h)
 * - 500/502: skip model (cooldown 10m)
 * - 400 Context Length: skip model (per-request)
 */
export function classifyModelError(error: unknown): ModelErrorClassification {
  const { status, code, message } = extractErrorDetails(error);

  // 1. 429 Rate Limit / Quota Exceeded -> Skip Key+Model Combination (12 hours)
  const is429Status = status === 429;
  const is429Code = code === "RESOURCE_EXHAUSTED" || code === "rate_limit_exceeded" || code === "insufficient_quota";
  const is429Message =
    /\b(resource_exhausted|rate[- ]?limit|quota\s*exceeded|insufficient_quota|too many requests)\b/i.test(message) ||
    /(?:status(?:\s*code)?|http|code|error|response)[\s:]*429\b/i.test(message) ||
    /\[429\b/i.test(message) ||
    /\b429\s+(?:too many requests|rate limit)/i.test(message);

  if (is429Status || is429Code || is429Message) {
    return {
      status: status ?? 429,
      code,
      category: "RATE_LIMIT_429",
      skipScope: "key_model",
      cooldownMs: CIRCUIT_COOLDOWNS.RATE_LIMIT_429,
      reason: `429 Rate Limit / Quota Exceeded: ${message.slice(0, 100)}`,
    };
  }

  // 2. 503 Service Unavailable / Model Overloaded -> Skip Key+Model Combination (1 hour)
  const is503Status = status === 503;
  const is503Message =
    /\b(service\s*unavailable|model\s*(?:is\s*)?overloaded|(?:experiencing\s*)?high\s*demand|spikes\s*in\s*demand|temporarily\s*overloaded)\b/i.test(message) ||
    /(?:status(?:\s*code)?|http|code|error|response)[\s:]*503\b/i.test(message) ||
    /\[503\b/i.test(message) ||
    /\b503\s+service\s*unavailable/i.test(message);

  if (is503Status || is503Message) {
    return {
      status: status ?? 503,
      code,
      category: "SERVICE_UNAVAILABLE_503",
      skipScope: "key_model",
      cooldownMs: CIRCUIT_COOLDOWNS.SERVICE_UNAVAILABLE_503,
      reason: `503 Service Unavailable / Overloaded: ${message.slice(0, 100)}`,
    };
  }

  // 3. 401 / 403 Authentication or Permission Errors -> Skip Key (12 hours)
  const isAuthStatus = status === 401 || status === 403;
  const isAuthCode = code === "PERMISSION_DENIED" || code === "invalid_api_key" || code === "account_deactivated";
  const isAuthMessage =
    /\b(unauthorized|forbidden|permission[_\s]denied|api[-_ ]?key[-_ ]?invalid|invalid[-_ ]?api[-_ ]?key)\b/i.test(message) ||
    /(?:status(?:\s*code)?|http|code|error|response)[\s:]*(?:401|403)\b/i.test(message) ||
    /\[(?:401|403)\b/i.test(message);

  if (isAuthStatus || isAuthCode || isAuthMessage) {
    return {
      status: status ?? (isAuthStatus ? status : 401),
      code,
      category: "AUTH_ERROR_401_403",
      skipScope: "key",
      cooldownMs: CIRCUIT_COOLDOWNS.AUTH_ERROR_401_403,
      reason: `401/403 Authentication/Permission Error: ${message.slice(0, 100)}`,
    };
  }

  // 4. 500 / 502 / 504 Server Errors -> Skip Model (10 mins)
  const isServerErrorStatus = status === 500 || status === 502 || status === 504;
  const isServerErrorMessage =
    /\b(internal\s*server\s*error|bad\s*gateway|gateway\s*timeout)\b/i.test(message) ||
    /(?:status(?:\s*code)?|http|code|error|response)[\s:]*(?:500|502|504)\b/i.test(message) ||
    /\[(?:500|502|504)\b/i.test(message);

  if (isServerErrorStatus || isServerErrorMessage) {
    return {
      status: status ?? 500,
      code,
      category: "SERVER_ERROR_500_502",
      skipScope: "model",
      cooldownMs: CIRCUIT_COOLDOWNS.SERVER_ERROR_500_502,
      reason: `500/502 Server Error: ${message.slice(0, 100)}`,
    };
  }

  // 5. 400 Context Window Exceeded -> Skip Model (per-request)
  const isContextLimit =
    status === 400 &&
    /\b(context_length_exceeded|maximum\s*context\s*length|token\s*limit\s*exceeded|prompt\s*is\s*too\s*long)\b/i.test(message);

  if (isContextLimit) {
    return {
      status: 400,
      code,
      category: "CONTEXT_LIMIT_400",
      skipScope: "model",
      cooldownMs: 0,
      reason: `400 Context Length Exceeded: ${message.slice(0, 100)}`,
    };
  }

  // 6. Generic Timeout Error
  if (/\b(timeout|timed out)\b/i.test(message) || code === "ETIMEDOUT") {
    return {
      status,
      code,
      category: "TIMEOUT",
      skipScope: "none",
      cooldownMs: 0,
      reason: `Timeout: ${message.slice(0, 100)}`,
    };
  }

  return {
    status,
    code,
    category: "UNKNOWN",
    skipScope: "none",
    cooldownMs: 0,
    reason: `Unknown Error: ${message.slice(0, 100)}`,
  };
}

interface CircuitEntry {
  trippedUntil: number;
  reason: string;
  category: string;
}

/**
 * In-memory circuit breaker that manages availability of API keys and models
 * across node invocations and concurrent tasks.
 */
export class ModelCircuitBreaker {
  private keyEntries = new Map<string, CircuitEntry>();
  private modelEntries = new Map<string, CircuitEntry>();
  private keyModelEntries = new Map<string, CircuitEntry>();

  /**
   * Hydrates in-memory circuit breaker entries from persistent database records.
   */
  syncFromDatabase(trips: PersistentTripEntry[], now = Date.now()): void {
    for (const trip of trips) {
      if (trip.trippedUntil > now) {
        const entry: CircuitEntry = {
          trippedUntil: trip.trippedUntil,
          reason: trip.reason,
          category: trip.category,
        };
        if (trip.type === "key") {
          this.keyEntries.set(trip.target, entry);
        } else if (trip.type === "model") {
          this.modelEntries.set(trip.target, entry);
        } else if (trip.type === "key_model") {
          this.keyModelEntries.set(trip.target, entry);
        }
      }
    }
  }

  private trackMutation(store: AsyncContextStore | undefined, promise: Promise<unknown>): void {
    if (!store) return;
    const tracked = promise
      .catch((err: unknown) => {
        console.warn("[ModelCircuitBreaker] Failed to persist circuit mutation:", err);
      })
      .finally(() => {
        store.pendingMutations.delete(tracked);
      });
    store.pendingMutations.add(tracked);
  }

  /**
   * Executes a function within the scope of an ActionCtx, hydrating active trips
   * from the database before execution and synchronizing trips/clears to the database.
   */
  async runWithContext<T>(ctx: ActionCtx, fn: () => Promise<T>): Promise<T> {
    const store: AsyncContextStore = {
      ctx,
      pendingMutations: new Set(),
    };

    try {
      const activeTrips: PersistentTripEntry[] = await ctx.runQuery(
        internal.circuitBreaker.getActiveTrips,
        {}
      );
      this.syncFromDatabase(activeTrips);
    } catch (err) {
      console.warn(
        "[ModelCircuitBreaker] Failed to sync active trips from DB, proceeding with in-memory state:",
        err
      );
    }

    try {
      return await asyncContextStorage.run(store, fn);
    } finally {
      if (store.pendingMutations.size > 0) {
        await Promise.allSettled(Array.from(store.pendingMutations));
      }
    }
  }

  /**
   * Checks if a candidate is available based on its keyGroup and modelId.
   */
  isAvailable(identity?: ModelIdentity, now = Date.now()): { available: boolean; reason?: string } {
    if (!identity) {
      return { available: true };
    }

    const keyModelKey = `${identity.keyGroup}::${identity.modelId}`;
    const keyModelEntry = this.keyModelEntries.get(keyModelKey);
    if (keyModelEntry && keyModelEntry.trippedUntil > now) {
      const remainingSec = Math.ceil((keyModelEntry.trippedUntil - now) / 1000);
      return {
        available: false,
        reason: `Model "${identity.modelId}" on key "${identity.keyGroup}" tripped (${keyModelEntry.reason}, ${remainingSec}s remaining)`,
      };
    }

    const keyEntry = this.keyEntries.get(identity.keyGroup);
    if (keyEntry && keyEntry.trippedUntil > now) {
      const remainingSec = Math.ceil((keyEntry.trippedUntil - now) / 1000);
      return {
        available: false,
        reason: `Key "${identity.keyGroup}" tripped (${keyEntry.reason}, ${remainingSec}s remaining)`,
      };
    }

    const modelEntry = this.modelEntries.get(identity.modelId);
    if (modelEntry && modelEntry.trippedUntil > now) {
      const remainingSec = Math.ceil((modelEntry.trippedUntil - now) / 1000);
      return {
        available: false,
        reason: `Model "${identity.modelId}" tripped (${modelEntry.reason}, ${remainingSec}s remaining)`,
      };
    }

    return { available: true };
  }

  /**
   * Records a failure for the model identity, tripping the key or model if applicable.
   */
  recordFailure(identity: ModelIdentity | undefined, error: unknown, now = Date.now()): ModelErrorClassification {
    const classification = classifyModelError(error);
    if (!identity || classification.skipScope === "none" || classification.cooldownMs <= 0) {
      return classification;
    }

    const target = classification.skipScope === "key_model"
      ? `${identity.keyGroup}::${identity.modelId}`
      : classification.skipScope === "key"
      ? identity.keyGroup
      : identity.modelId;

    const existing = classification.skipScope === "key_model"
      ? this.keyModelEntries.get(target)
      : classification.skipScope === "key"
      ? this.keyEntries.get(identity.keyGroup)
      : this.modelEntries.get(identity.modelId);

    const calculatedTrippedUntil = now + classification.cooldownMs;
    // Preserve any existing longer cooldown
    const trippedUntil = existing && existing.trippedUntil > calculatedTrippedUntil
      ? existing.trippedUntil
      : calculatedTrippedUntil;

    const entry: CircuitEntry = {
      trippedUntil,
      reason: classification.reason,
      category: classification.category,
    };

    if (classification.skipScope === "key_model") {
      this.keyModelEntries.set(target, entry);
    } else if (classification.skipScope === "key") {
      this.keyEntries.set(identity.keyGroup, entry);
    } else if (classification.skipScope === "model") {
      this.modelEntries.set(identity.modelId, entry);
    }

    // Persist to Convex DB if running in an ActionCtx
    const store = asyncContextStorage.getStore();
    if (store?.ctx) {
      this.trackMutation(
        store,
        store.ctx.runMutation(internal.circuitBreaker.recordTrip, {
          type: classification.skipScope,
          target,
          trippedUntil,
          reason: classification.reason,
          category: classification.category,
        })
      );
    }

    return classification;
  }

  /**
   * Records a success for the model identity, resetting any tripped status for its key, model, and key_model combination.
   */
  recordSuccess(identity?: ModelIdentity): void {
    if (!identity) return;
    const keyModelTarget = `${identity.keyGroup}::${identity.modelId}`;
    const hadKeyModelTrip = this.keyModelEntries.delete(keyModelTarget);
    const hadKeyTrip = this.keyEntries.delete(identity.keyGroup);
    const hadModelTrip = this.modelEntries.delete(identity.modelId);

    // Only mutate Convex DB if there was actually a tripped state to clear
    const store = asyncContextStorage.getStore();
    if (store?.ctx) {
      if (hadKeyModelTrip) {
        this.trackMutation(
          store,
          store.ctx.runMutation(internal.circuitBreaker.clearTrip, {
            type: "key_model",
            target: keyModelTarget,
          })
        );
      }
      if (hadKeyTrip) {
        this.trackMutation(
          store,
          store.ctx.runMutation(internal.circuitBreaker.clearTrip, {
            type: "key",
            target: identity.keyGroup,
          })
        );
      }
      if (hadModelTrip) {
        this.trackMutation(
          store,
          store.ctx.runMutation(internal.circuitBreaker.clearTrip, {
            type: "model",
            target: identity.modelId,
          })
        );
      }
    }
  }

  /**
   * Clears all tripped states (primarily for testing).
   */
  reset(): void {
    this.keyEntries.clear();
    this.modelEntries.clear();
    this.keyModelEntries.clear();
  }
}

export const modelCircuitBreaker = new ModelCircuitBreaker();
