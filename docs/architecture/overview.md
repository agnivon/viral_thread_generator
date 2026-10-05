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
│  • LLMs: Google Gemini 3.8/3.7/3.5, OpenAI GPT-5.4, DeepSeek, OpenRouter   │
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
- **Strict Query/Mutation Boundary**: Fast, deterministic transactional reads and writes live in `convex/queries/` and `convex/mutations/`.
- **Workpool Job Scheduling**: Heavy AI generation and publishing workflows are enqueued into `@convex-dev/workpool` queues (`generationPool` and `publicationPool`). This prevents client timeouts, manages concurrency, and isolates failures.
- **Server-Side Identity**: Every protected endpoint derivation enforces authenticated identity using `requireAuthUserId(ctx)` or `getAuthUserId(ctx)`. Client-provided user IDs are rejected.

### 3. LangGraph Autonomous Agent Runtime
- **Node Isolation**: All LangGraph graph runs and LLM interactions execute inside Convex actions configured with `"use node";`.
- **State Checkpointing**: Each execution thread is check-pointed in a dedicated PostgreSQL database using `@langchain/langgraph-checkpoint-postgres` (`PostgresSaver`). This enables:
  - Resumption from any node upon network failures.
  - Human-in-the-loop pauses (e.g. allowing users to manually pick a hook before writing posts).
  - On-demand iterative thread revisions without re-scraping the original source.

### 4. Circuit Breaker Resilience Layer
- Located at `convex/lib/agents/circuitBreaker.ts`, this layer uses Node's `AsyncLocalStorage` to monitor model failure rates (HTTP 429, timeouts, 5xx).
- When a provider fails or hits quota, the circuit trips and automatically routes subsequent requests to secondary models (e.g. falling back from Gemini to DeepSeek or GPT-5.4).

---

## 🔄 Reactive Data Flow Lifecycle

1. **User Submits Ingestion Request**:
   The user enters a News URL, YouTube link, or Topic in `/threads/create`.
2. **Workpool Enqueueing**:
   The client calls `enqueueThreadGeneration`. Convex creates a `threadDrafts` document in `"processing"` state and pushes the task to `generationPool`.
3. **Agent Graph Execution**:
   The worker invokes the appropriate LangGraph state machine. As nodes complete (research dossier assembled, hooks generated), intermediate progress updates the Convex document.
4. **Human-In-The-Loop Pause (Optional)**:
   If `manual_hook_selection` is true, the graph executes `interrupt()` at `ManualHookSelectionNode`. The document transitions to `"hook selection"`, notifying the frontend in real time.
5. **Critique & Validation**:
   The draft is audited for character limits and passed to `ViralityCriticNode`. Failing drafts are routed back to `ThreadWriterNode` for automated repair.
6. **Live Preview & Publication**:
   The user reviews the final draft in the Approval Studio, selects attached visual media, and triggers one-click publish to the Meta Threads API.
