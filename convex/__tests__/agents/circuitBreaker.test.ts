/// <reference types="vite/client" />
import { describe, it, expect, beforeEach } from "vitest";
import {
  classifyModelError,
  ModelCircuitBreaker,
  attachModelIdentity,
  getModelIdentity,
  ModelIdentity,
  CIRCUIT_COOLDOWNS,
} from "../../lib/agents/circuitBreaker";

describe("classifyModelError", () => {
  it("classifies 429 errors as skipScope: key_model with 12h cooldown", () => {
    // Direct status 429
    const errStatus = { status: 429, message: "Too many requests" };
    const c1 = classifyModelError(errStatus);
    expect(c1.skipScope).toBe("key_model");
    expect(c1.category).toBe("RATE_LIMIT_429");
    expect(c1.cooldownMs).toBe(CIRCUIT_COOLDOWNS.RATE_LIMIT_429);

    // Google RESOURCE_EXHAUSTED code
    const errGoogle = { code: "RESOURCE_EXHAUSTED", message: "Quota exceeded for quota metric" };
    const c2 = classifyModelError(errGoogle);
    expect(c2.skipScope).toBe("key_model");
    expect(c2.category).toBe("RATE_LIMIT_429");

    // OpenAI RateLimitError message
    const errOpenAI = new Error("Rate limit reached for model gpt-5.4-mini");
    const c3 = classifyModelError(errOpenAI);
    expect(c3.skipScope).toBe("key_model");
    expect(c3.category).toBe("RATE_LIMIT_429");
  });

  it("classifies 503 errors as skipScope: key_model with 1h cooldown", () => {
    const errStatus = { status: 503, message: "Service Unavailable" };
    const c1 = classifyModelError(errStatus);
    expect(c1.skipScope).toBe("key_model");
    expect(c1.category).toBe("SERVICE_UNAVAILABLE_503");
    expect(c1.cooldownMs).toBe(CIRCUIT_COOLDOWNS.SERVICE_UNAVAILABLE_503);

    const errOverloaded = new Error("The model is overloaded. Please try again later.");
    const c2 = classifyModelError(errOverloaded);
    expect(c2.skipScope).toBe("key_model");
    expect(c2.category).toBe("SERVICE_UNAVAILABLE_503");

    // Google Gemini high demand message
    const errHighDemand = new Error("This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.");
    const c3 = classifyModelError(errHighDemand);
    expect(c3.skipScope).toBe("key_model");
    expect(c3.category).toBe("SERVICE_UNAVAILABLE_503");
    expect(c3.cooldownMs).toBe(CIRCUIT_COOLDOWNS.SERVICE_UNAVAILABLE_503);
  });

  it("classifies 401/403 auth errors as skipScope: key with 12h cooldown", () => {
    const err401 = { status: 401, message: "Unauthorized API key" };
    const c1 = classifyModelError(err401);
    expect(c1.skipScope).toBe("key");
    expect(c1.category).toBe("AUTH_ERROR_401_403");
    expect(c1.cooldownMs).toBe(CIRCUIT_COOLDOWNS.AUTH_ERROR_401_403);

    const err403 = { status: 403, code: "PERMISSION_DENIED", message: "API key invalid" };
    const c2 = classifyModelError(err403);
    expect(c2.skipScope).toBe("key");
    expect(c2.category).toBe("AUTH_ERROR_401_403");
  });

  it("classifies 500/502 server errors as skipScope: model with 10m cooldown", () => {
    const err500 = { status: 500, message: "Internal server error" };
    const c1 = classifyModelError(err500);
    expect(c1.skipScope).toBe("model");
    expect(c1.category).toBe("SERVER_ERROR_500_502");
    expect(c1.cooldownMs).toBe(CIRCUIT_COOLDOWNS.SERVER_ERROR_500_502);

    const err502 = { status: 502, message: "Bad Gateway" };
    const c2 = classifyModelError(err502);
    expect(c2.skipScope).toBe("model");
    expect(c2.category).toBe("SERVER_ERROR_500_502");
  });

  it("classifies 400 context length exceeded as skipScope: model", () => {
    const err400 = { status: 400, message: "maximum context length is 128000 tokens, but your prompt resulted in 135000 tokens" };
    const c1 = classifyModelError(err400);
    expect(c1.skipScope).toBe("model");
    expect(c1.category).toBe("CONTEXT_LIMIT_400");
    expect(c1.cooldownMs).toBe(0);
  });

  it("classifies unknown/transient errors as skipScope: none", () => {
    const errUnknown = new Error("Something strange happened");
    const c1 = classifyModelError(errUnknown);
    expect(c1.skipScope).toBe("none");
    expect(c1.category).toBe("UNKNOWN");
    expect(c1.cooldownMs).toBe(0);
  });

  it("does not falsely classify non-HTTP error messages containing numbers as rate limits or server errors", () => {
    // Stack trace with line 429
    const errLine429 = new Error("TypeError: Cannot read properties of undefined at Object.run (/app/dist/bundle.js:429:15)");
    const c1 = classifyModelError(errLine429);
    expect(c1.category).toBe("UNKNOWN");
    expect(c1.skipScope).toBe("none");

    // Message with offset 500
    const errOffset500 = new Error("JSON parse error at character 500");
    const c2 = classifyModelError(errOffset500);
    expect(c2.category).toBe("UNKNOWN");
    expect(c2.skipScope).toBe("none");

    // Message with item 503
    const errItem503 = new Error("Processed 503 items before failure");
    const c3 = classifyModelError(errItem503);
    expect(c3.category).toBe("UNKNOWN");
    expect(c3.skipScope).toBe("none");

    // Message with offset 401
    const errChar401 = new Error("Syntax error at offset 401");
    const c4 = classifyModelError(errChar401);
    expect(c4.category).toBe("UNKNOWN");
    expect(c4.skipScope).toBe("none");
  });

  it("parses string status codes correctly", () => {
    const errStr429 = { status: "429", message: "Too Many Requests" };
    const c1 = classifyModelError(errStr429);
    expect(c1.category).toBe("RATE_LIMIT_429");
    expect(c1.skipScope).toBe("key_model");

    const errStr500 = { statusCode: "500", message: "Server Error" };
    const c2 = classifyModelError(errStr500);
    expect(c2.category).toBe("SERVER_ERROR_500_502");
    expect(c2.skipScope).toBe("model");
  });
});

