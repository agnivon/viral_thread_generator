# Guide: Adding a New LangGraph Node

This guide explains how to design, implement, and integrate a new node into one of the LangGraph state machines in **Viral Thread Generator**.

---

## 📋 The Node Contract

A LangGraph node is an asynchronous function that takes the current graph state and an optional `RunnableConfig`, processes the data (often by calling tools or invoking LLM runnables), and returns a partial state update.

```typescript
import { RunnableConfig } from "@langchain/core/runnables";
import { BaseThreadFactoryStateType } from "../sharedState.js";

export const MyCustomNode = async (
  state: BaseThreadFactoryStateType,
  config?: RunnableConfig
): Promise<Partial<BaseThreadFactoryStateType>> => {
  // 1. Read from state
  const { thread_draft, guidance } = state;

  // 2. Perform work (LLM call, calculation, external tool)
  const result = await doSomething(thread_draft, guidance);

  // 3. Return partial state updates
  return {
    thread_draft: result,
  };
};
```

---

## 🛠️ Step-by-Step Implementation

### Step 1: Update State Channels (If introducing new state)
If your node introduces new data fields, define them in `convex/lib/agents/sharedState.ts` and in `convex/schema.ts` (if persisted to Convex):

```typescript
// convex/lib/agents/sharedState.ts
export interface BaseThreadFactoryStateType {
  // Existing fields...
  my_custom_field?: string;
}
```

### Step 2: Implement the Node Function
Place your node logic in the relevant agent directory (e.g. `convex/lib/agents/topic/nodes.ts` or `convex/lib/agents/nodes.ts`):

```typescript
import { executeWithModelFallback } from "../utils.js";
import { myCustomModelList } from "../models.js";

export const MyCustomNode = async (
  state: BaseThreadFactoryStateType,
  config?: RunnableConfig
) => {
  try {
    const response = await executeWithModelFallback(
      myCustomModelList,
      "Analyze the following thread draft...",
      config
    );

    return {
      my_custom_field: response,
      parse_success: true,
    };
  } catch (err) {
    return {
      parse_success: false,
      retries: {
        ...state.retries,
        my_custom_node: (state.retries?.my_custom_node || 0) + 1,
      },
    };
  }
};
```

### Step 3: Register the Node in the Graph
Open the target graph file (e.g. `convex/lib/agents/topic/graph.ts`) and register the node:

```typescript
import { MyCustomNode } from "./nodes.js";

// Add node to graph builder
export const TopicThreadFactoryGraph = new StateGraph(TopicThreadFactoryState)
  .addNode("MyCustomNode", MyCustomNode)
  // Connect with edges
  .addEdge("ThreadWriterNode", "MyCustomNode")
  .addEdge("MyCustomNode", "ViralityCriticNode");
```

### Step 4: Write Unit Tests
Every node must have automated unit tests in `convex/__tests__/agents/nodes.test.ts` or `convex/__tests__/agents/graphs.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { MyCustomNode } from "../../lib/agents/topic/nodes.js";

describe("MyCustomNode", () => {
  it("processes input state and updates custom field", async () => {
    const mockState = {
      thread_draft: ["Post 1", "Post 2"],
      retries: {},
      parse_success: true,
    };

    const result = await MyCustomNode(mockState as any);
    expect(result.my_custom_field).toBeDefined();
  });
});
```

---

## ⚡ Quality Checklist
- [ ] Uses strict TypeScript typing (Zero `any` policy).
- [ ] Handles errors gracefully and increments retry counts on failure.
- [ ] Covered by Vitest unit tests in `convex/__tests__/agents/`.
- [ ] Passes `pnpm type-check` and `pnpm lint`.
