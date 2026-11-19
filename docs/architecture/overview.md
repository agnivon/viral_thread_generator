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
│  │  Deep Discovery Subgraph (Vector Hypothesizer ─ Dialectic Retrieval)  │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Editorial Infographics Engine (Satori + Resvg Server-Side Rendering) │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │         PostgresSaver Checkpointer (PostgreSQL State Store)           │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL INTEGRATION ECOSYSTEM                      │
│                                                                             │
│  • LLMs: Google Gemini 4 Hydrogen / 3.8 / 3.6, DeepSeek Flash, GPT-5.4      │
│  • Scraping & Search: Native Google Trends (batchexecute RPC), Firecrawl,   │
│    Jina Reader, Tavily AI Search, Brave Search API, DuckDuckGo              │
│  • Visual Media: Satori Virtual DOM + Resvg Native Node 24 Compiler         │
│  • Publishing: Meta Threads Graph API (OAuth, Container Polling)            │
│  • Security & Push: Cloudflare Turnstile, VAPID Web Push Gateways (FCM)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Architectural Responsibilities

### 1. Next.js 16 Presentation Layer
- **Client Boundary**: Protected workspace pages under `app/(protected)/` run as `"use client"` components shielded by `<AuthGuard>` to prevent SSR race conditions.
- **Form State & Accessible Switches**: Complex thread editing utilizes React Hook Form with isolated `useWatch` subscribers inside `DraftPostItem` to prevent keystroke re-renders. Creation and regeneration dialogs feature interactive Base UI switch-based toggle cards with category badges (Interactive, Media, Forensic Lens).
- **Collapsible Critique Experience**: Overall thread critiques and post-level AI critique directives feature mobile-optimized collapsible cards with snippet previews, animated chevrons, and full keyboard accessibility (Enter/Space).
- **PWA Service Worker**: `public/sw.js` handles push notifications received while the browser is closed or running in the background on mobile WebAPK devices.

### 2. Convex Real-Time Backend
- **Unified Domain Modules & Strict Query/Mutation Boundary**: Fast, deterministic transactional reads and writes live in root domain modules (`convex/threads.ts`, `convex/notifications.ts`, `convex/tokens.ts`, `convex/trendAlerts.ts`), keeping state definitions, mutations, and queries cohesive and avoiding fragmented directory sprawl.
- **Workpool Job Scheduling & Timeout Recovery**: Heavy AI generation and publishing workflows are enqueued into `@convex-dev/workpool` queues (`generationPool` and `publicationPool`). Pre-allocated draft IDs ensure that execution timeouts or crashes in `onGenerationComplete` reliably transition the draft to `failed` state with detailed diagnostic error messages.
- **Server-Side Identity**: Every protected endpoint derivation enforces authenticated identity using `requireAuthUserId(ctx)` or `getAuthUserId(ctx)`. Client-provided user IDs are strictly rejected.

### 3. LangGraph Autonomous Agent Runtime
- **Node Isolation & Runtime Configuration**: All LangGraph graph runs and LLM interactions execute inside Convex actions configured with `"use node";` on Node 24 (`convex.json`).
- **Deep Discovery Subgraph**: When enabled, factory graphs dispatch to `DiscoveryAgentGraph` (`VectorHypothesizerNode` $\to$ `DialecticRetrievalNode` $\to$ `TensionExtractionNode` $\to$ `AngleFormulatorNode`), unearthing contrarian proof vectors across 5 forensic lenses (BOM paradox, stagecraft, supply chain arbitrage, engineering trade-offs, regulatory asymmetry).
- **Automated Editorial Infographics Engine**: Features `InfographicGeneratorNode` generating structured specifications across 5 visual archetypes (`kpi_flow`, `entity_comparison`, `comparison_bars`, `stat_callout`, `custom_layout`), compiled into Retina PNGs via Satori and Resvg and stored in Convex storage.
- **State Checkpointing & Pareto Frontier Tracking**: Centralized in `convex/lib/agents/checkpointer.ts`, each execution thread is check-pointed in a dedicated PostgreSQL database using `@langchain/langgraph-checkpoint-postgres` (`PostgresSaver`). This enables:
  - Resumption from any node upon network failures.
  - Human-in-the-loop pauses (e.g. allowing users to manually pick a hook before writing posts).
  - On-demand iterative thread revisions without re-scraping the original source.
  - Pareto Frontier Checkpointing: Retaining the highest-scoring candidate draft (`best_thread_draft`, `best_virality_score`) across multi-pass critique cycles, preventing score and quality regressions.
