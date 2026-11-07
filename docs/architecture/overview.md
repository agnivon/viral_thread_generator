# System Architecture Overview

**Viral Thread Generator** is built as an enterprise-grade full-stack reactive AI application. The system coordinates four distinct architectural layers:

1. **Frontend**: Next.js 16 (React 19, App Router, Server Actions, Client Components)
2. **Backend**: Convex (Reactive real-time database, Workpool background queues, Crons, Auth)
3. **Agent Runtime**: LangGraph.js running inside Node.js Convex Actions with PostgreSQL state checkpointing
4. **External Services**: AI Providers, Scraping APIs, Meta Threads Graph API, and W3C Web Push gateways

---

## 🏛️ High-Level Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             NEXT.JS 16 FRONTEND                             │
│                                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────┐  │
│  │   AuthGuard & Studio    │  │   Interactive Approval  │  │  PWA Worker │  │
│  │  (Protected App Router) │  │  (Live Hook & Posts UI) │  │  (sw.js Push)│  │
│  └────────────┬────────────┘  └────────────┬────────────┘  └──────▲──────┘  │
└───────────────┼────────────────────────────┼──────────────────────┼─────────┘
                │ Reactive Subscriptions     │ Mutation / Actions   │
                ▼                            ▼                      │
┌───────────────────────────────────────────────────────────────────┼─────────┐
│                           CONVEX BACKEND                          │         │
│                                                                   │         │
│  ┌─────────────────────────────────┐   ┌──────────────────────────┴──────┐  │
│  │    Reactive Database Schema     │   │      Background Workpools       │  │
│  │  threadDrafts │ pushSubs        │   │  generationPool │ pubPool       │  │
│  │  accessTokens │ circuitBreakers │   │  (Distributed Async Execution)  │  │
│  └────────────────┬────────────────┘   └──────────────────┬──────────────┘  │
│                   │                                       │                 │
│                   ▼                                       ▼                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     CONVEX ACTIONS ("use node";)                      │  │
│  │              (Outbound Network, LLM Pipelines & Crons)                │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LANGGRAPH MULTI-AGENT PIPELINES                        │
│                                                                             │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌───────────────┐  │
│  │ NewsThreadFactoryGraph │  │ SocialMediaFactoryGraph│  │ TopicFactory  │  │
│  └───────────┬────────────┘  └───────────┬────────────┘  └───────┬───────┘  │
│              │                           │                       │          │
│              ▼                           ▼                       ▼          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │         PostgresSaver Checkpointer (PostgreSQL State Store)           │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL INTEGRATION ECOSYSTEM                      │
│                                                                             │
│  • LLMs: Google Gemini 3.8/3.6, OpenAI GPT-5.4, DeepSeek, OpenRouter        │
│  • Scraping & Search: Firecrawl, Jina Reader, Tavily AI, Brave, DuckDuckGo  │
│  • Media: Meta Threads Graph API (OAuth, Container Polling, Publishing)     │
│  • Security & Push: Cloudflare Turnstile, VAPID Web Push Gateways (FCM)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Architectural Responsibilities

### 1. Next.js 16 Presentation Layer
- **Client Boundary**: Protected workspace pages under `app/(protected)/` run as `"use client"` components shielded by `<AuthGuard>` to prevent SSR race conditions.
- **Form State Optimization**: Complex thread editing utilizes React Hook Form with isolated `useWatch` subscribers inside `DraftPostItem` to prevent keystroke re-renders across multi-post lists.
- **PWA Service Worker**: `public/sw.js` handles push notifications received while the browser is closed or running in the background on mobile WebAPK devices.

### 2. Convex Real-Time Backend
- **Unified Domain Modules & Strict Query/Mutation Boundary**: Fast, deterministic transactional reads and writes live in root domain modules (`convex/threads.ts`, `convex/notifications.ts`, `convex/tokens.ts`, `convex/trendAlerts.ts`), keeping state definitions, mutations, and queries cohesive and avoiding fragmented directory sprawl.
- **Workpool Job Scheduling & Timeout Recovery**: Heavy AI generation and publishing workflows are enqueued into `@convex-dev/workpool` queues (`generationPool` and `publicationPool`). Pre-allocated draft IDs ensure that execution timeouts or crashes in `onGenerationComplete` reliably transition the draft to `failed` state with detailed diagnostic error messages.
- **Server-Side Identity**: Every protected endpoint derivation enforces authenticated identity using `requireAuthUserId(ctx)` or `getAuthUserId(ctx)`. Client-provided user IDs are strictly rejected.

### 3. LangGraph Autonomous Agent Runtime
- **Node Isolation**: All LangGraph graph runs and LLM interactions execute inside Convex actions configured with `"use node";`.
- **State Checkpointing & Pareto Frontier Tracking**: Each execution thread is check-pointed in a dedicated PostgreSQL database using `@langchain/langgraph-checkpoint-postgres` (`PostgresSaver`). This enables:
  - Resumption from any node upon network failures.
  - Human-in-the-loop pauses (e.g. allowing users to manually pick a hook before writing posts).
  - On-demand iterative thread revisions without re-scraping the original source.
  - Pareto Frontier Checkpointing: Retaining the highest-scoring candidate draft (`best_thread_draft`, `best_virality_score`) across multi-pass critique cycles, preventing score and quality regressions.
- **Closed-World Differential Critique & Surgical Writing**: For iterations $\ge 2$, the system converts open-ended subjective reviews into closed-world punchlists, verifying prior issues and selectively re-writing only flagged defect posts while pinning passing posts intact.

### 4. Circuit Breaker Resilience Layer
- Located at `convex/lib/agents/circuitBreaker.ts` and `convex/lib/agents/utils.ts`, this layer uses Node's `AsyncLocalStorage` to monitor model failure rates (HTTP 429, timeouts, 5xx) and wraps candidates in `FallbackChatModel`.
- Model-level fallbacks preserve LangChain tool bindings (`bindTools`), thinking content blocks, and streaming across candidate cascades while providing 0ms in-flight fast-skipping for previously failed keys or models.
- When a provider fails or hits quota, the circuit trips and automatically routes subsequent requests to secondary models (e.g. falling back from Gemini to DeepSeek Flash or GPT-5.4).

---

## 🔄 Reactive Data Flow Lifecycle

1. **User Submits Ingestion Request**:
   The user enters a News URL, YouTube link, or Topic in `/threads/create`.
2. **Pre-Initialized Draft & Workpool Enqueueing**:
   The client invokes `enqueueThreadGeneration`. Convex pre-allocates a `threadDrafts` document in `"processing"` state, generates the record ID, and enqueues the job into `generationPool`.
3. **Agent Graph Execution**:
   The worker invokes the appropriate LangGraph state machine. As nodes complete (research dossier assembled, hooks generated), intermediate progress updates the Convex document.
4. **Human-In-The-Loop Pause (Optional)**:
   If `manual_hook_selection` is true, the graph executes `interrupt()` at `ManualHookSelectionNode`. The document transitions to `"hook selection"`, notifying the frontend in real time.
5. **Critique, Validation & Surgical Revision**:
   The draft is checked for character limits and analyzed by `ViralityCriticNode`. On iteration $\ge 2$, the Closed-World Differential Critic verifies punchlist resolution. The `ThreadWriterNode` surgically rewrites only flagged posts. If score regressions occur, Pareto Frontier Checkpointing automatically restores the top-scoring candidate.
6. **Live Preview & Publication**:
   The user reviews the final draft in the Approval Studio, selects attached visual media, and triggers one-click publish to the Meta Threads API.
