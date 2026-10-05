# Circuit Breaker & Multi-Provider Resilience

Production AI systems face frequent upstream failures: rate limit throttling (`429`), provider outages (`5xx`), slow generation timeouts, and transient network disconnects.

**Viral Thread Generator** implements an enterprise **Circuit Breaker** system in `convex/lib/agents/circuitBreaker.ts` that provides zero-downtime model failover across multiple providers.

---

## 🛡️ Circuit Breaker Design

```
                     ┌───────────────────────────────┐
                     │   Agent Node Calls Model      │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │ Is Circuit Tripped for Model? │
                     └───────┬───────────────┬───────┘
                             │               │
                      YES    │               │ NO
            ┌────────────────┘               └────────────────┐
            ▼                                                 ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│ Bypass: Cascade to Next Model │             │ Execute Primary Model Request │
└───────────────────────────────┘             └───────┬───────────────┬───────┘
                                                      │               │
                                              SUCCESS │               │ ERROR
                                      ┌───────────────┘               └───────────────┐
                                      ▼                                               ▼
                      ┌───────────────────────────────┐               ┌───────────────────────────────┐
                      │ Return Result & Reset Failure │               │ Record Failure & Check Trips  │
                      └───────────────────────────────┘               └───────┬───────────────────────┘
                                                                              │
                                                                       TRIP   ▼
                                                              ┌───────────────────────────────┐
                                                              │ Trip Circuit for Cooldown     │
                                                              │ Reroute to Secondary Model    │
                                                              └───────────────────────────────┘
```

---

## 🔍 Context Tracking via `AsyncLocalStorage`

Because Convex actions execute across asynchronous tasks, the circuit breaker leverages Node's `AsyncLocalStorage` to propagate the current execution context (`ActionCtx`) down to deeply nested LangChain runnables without polluting function signatures:

```typescript
const asyncContextStorage = new AsyncLocalStorage<AsyncContextStore>();

export async function runWithCircuitContext<T>(
  ctx: ActionCtx,
  fn: () => Promise<T>
): Promise<T> {
  const store: AsyncContextStore = {
    ctx,
    pendingMutations: new Set(),
  };
  return asyncContextStorage.run(store, async () => {
    try {
      const result = await fn();
      await Promise.all(store.pendingMutations);
      return result;
    } catch (err) {
      await Promise.all(store.pendingMutations);
      throw err;
    }
  });
}
```

---

## ⏱️ Error Classification & Tripping Thresholds

The circuit breaker categorizes errors into distinct failure types:

| Error Category | Indicators | Cooldown / Action |
| :--- | :--- | :--- |
| **Rate Limit / Quota** | HTTP `429`, `"RESOURCE_EXHAUSTED"`, `"insufficient_quota"` | **10-minute cooldown**. Circuit trips immediately to conserve remaining tokens. |
| **Server Overload** | HTTP `500`, `502`, `503`, `504`, `"overloaded"` | **5-minute cooldown**. Reroutes to alternate provider. |
| **Timeouts** | `AbortError`, timeout > 45,000ms | **3-minute cooldown**. Reroutes to faster lightweight model. |
| **Bad Request / Schema** | HTTP `400`, JSON parsing failure | **No Trip**. Increments node retry count without blocking the model for other tasks. |

---

## 🔀 Fallback Cascade Ordering

When an agent node runs, it accepts an array of model candidates ordered from highest quality/cost efficiency to resilient backups:

### Thread Writer Fallback Cascade:
1. **Google Gemini 3.8 Flash** (`GOOGLE_API_KEY`)
2. **Google Gemini 3.8 Flash** (`GOOGLE_API_KEY2` — secondary key)
3. **Google Gemini 3.7 Flash**
4. **DeepSeek Flash** (`DEEPSEEK_API_KEY`)
5. **OpenAI GPT-5.4** (`OPENAI_API_KEY`)
6. **OpenRouter Free Tier** (`OPENROUTER_API_KEY`)

If Gemini hits a rate limit, the circuit breaker flags Gemini as tripped, saves the cooldown state to the Convex database, and instantly executes DeepSeek without dropping the user's thread generation request.
