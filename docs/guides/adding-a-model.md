# Guide: Adding and Configuring LLM Models

**Viral Thread Generator** utilizes a multi-model routing architecture. Different nodes require different model characteristics:
- **Low temperature (0.0–0.1)** and deterministic reasoning for scraping and critique.
- **Moderate temperature (0.8–0.85)** and stylistic variance for hook generation and thread writing.

All models are centralized in `convex/lib/agents/models.ts` and wrapped with **circuit breaker identities** for automatic failover.

---

## 🛠️ Step-by-Step Guide

### Step 1: Install Dependencies (If adding a new provider SDK)
If introducing an uninstalled provider package:
```bash
pnpm add @langchain/<provider-name>
```

### Step 2: Define Model Factory with Circuit Breaker Identity
In `convex/lib/agents/models.ts`, wrap the model constructor with `attachModelIdentity`. This registers the model with the circuit breaker so failure rates can be tracked per provider and key group:

```typescript
import { attachModelIdentity } from "./circuitBreaker.js";
import { ChatAnthropic } from "@langchain/anthropic"; // Example

export const claude35SonnetT08 = attachModelIdentity(
  new ChatAnthropic({
    model: "claude-3-5-sonnet-latest",
    temperature: 0.8,
    maxRetries: 0, // Retries are handled by LangGraph and the Circuit Breaker
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
  {
    provider: "anthropic",
    keyGroup: "ANTHROPIC_API_KEY",
    modelId: "claude-3-5-sonnet-latest",
  }
);
```

> [!IMPORTANT]
> Always set `maxRetries: 0` on the underlying LangChain model constructor. Internal LangChain retry loops block the thread and interfere with our circuit breaker fallback cascade.

### Step 3: Add to Node Fallback Arrays
Add your new model into the candidate array in `convex/lib/agents/models.ts` or in the specific agent node:

```typescript
// Fallback cascade ordered by preference:
export const threadWriterModels = [
  googleGemini38FlashT08Key1,
  googleGemini38FlashT08Key2,
  claude35SonnetT08, // Your new model
  deepSeekFlashT085ReasoningNone,
  openAiGpt54T08Penalty04,
];
```

### Step 4: Update Environment Documentation
Whenever introducing a new API key variable:
1. Add the variable to [.env.example](../../.env.example) with placeholder documentation.
2. Update the README environment snippet if it is a primary provider.

### Step 5: Test the Integration
Run tests to verify that the model resolves cleanly without runtime syntax or import errors:
```bash
pnpm type-check
pnpm lint
pnpm test
```