- **Closed-World Differential Critique & Surgical Writing**: For iterations $\ge 2$, the system converts open-ended subjective reviews into closed-world punchlists, verifying prior issues and selectively re-writing only flagged defect posts while pinning passing posts intact.

### 4. Circuit Breaker Resilience Layer
- Located at `convex/lib/agents/circuitBreaker.ts` and `convex/lib/agents/utils.ts`, this layer uses Node's `AsyncLocalStorage` to monitor model failure rates (HTTP 429, timeouts, 5xx) and wraps candidates in `FallbackChatModel`.
- **Primary Model Cascade**: Standardizes on Google Gemini 4 Hydrogen (`gemini-4-hydrogen`, thinkingLevel: high) with dual-key rotation, cascading to Gemini 3.8 Flash, Gemini 3.6 Flash, DeepSeek Flash, and OpenAI GPT-5.4.
- Model-level fallbacks preserve LangChain tool bindings (`bindTools`), thinking content blocks, and streaming across candidate cascades while providing 0ms in-flight fast-skipping for previously failed keys or models.
- When a provider fails or hits quota, the circuit trips and automatically routes subsequent requests to secondary models.

---

## 🔄 Reactive Data Flow Lifecycle

1. **User Submits Ingestion Request**:
   The user enters a News URL, YouTube link, or Topic in `/threads/create`, configuring toggles (Manual Hooks, Viral Infographics, Deep Discovery).
2. **Pre-Initialized Draft & Workpool Enqueueing**:
   The client invokes `enqueueThreadGeneration`. Convex pre-allocates a `threadDrafts` document in `"processing"` state, generates the record ID, and enqueues the job into `generationPool`.
3. **Research & Deep Discovery (Optional)**:
   The worker invokes the appropriate LangGraph state machine. If Deep Discovery is toggled, `DiscoveryAgentGraph` executes vector hypothesizing, dialectic open-web retrieval (Tavily + Jina), and tension extraction to formulate contrarian angles and the `core_delta`.
4. **Context Synthesis & Hook Generation**:
   The agent synthesizes the evidentiary research dossier and generates 5 viral psychological hook variations.
5. **Human-In-The-Loop Pause (Optional)**:
   If `manual_hook_selection` is true, the graph executes `interrupt()` at `ManualHookSelectionNode`. The document transitions to `"hook selection"`, notifying the frontend in real time for user selection.
6. **Critique, Validation & Surgical Revision**:
   The draft is checked for character limits and analyzed by `ViralityCriticNode`. On iteration $\ge 2$, the Closed-World Differential Critic verifies punchlist resolution. The `ThreadWriterNode` surgically rewrites only flagged posts. If score regressions occur, Pareto Frontier Checkpointing automatically restores the top-scoring candidate.
7. **Infographic Synthesis & Satori/Resvg Rendering**:
   If enabled, `InfographicGeneratorNode` designs a structured visual spec. Upon graph completion, `handleGraphCompletion` renders the spec into a 2x Retina PNG via Satori and Resvg, stores it in Convex storage, and prepends it to the draft images.
8. **Live Preview & Publication**:
   The user reviews the final draft in the Approval Studio, inspects the infographic and research dossier, and triggers one-click publish to the Meta Threads API.