describe("ModelCircuitBreaker", () => {
  let cb: ModelCircuitBreaker;

  beforeEach(() => {
    cb = new ModelCircuitBreaker();
  });

  const gemini38Key1: ModelIdentity = {
    provider: "google",
    keyGroup: "GOOGLE_API_KEY",
    modelId: "gemini-3.8-flash",
  };

  const gemini37Key1: ModelIdentity = {
    provider: "google",
    keyGroup: "GOOGLE_API_KEY",
    modelId: "gemini-3.7-flash",
  };

  const gemini38Key2: ModelIdentity = {
    provider: "google",
    keyGroup: "GOOGLE_API_KEY2",
    modelId: "gemini-3.8-flash",
  };

  it("trips (key, model) combination on 429, marking only that model on that key as unavailable while other models on same key remain available", () => {
    const now = 1000000;
    cb.recordFailure(gemini38Key1, { status: 429, message: "Quota exceeded" }, now);

    // gemini-3.8-flash on Key 1 should be unavailable
    const status1 = cb.isAvailable(gemini38Key1, now + 1000);
    expect(status1.available).toBe(false);
    expect(status1.reason).toContain('Model "gemini-3.8-flash" on key "GOOGLE_API_KEY" tripped');

    // gemini-3.7-flash on Key 1 (different model, same key) is STILL AVAILABLE!
    const status2 = cb.isAvailable(gemini37Key1, now + 1000);
    expect(status2.available).toBe(true);

    // gemini-3.8-flash on Key 2 (same model, different key) should still be available!
    const statusKey2 = cb.isAvailable(gemini38Key2, now + 1000);
    expect(statusKey2.available).toBe(true);

    // After cooldown (12 hours), Key 1 + gemini-3.8 becomes available again
    const statusExpired = cb.isAvailable(gemini38Key1, now + 12 * 60 * 60 * 1000 + 1000);
    expect(statusExpired.available).toBe(true);
  });

  it("trips (key, model) combination on 503, recovering after 1 hour", () => {
    const now = 1000000;
    cb.recordFailure(gemini38Key1, { status: 503, message: "Model is overloaded" }, now);

    // gemini-3.8-flash on Key 1 should be unavailable
    expect(cb.isAvailable(gemini38Key1, now + 1000).available).toBe(false);
    // Other models on Key 1 remain available
    expect(cb.isAvailable(gemini37Key1, now + 1000).available).toBe(true);
    // Same model on Key 2 remains available
    expect(cb.isAvailable(gemini38Key2, now + 1000).available).toBe(true);

    // After cooldown (1 hour), gemini-3.8 on Key 1 recovers
    expect(cb.isAvailable(gemini38Key1, now + 60 * 60 * 1000 + 1000).available).toBe(true);
  });

  it("trips key on 401/403, marking all models using that key as unavailable", () => {
    const now = 1000000;
    cb.recordFailure(gemini38Key1, { status: 401, message: "API key invalid" }, now);

    // All models on Key 1 should be unavailable
    expect(cb.isAvailable(gemini38Key1, now + 1000).available).toBe(false);
    expect(cb.isAvailable(gemini37Key1, now + 1000).available).toBe(false);

    // Key 2 is still available
    expect(cb.isAvailable(gemini38Key2, now + 1000).available).toBe(true);
  });

  it("preserves longer cooldown and does not downgrade ban on subsequent shorter error", () => {
    const now = 1000000;
    // 1. Trip with 429 (12 hours)
    cb.recordFailure(gemini38Key1, { status: 429, message: "Rate limited" }, now);
    const expectedExpiry = now + CIRCUIT_COOLDOWNS.RATE_LIMIT_429;

    // 2. Subsequent 503 (1 hour) on same key+model 5 seconds later
    cb.recordFailure(gemini38Key1, { status: 503, message: "Service unavailable" }, now + 5000);

    // Key+model must STILL be tripped until the original 12-hour expiry, NOT shortened to 1 hour
    const checkBefore12h = cb.isAvailable(gemini38Key1, now + 2 * 60 * 60 * 1000); // 2 hours later
    expect(checkBefore12h.available).toBe(false);

    const checkAfter12h = cb.isAvailable(gemini38Key1, expectedExpiry + 1000);
    expect(checkAfter12h.available).toBe(true);
  });

  it("trips modelId on 500, marking only that model as unavailable while other models on same key remain available", () => {
    const now = 1000000;
    cb.recordFailure(gemini38Key1, { status: 500, message: "Internal server error" }, now);

    // gemini-3.8-flash is unavailable on any key
    expect(cb.isAvailable(gemini38Key1, now + 1000).available).toBe(false);
    expect(cb.isAvailable(gemini38Key2, now + 1000).available).toBe(false);

    // gemini-3.7-flash on Key 1 is STILL available!
    expect(cb.isAvailable(gemini37Key1, now + 1000).available).toBe(true);

    // After cooldown (10 mins), gemini-3.8-flash recovers
    expect(cb.isAvailable(gemini38Key1, now + 10 * 60 * 1000 + 1000).available).toBe(true);
  });

  it("clears tripped state on recordSuccess", () => {
    const now = 1000000;
    cb.recordFailure(gemini38Key1, { status: 429, message: "Too many requests" }, now);
    expect(cb.isAvailable(gemini38Key1, now + 1000).available).toBe(false);

    cb.recordSuccess(gemini38Key1);
    expect(cb.isAvailable(gemini38Key1, now + 1000).available).toBe(true);
  });
});

