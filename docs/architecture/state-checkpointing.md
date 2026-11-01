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

---

## 🎯 Pareto Frontier Checkpointing

During multi-iteration reflection loops or manual user regenerations, an AI model may occasionally produce a regression (e.g., fixing one flagged post while introducing clunky wording in another).

To guarantee that creators never lose high-quality drafts:
1. **Pareto State Channels**:
   The state machine maintains `best_thread_draft` and `best_virality_score`.
2. **Restoration Logic in `handleGraphCompletion`**:
   Before finalizing and saving to Convex, the completion handler compares the current iteration's score and approval status against the best recorded score:
   ```typescript
   const isBestDraftRestored = Boolean(
     best_thread_draft &&
     bestScore !== undefined &&
     ((currentScore !== undefined && bestScore > currentScore) ||
       !thread_draft ||
       thread_draft.length === 0 ||
       currentScore === undefined)
   );
   ```
   If the newest pass scored lower or produced an empty draft, the system seamlessly restores `best_thread_draft` and `best_virality_score`, guaranteeing monotonic quality delivery.

---

## ⏱️ Pre-Initialized Drafts & Timeout Resilience

Long-running generative pipelines running in serverless workpool environments require deterministic failure handling:

1. **Pre-Allocation in `initializeThreadDraft`**:
   Before a generation task is enqueued to `@convex-dev/workpool`, Convex creates the `threadDrafts` document in `"processing"` state. The resulting document ID is passed as task context.
2. **Workpool Lifecycle Failure Hook (`onGenerationComplete`)**:
   If an action times out or crashes at the V8 isolate level, the workpool completion handler fires with `result.kind === "failed"`. It immediately patches the pre-allocated draft:
   ```typescript
   await ctx.db.patch("threadDrafts", context.threadId, {
     generation_status: "failed",
     failure_reason: result.error || "Generation timed out or failed.",
   });
   ```
   And dispatches a real-time notification linking directly to the draft approval page with actionable failure diagnostics.
3. **Stuck Draft Sweepers**:
   - `markStuckDraftsAsFailed`: Internal cron/maintenance mutation that sweeps drafts remaining in `"processing"` or `"queued"` for longer than 15 minutes.
   - `cleanupStuckDrafts`: Authenticated public mutation allowing creators to clean up any orphaned or stalled generation runs.
