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

## 🧩 Model-Level `FallbackChatModel` & Tool Preservation

In complex multi-agent architectures, wrapping model calls with standard `try/catch` blocks often drops critical LangChain bindings—specifically bound tools (`bindTools`), structured output schemas, streaming event listeners, and usage metadata.

To solve this, **`convex/lib/agents/utils.ts`** implements **`FallbackChatModel`**, a full-fledged LangChain `BaseChatModel`:

```typescript
export class FallbackChatModel extends BaseChatModel {
  readonly candidates: AgentCandidate[];

  constructor(candidates: AgentCandidate[]) {
    super({});
    this.candidates = candidates;
  }

  override bindTools(tools: unknown[], kwargs?: unknown): Runnable {
    // Propagates tools to every candidate while attaching model identities
  }

  async _generate(messages: BaseMessage[], options: this["ParsedCallOptions"]): Promise<ChatResult> {
    // Iterates through candidates via invokeWithFallbacks, handling circuit breaker checks,
    // in-flight fast-skipping, thinking content block retention, and token usage accounting
  }

  async *_streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"]) {
    // True streaming fallbacks yielding AIMessageChunk with clean abort listener disposal
  }
}
```

### Key Capabilities:
1. **Tool Binding Preservation**: Dynamically binds tools to each candidate model in the chain (`Gemini`, `DeepSeek`, `OpenAI`), preserving structured schemas even when failing over.
2. **Thinking Content Blocks**: Retains internal `<thinking>` blocks emitted by high-reasoning models (such as `deepseek-flash`), preventing serialization errors when passing message history across disparate providers.
3. **Usage Metadata Passthrough**: Preserves input/output token counts and finish reasons on returned `AIMessage` objects.
4. **Abort Signal Cleanup**: Registers and cleanly detaches abort listeners to prevent memory leaks during long-running streaming invocations.

---

## ⚡ In-Flight Fast-Skipping (0ms Overhead)

Beyond database-backed cooldown tracking, `invokeWithFallbacks` employs in-memory in-flight fast-skipping:
- Maintains sets of `inFlightFailedKeys`, `inFlightFailedModels`, and `inFlightFailedKeyModels` for the duration of a single request.
- If Candidate 1 fails due to an invalid or rate-limited API key (`GOOGLE_API_KEY`), Candidate 2 (sharing `GOOGLE_API_KEY`) is bypassed immediately with **0ms network delay**, instantly advancing to Candidate 3 (`GOOGLE_API_KEY2` or `DEEPSEEK_API_KEY`).

---

## 🔀 Fallback Cascade Ordering

When an agent node runs, it accepts an array of model candidates ordered from highest quality/cost efficiency to resilient backups:

### Thread Writer Fallback Cascade:
1. **Google Gemini 3.8 Flash** (`GOOGLE_API_KEY`)
2. **Google Gemini 3.8 Flash** (`GOOGLE_API_KEY2` — secondary key)
3. **Google Gemini 3.6 Flash** (`GOOGLE_API_KEY`)
4. **Google Gemini 3.6 Flash** (`GOOGLE_API_KEY2`)
5. **DeepSeek Flash** (`DEEPSEEK_API_KEY` — reasoning disabled, high speed)
6. **OpenAI GPT-5.4** (`OPENAI_API_KEY` — presence penalty 0.4)
7. **Google Gemini 3 Flash Preview** (`GOOGLE_API_KEY` / `GOOGLE_API_KEY2`)

If Gemini hits a rate limit, the circuit breaker flags Gemini as tripped, saves the cooldown state to the Convex database, and instantly executes DeepSeek without dropping the user's thread generation request.
