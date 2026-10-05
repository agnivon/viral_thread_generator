# State Checkpointing & Human-In-The-Loop Execution

AI agent pipelines that take minutes to research, draft, and critique cannot rely on in-memory state in serverless cloud environments. **Viral Thread Generator** utilizes a durable state architecture combining **PostgreSQL checkpointing** with **LangGraph interrupts**.

---

## 🏛️ Checkpointer Architecture

Every execution of a thread factory graph is check-pointed using `@langchain/langgraph-checkpoint-postgres` (`PostgresSaver`):

```
┌─────────────────────────────────┐
│     Convex Action Run Context   │
│   (Isolated V8 / Node sandbox)  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│    PostgresSaver Checkpointer   │
│   (pg Pool with SSL & pooling)  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│      External PostgreSQL DB     │
│   checkpoints │ checkpoint_blobs│
│   checkpoint_writes             │
└─────────────────────────────────┘
```

### Connection Pool Configuration
Located in `convex/lib/agents/news/graph.ts`:

```typescript
const { Pool } = pg;

export const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: 1, // Limit connections per isolate to prevent exhaustion in serverless environments
  idleTimeoutMillis: 10000,
});

export const checkpointSaver = new PostgresSaver(pool);
```

- **Isolate Protection**: Setting `max: 1` ensures that spinning up parallel Convex action isolates does not exhaust the PostgreSQL server's connection pool.
- **SSL Sanitization**: Automatically strips incompatible `?sslmode=require` flags from cloud PostgreSQL providers (e.g. Aiven, Neon) and replaces them with an explicit `sslConfig` object containing custom CA certificates.

---

## ⏸️ Human-In-The-Loop (HITL) Workflow

When a user enables `manual_hook_selection`, the agent pipeline pauses mid-execution to allow the creator to inspect and select the hook angle.

```
1. Graph starts ──> [Scraper] ──> [Researcher] ──> [HookStrategist]
                                                          │
2. Graph enters [ManualHookSelectionNode]                 ▼
   Executes: interrupt({ hooks: state.core_hooks }) ──── PAUSE
                                                          │
3. Checkpoint saved to PostgreSQL.                        │
   Convex document status set to: "hook selection"        │
                                                          │
4. User selects hook in Next.js UI                        ▼
   Calls mutation: resumeThreadGeneration({ selected_hook })
                                                          │
5. Graph Resumes via Command(resume=...) ─────────────── RESUME
                                                          │
6. Advances to [ThreadWriterNode] ────────────────────────┘
```

### The Interrupt Contract
Inside `ManualHookSelectionNode`:

```typescript
export const ManualHookSelectionNode = async (
  state: BaseThreadFactoryStateType,
  config?: RunnableConfig
) => {
  // If no hook has been selected yet, pause execution via LangGraph interrupt
  if (!state.selected_hook) {
    const selected = interrupt({
      message: "Please select a hook from the generated candidates.",
      hooks: state.core_hooks,
    });

    return {
      selected_hook: selected,
    };
  }

  return { selected_hook: state.selected_hook };
};
```

---

## 🔄 Resuming & On-Demand Thread Iteration

Because state is saved after every node execution, users can trigger targeted iterations without re-running the expensive scraping or research phases:

### 1. Hook Selection Resume
When the user picks a hook in `HookSelectionScreen.tsx`, the action calls:
```typescript
await graph.invoke(new Command({ resume: selectedHook }), threadConfig);
```
LangGraph restores the exact state from PostgreSQL and transitions immediately to `ThreadWriterNode`.

### 2. Targeted Critique Iteration
If a user requests an iteration with custom guidance (e.g., *"Make it more punchy and add emphasis on open-source"*):
- The action loads past state from the checkpointer.
- It resets the state to `ManualHookSelectionNode` with the updated user guidance.
- It re-invokes the graph without re-scraping the original URL or rebuilding the background research dossier.