describe("ModelIdentity metadata attachment and unwrapping", () => {
  it("unwraps identity across nested objects and wrappers", () => {
    const meta: ModelIdentity = {
      provider: "google",
      keyGroup: "GOOGLE_API_KEY",
      modelId: "gemini-3.8-flash",
    };

    const rawModel = {};
    attachModelIdentity(rawModel, meta);
    expect(getModelIdentity(rawModel)).toEqual(meta);

    // RunnableBinding (bound property)
    const structuredRunnable = { bound: rawModel };
    expect(getModelIdentity(structuredRunnable)).toEqual(meta);

    // withTimeout wrapper (runnable property)
    const timeoutWrapper = { runnable: structuredRunnable, timeout: 45000 };
    expect(getModelIdentity(timeoutWrapper)).toEqual(meta);

    // Agent wrapper (model property)
    const agentWrapper = { model: rawModel };
    expect(getModelIdentity(agentWrapper)).toEqual(meta);

    // RunnableSequence (first / steps properties)
    const sequenceWrapper = { first: rawModel, steps: [rawModel] };
    expect(getModelIdentity(sequenceWrapper)).toEqual(meta);

    const stepsOnlyWrapper = { steps: [rawModel] };
    expect(getModelIdentity(stepsOnlyWrapper)).toEqual(meta);
  });
});
