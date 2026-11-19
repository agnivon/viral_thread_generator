# ⚡ Viral Thread Generator

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-7c3aed.svg)](LICENSE)
[![Version: 3.0.0](https://img.shields.io/badge/Version-3.0.0-blue.svg)](package.json)
[![CI](https://github.com/agnivon/viral_thread_generator/actions/workflows/ci.yml/badge.svg)](https://github.com/agnivon/viral_thread_generator/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16%20(App%20Router)-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Convex Backend](https://img.shields.io/badge/Convex-Reactive%20Backend-orange?logo=convex)](https://convex.dev)
[![LangGraph](https://img.shields.io/badge/LangGraph-Agentic%20Orchestration-blue?logo=langchain)](https://langchain-ai.github.io/langgraphjs/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%206.0-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.4.1-f69220?logo=pnpm)](https://pnpm.io/)

<p align="center">
  <strong>The Enterprise-Grade Autonomous AI Creator Studio & Multi-Agent Publishing Engine for Meta Threads.</strong>
</p>

<p align="center">
  Transform raw news, YouTube transcripts, viral social posts, and abstract ideas into high-engagement, algorithm-optimized social media threads with self-reflective critique loops, automated web verification, visual keyword synthesis, circuit-breaker failover, and one-click Meta Threads publishing.
</p>

</div>

---

## 🌟 Executive Overview

**Viral Thread Generator** is an end-to-end autonomous editorial engine engineered with **LangGraph**, **Next.js 16**, and **Convex**. It models the exact iterative workflow of top social media ghostwriters and growth strategists: discovering breakout stories, verifying facts across multiple live search engines, testing multiple hook variations, drafting with strict pacing constraints, self-critiquing for viral engagement, generating visual asset search prompts, dispatching real-time web push notifications, and scheduling directly to Meta Threads.

---

## 🚀 Key Architectural Highlights & Advanced Capabilities

```
                       ┌────────────────────────────────────────────────────────┐
                       │                   INPUT INGESTION                      │
                       │    News Article  │  YouTube Video  │  Thematic Topic    │
                       └───────────────────────────┬────────────────────────────┘
                                                   │
                                                   ▼
                       ┌────────────────────────────────────────────────────────┐
                       │              RESEARCH & SCRAPING STACK                 │
                       │   Firecrawl ── Jina Reader ── Tavily ── DuckDuckGo     │
                       │       Brave Search ── Native Google Trends ── YouTube  │
                       │     (Google News Redirect Resolution via batchexecute) │
                       └───────────────────────────┬────────────────────────────┘
                                                   │
                                                   ▼
                       ┌────────────────────────────────────────────────────────┐
                       │          AUTONOMOUS MULTI-AGENT PIPELINE               │
                       │                                                        │
                       │  1. [Optional] Deep Discovery Subgraph (5 Lenses)      │
                       │  2. ContextResearcherNode (Synthesizes Dossier)       │
                       │  3. HookStrategistNode    (Crafts 5 Viral Angles)     │
                       │  4. [Optional] Human-In-The-Loop Hook Selector         │
                       │  5. ThreadWriterNode      (Pacing & Narrative Flow)    │
                       │  6. CharacterValidator    (500-Char Safety & Rules)    │
                       │  7. ViralityCriticNode    (Reflection & Self-Fix Loop) │
                       │  8. [Optional] InfographicGeneratorNode (5 Archetypes) │
                       │  9. VisualKeywordStrategist (Image/Video Prompts)      │
                       └───────────────────────────┬────────────────────────────┘
                                                   │
                                                   ▼
                       ┌────────────────────────────────────────────────────────┐
                       │           REACTIVE CREATOR STUDIO & PUBLISHER          │
                       │  Live Editor ── Satori/Resvg Visuals ── Threads API    │
                       │     Circuit Breaker Failover ── W3C Web Push (PWA)     │
                       └────────────────────────────────────────────────────────┘
```

### 🧠 1. Specialized Multi-Agent LangGraph Architectures
Instead of generic single-prompt generation, the platform orchestrates three specialized LangGraph state machines:
- **News Intelligence Agent (`NewsThreadFactoryGraph`)**: Ingests breaking news articles, runs real-time fact-checking dossiers, extracts high-velocity news hooks, and synthesizes balanced journalistic summaries optimized for social debate.
- **Social Media & Video Ingestion Agent (`SocialMediaThreadFactoryGraph`)**: Pulls full YouTube video transcripts (`youtube-transcript-plus`), blog posts, or public social discussions, decomposing complex 60-minute video narratives into bite-sized, high-retention thread posts.
- **Thematic Topic Agent (`TopicThreadFactoryGraph`)**: Expands high-level topics or rough ideas using dynamic multi-query search synthesis across DuckDuckGo, Brave Search, and Tavily, scraping target sources with Firecrawl and Jina to build rich thematic threads from scratch.
- **Deep Discovery Agent Subgraph (`DiscoveryAgentGraph`)**: An investigative journalism engine that executes across 4 nodes (`VectorHypothesizerNode` $\to$ `DialecticRetrievalNode` $\to$ `TensionExtractionNode` $\to$ `AngleFormulatorNode`) across 5 forensic lenses (BOM paradox, stagecraft, supply chain arbitrage, engineering trade-offs, regulatory asymmetry), conducting open-web dialectic retrieval to unearth primary teardowns and contrarian insights.

---

### 🎨 2. Automated Editorial Infographics Engine
The built-in **`InfographicGeneratorNode`** and headless rendering pipeline compile high-impact, Retina-resolution PNG infographics stored directly in Convex file storage:
- **5 Tailored Archetypes**: `kpi_flow` (chronological metrics + process flow), `entity_comparison` (two-column breakdown with disposition badges), `comparison_bars` (proportional horizontal charts), `stat_callout` (massive hero data callouts), and `custom_layout`.
- **Satori + Resvg Server-Side Rendering**: Compiles responsive HTML/Flexbox into scalable SVG via Satori and renders 2x Retina PNGs via `@resvg/resvg-js` on Node 24 (`convex.json`).
- **Font Subsetting & Fallback**: Packages bundled TrueType Inter font caching (`Inter-Regular.ttf`) with automatic remote CDN fallback in serverless environments.
- **Interactive Approval & On-Demand Rendering**: Displays instant previews in `InfographicDialog.tsx` with on-demand regeneration and automatic media attachment to thread drafts.

---

### 🔄 3. Self-Healing Reflection & Closed-World Critique Engine
The built-in **`ViralityCriticNode`** and **`ThreadWriterNode`** introduce an advanced self-correction loop engineered to eliminate moving goalposts and preserve creative quality:
- **Zero-Shot Virality Scoring**: Evaluates initial drafts on hook strength, cognitive momentum, tension resolution, and audience call-to-action effectiveness.
- **Closed-World Differential Critic (iteration ≥ 2)**: Rather than re-auditing from scratch and inventing new complaints, subsequent passes verify against an exact issue punchlist, auditing strictly whether previously flagged defects were resolved or objective platform rules were breached.
- **Surgical Post Pinning**: Automatically locks and pins passing posts while directing the writer to revise only flagged posts (`needs_fix` / `re_flagged`), preserving narrative flow and preventing regression.
- **Monotonic Scoring & Pareto Frontier Checkpointing**: Prevents score degradation when defects are resolved. Automatically tracks `best_thread_draft`, `best_virality_score`, and full `audit_history` in Convex schema, ensuring the highest-scoring candidate is always restored if a later pass regresses.
- **Persistent LangGraph Checkpointing**: State graphs are backed by PostgreSQL (`PostgresSaver`) for resilience across serverless execution and human-in-the-loop workflows, centralized in `convex/lib/agents/checkpointer.ts`.

---

### ⚡ 4. Enterprise Circuit Breaker & Model-Level Fallbacks
Integrated with **`convex/lib/agents/circuitBreaker.ts`** and **`convex/lib/agents/utils.ts`**:
- **Primary Gemini 4 Hydrogen Cascade**: Thread writing and virality critique prioritize Google's flagship **Gemini 4 Hydrogen** (`gemini-4-hydrogen`, thinkingLevel: high) with dual-key rotation, cascading seamlessly to Gemini 3.8 Flash, Gemini 3.6 Flash, DeepSeek Flash, and OpenAI GPT-5.4.
- **Model-Level `FallbackChatModel`**: Implements a unified `BaseChatModel` abstraction that preserves LangChain tool bindings (`bindTools`), thinking content blocks, streaming responses, and abort signals across candidate failover cascades without dropping state.
- **Provider-Aware Response Partitioning**: Uses `buildAgents` to partition candidates into provider-native structured schemas (`toolStrategy` for Google Gemini vs `providerStrategy` for DeepSeek).
- **Candidate Circuit Isolation & In-Flight Fast-Skipping**: Isolates failure state per provider/key group with 0ms fast-skipping if a key or model has already failed in the current execution cycle.
- **Zero Data Loss**: In-flight graph state remains safely check-pointed in PostgreSQL throughout provider outages.

---

### 🛡️ 5. Strict Algorithmic Compliance & Sanitization
The **`CharacterValidatorTool`** enforces social platform rules before posts ever hit draft status:
- **Platform Ceilings**: Strict enforcement of Meta Threads' 500-character hard limit per post.
- **Pacing & Relief Valves**: Enforces concise punchy posts with a maximum of 3 "relief valve" posts exceeding 200 characters.
- **Format Sanitization**: Strips invalid markdown formatting (e.g. nested bolding, headers, code fences) that break raw social rendering.
- **Banned Cliché Elimination**: Programmatically rejects spammy engagement phrases (e.g., *"a thread 🧵"*, *"let's dive in"*, *"here is why"*, *"in today's fast-paced world"*).
- **Hyperlink Guardrails**: Restricts external URLs exclusively to Call-to-Action (CTA) posts to prevent platform reach throttling.

---

### 🌐 6. Multi-Source Scraping & Verification Super-Stack
The engine utilizes a layered research infrastructure:
- **Native Google Trends Client**: Ingests Google Trends RSS feeds, extracts traffic volume and lead pictures, and resolves intermediate Google News redirects via Google's internal `batchexecute` RPC format (with Brave Search fallback).
- **Firecrawl**: Deep JavaScript rendering and clean markdown extraction from complex single-page apps and protected websites.
- **Jina AI Reader**: High-context document parser used as an intelligent fallback layer.
- **Tavily AI Search**: Context expander, background dossier builder, and real-time claim authenticity verification.
- **Brave Search API**: Privacy-preserving web search for high-signal technical documentation and fresh queries.
- **DuckDuckGo Scraping**: Fast entity metadata discovery without rate limits.
- **YouTube Transcript Engine**: Automated video subtitle parsing and narrative segmentation.

---

### 🎨 7. AI Visual Keyword Strategist
The **`VisualKeywordStrategistNode`** analyzes every drafted post and programmatically outputs tailored search queries:
- **Hero Visual Query**: Conceptual high-impact visual query for the opening hook.
- **Post-by-Post Queries**: Individualized image and video search keywords for every post in the thread, enabling creators to quickly source royalty-free assets, memes, and illustrations.

---

### ⚡ 8. Multi-Model LLM Routing Matrix
Dynamically routes tasks to specialized models optimized for cost, speed, and reasoning depth:

| Task / Node | Primary Models | Temperature | Purpose |
| :--- | :--- | :--- | :--- |
| **Web Scraping & Parsing** | Gemini 3.5 / 3.1 Flash-Lite (`thinkingLevel: 'off'`), DeepSeek Flash | `0.10` | High-fidelity data extraction with zero hallucinations |
| **Hook Strategy & Ideation** | Gemini 3.5 / 3.1 Flash-Lite, DeepSeek Flash (Reasoning None) | `0.80` | High creative variance & compelling psychological angles |
| **Deep Discovery Agent** | Gemini 4 Hydrogen, Gemini 3.8 / 3.6 Flash, DeepSeek Flash | `0.20–0.80` | Forensic vector hypothesizing, dialectic open-web retrieval & tension extraction |
| **Thread Writing** | Gemini 4 Hydrogen (`thinkingLevel: 'high'`), Gemini 3.8 / 3.6 Flash, DeepSeek Flash, GPT-5.4 | `0.80–0.85` | Narrative pacing, voice emulation & surgical post revision (`functionCalling`) |
| **Virality Critique & Audit** | Gemini 4 Hydrogen (`thinkingLevel: 'high'`), Gemini 3.8 / 3.6 Flash, DeepSeek Flash | `0.00` | Cold, analytical appraisal, closed-world punchlists & monotonic scoring |
| **Infographic Spec Synthesis**| Gemini 3.5 / 3.1 Flash-Lite, DeepSeek Flash (Reasoning None) | `0.20` | Structured data visualization, KPI extraction & visual archetype selection |
| **Context Research & Visuals**| Gemini 3.5 / 3.1 Flash-Lite, DeepSeek Flash (Reasoning None) | `0.20` | Structured background dossier assembly & visual prompt synthesis |

---

### 🔔 9. W3C Web Push & Notification Center (PWA)
- **Background Service Worker**: [`public/sw.js`](public/sw.js) receives push messages from FCM/Web Push on Android WebAPK and desktop browsers.
- **Cursor-Paginated Notification Center**: Backed by Convex's reactive `paginate` query with infinite scrolling, live active/unread counters (`counts`, `unseenCount`), and bulk actions (`markAllSeen`, `dismissAll`).
- **VAPID Cryptographic Authentication**: Type-safe subscription management in `convex/pushSubscriptions.ts` with automatic dead endpoint pruning.
- **Quiet Hours & Preferences**: User-configurable delivery windows and quiet-hour silencing.
- **Emerging Trend Crons**: 15-minute background cron monitoring trending keywords with one-click direct navigation to thread drafting.

---

### 📱 10. Direct Meta Threads API Publishing Engine
- **OAuth Token Lifecycle**: Handles automatic exchange from short-lived tokens to long-lived tokens with recurring Convex cron auto-refreshes.
- **Rich Media Publishing**: Supports single image uploads, multi-image carousels, video attachments, and multi-post reply chains.
- **Asynchronous Container Polling**: Monitors Meta media container processing states (`IN_PROGRESS`, `FINISHED`, `ERROR`) for guaranteed delivery.

---

### 🛡️ 11. Workpool Timeout Resilience & State Safeguards
- **Pre-Initialized Draft Allocation**: Thread generation pre-allocates the `threadDrafts` document ID before workpool dispatch, ensuring the background worker and `@convex-dev/workpool`'s `onGenerationComplete` hook can always locate and flag the draft record upon execution timeouts.
- **Automated Stuck Draft Sweeper**: Includes both internal scheduled cleanup (`markStuckDraftsAsFailed`) and authenticated client recovery (`cleanupStuckDrafts`) to automatically transition jobs exceeding the 15-minute threshold from `processing` to `failed` with actionable failure reasons and error navigation links.

---

## 💻 Creator Studio User Interface

The frontend is designed around a modern, high-contrast AI Creator Studio aesthetic:
- **Switch-Based Feature Toggle Cards**: Replaces checkboxes with accessible Base UI switch-based toggle cards in thread creation and regeneration dialogs, equipped with category badges ("Interactive", "Media", "Forensic Lens"), distinct Lucide icons, and violet accent styling.
- **Collapsible AI Critique Experience**: Overall thread critique cards and post-by-post fix directives feature mobile-optimized snippet previews, animated chevrons, and keyboard accessibility (Enter/Space).
- **Interactive Editorial Infographics Studio**: Preview and render publication-ready SVG/PNG infographics directly in `InfographicDialog.tsx` with on-demand regeneration.
- **Interactive Approval Studio**: Full-featured editor with drag-and-drop ordering, real-time character counters, line-break warnings, and high-resolution lead article image sidebars (`ArticleSidebarImage.tsx`).
- **Human-In-The-Loop Hook Selection**: Compare 5 AI-generated hook concepts ranked by psychological trigger type (Curiosity Gap, Contrarian, Data-Driven, Storyteller).
- **Research Dossier & Forensic Lens Inspector**: Inspect the underlying research data, scraped sources, tension scores, and verified claims used to construct the thread.
- **SEO & Production Domain Configuration**: Production-ready on [`viralthreads.agnivon.dev`](https://viralthreads.agnivon.dev) with dynamic `sitemap.ts`, `robots.ts`, Schema.org JSON-LD structured data (`SoftwareApplication`, `WebApplication`, `FAQPage`), and HTTP security headers.
- **Dark & Light Mode**: Built with Tailwind CSS 4, Radix UI primitives, Base UI, and Lucide icons.
- **Bot Protection**: Cloudflare Turnstile integration for secure generation endpoints.

---

## 🛠️ Tech Stack

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions, React 19)
- **Backend**: [Convex](https://convex.dev/) (Reactive real-time database, Workpools, Scheduled Crons, Auth)
- **Agent Framework**: [LangChain](https://js.langchain.com/) & [LangGraph.js](https://langchain-ai.github.io/langgraphjs/)
- **Visual Rendering**: [Satori](https://github.com/vercel/satori) (HTML/CSS to SVG) & [@resvg/resvg-js](https://github.com/yisibl/resvg-js) (Native SVG to Retina PNG)
- **Checkpointer**: PostgreSQL via `@langchain/langgraph-checkpoint-postgres` (centralized in `convex/lib/agents/checkpointer.ts`)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), Radix UI, Base UI, Sonner Toasts
- **Data Fetching**: TanStack React Query v5
- **Tooling**: Node.js 24+, TypeScript 6, ESLint 9, Secretlint, Vitest 5, Husky

---

## 🏁 Quickstart Guide

### Prerequisites

- **Node.js**: v24.22.1 or higher (configured via `.nvmrc`)
- **pnpm**: v10.0.0 or higher (`npm install -g pnpm`)
- **Convex Account**: [Sign up for free at convex.dev](https://convex.dev)
- **PostgreSQL Database**: Required for LangGraph state persistence (e.g. Neon, Supabase, Aiven, or local Postgres)

---

### 1. Clone & Install

```bash
git clone https://github.com/agnivon/viral_thread_generator.git
cd viral_thread_generator
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Populate the required credentials in `.env.local`:

```ini
# Convex Backend
CONVEX_DEPLOYMENT=dev:your-deployment-id
CONVEX_URL=https://your-deployment-id.convex.cloud
CONVEX_SITE_URL=https://your-deployment-id.convex.site
NEXT_PUBLIC_CONVEX_URL=https://your-deployment-id.convex.cloud

# LangGraph PostgreSQL Checkpoint Persistence
POSTGRES_URL=postgresql://user:password@hostname:5432/dbname?sslmode=require

# AI & LLM Provider Keys
GOOGLE_API_KEY=your_gemini_api_key
GOOGLE_API_KEY2=your_secondary_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Search & Scraping APIs
FIRECRAWL_API_KEY=your_firecrawl_api_key
TAVILY_API_KEY=your_tavily_api_key
JINA_API_KEY=your_jina_api_key
BRAVE_SEARCH_API_KEY=your_brave_key

# Meta Threads API (Optional for direct publishing)
THREADS_APP_ID=your_threads_app_id
THREADS_APP_SECRET=your_threads_app_secret
THREADS_REDIRECT_URI=https://your-deployment-id.convex.site/auth

# Cloudflare Turnstile Bot Protection
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your_turnstile_site_key
CLOUDFLARE_TURNSTILE_SECRET=your_turnstile_secret

# Application URL
NEXT_PUBLIC_APP_URL=https://viralthreads.agnivon.dev

# W3C Web Push & VAPID (Optional for mobile push notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your-email@example.com
```

### 3. Initialize Convex & Run Dev Server

```bash
pnpm dev
```

This concurrently starts:
- 🌐 **Next.js Frontend**: `http://localhost:3000`
- ⚡ **Convex Dev Cloud**: Real-time functions, schema sync, and local dashboard

---

## 📖 Available Scripts

| Command | Purpose |
| :--- | :--- |
| `pnpm dev` | Starts frontend (`next dev`) and Convex backend (`convex dev`) in parallel |
| `pnpm dev:frontend` | Starts only the Next.js frontend dev server |
| `pnpm dev:backend` | Starts only the Convex dev process |
| `pnpm build` | Builds the production Next.js bundle |
| `pnpm start` | Runs the production Next.js server |
| `pnpm logs` | Streams live backend logs from Convex |
| `pnpm type-check` | Runs TypeScript compilation verification across Next.js and Convex |
| `pnpm lint` | Runs Convex TypeScript check and ESLint with strict zero-warnings policy |
| `pnpm test` | Runs the full Vitest automated test suite (`34 test files, 362 tests`) |
| `pnpm exec secretlint "**/*"` | Audits the codebase for exposed API keys or secrets |
| `pnpm run create-user` | Seeds an initial user into Convex auth (`scripts/create-user.js`) |
| `pnpm run clear-auth` | Cleans orphaned auth records from Convex (`scripts/clear-auth.js`) |

---

## 📂 Repository Structure

```text
viral_thread_generator/
├── .github/                          # GitHub Actions CI & Community Templates
│   ├── workflows/ci.yml              # Automated CI Pipeline (Types, Lint, Test, Secrets)
│   ├── ISSUE_TEMPLATE/               # Bug Report, Feature Request & Config
│   └── pull_request_template.md      # Pull Request Quality Checklist
├── app/                              # Next.js 16 App Router
│   ├── (protected)/                  # Authenticated Creator Studio
│   │   ├── dashboard/                # Analytics & Generation Overview
│   │   ├── sources/                  # Real-Time Trend & News Discovery Hub
│   │   ├── threads/
│   │   │   ├── create/               # Multi-URL / Topic Thread Generator
│   │   │   └── drafts/               # Interactive Thread Editor & Studio
│   │   └── settings/                 # API & Account Settings
│   ├── login/                        # Authentication & Turnstile Shield
│   ├── robots.ts                     # Dynamic crawler indexing policy
│   ├── sitemap.ts                    # Dynamic XML sitemap generator
│   └── ConvexClientProvider.tsx      # Real-time Convex Provider
├── components/                       # Shared UI & Component Primitives
│   ├── ui/switch.tsx                 # Accessible Base UI feature toggle switch
│   └── ArticleSidebarImage.tsx       # High-resolution lead article image preview
├── convex/                           # Convex Reactive Backend
│   ├── actions/                      # Asynchronous Actions (AI & Outbound Network APIs)
│   ├── notifications/                # Workpool Hooks & Lifecycle Event Handlers
│   ├── threads.ts                    # Thread Draft Domain Queries & Mutations
│   ├── notifications.ts              # Notification Queries, Mutations & Pagination
│   ├── tokens.ts                     # Threads OAuth Token Storage & Inspection
│   ├── trendAlerts.ts                # Real-Time Emerging Trends & Alerts
│   ├── pushSubscriptions.ts         # Web Push Subscription Lifecycle
│   ├── crons.ts                      # Scheduled Background Tasks & Token Refresh
│   ├── schema.ts                     # Strictly Typed Database Schema
│   └── lib/
│       ├── agents/                   # LangGraph Multi-Agent Architecture
│       │   ├── checkpointer.ts       # Centralized PostgreSQL connection pool
│       │   ├── circuitBreaker.ts     # Multi-Provider Resilience & Failover
│       │   ├── models.ts             # LLM Model Routing Configuration
│       │   ├── sharedRouters.ts      # Bounded execution & differential routing
│       │   ├── sharedState.ts        # Unified thread factory state schema
│       │   ├── utils.ts              # FallbackChatModel & format partitioning
│       │   ├── news/                 # News Intelligence Agent Graph
│       │   ├── social_media/         # Video & Social Ingestion Agent Graph
│       │   ├── topic/                # Topic Expansion Agent Graph
│       │   └── discovery/            # Deep Discovery Agent Subgraph (5 Forensic Lenses)
│       ├── infographics/             # Automated Editorial Infographics Engine
│       │   ├── schema.ts             # InfographicSpec Zod Schema (5 Archetypes)
│       │   ├── renderer.ts           # Satori Virtual DOM & Resvg Compiler
│       │   ├── font.ts               # Bundled Inter TTF Caching & CDN Fallback
│       │   └── nodes.ts              # InfographicGeneratorNode
│       └── clients/                  # Consolidated Third-Party Service Clients
│           ├── googleTrends.ts       # Native Google Trends Client & batchexecute RPC
│           ├── threads.ts            # Meta Threads Graph API SDK
│           ├── brave.ts              # Brave Search API Client
│           └── jina.ts               # Jina Reader API Client
├── docs/                             # Comprehensive Technical Documentation
│   ├── architecture/                 # System Topology, Multi-Agent Graphs & Checkpointing
│   ├── features/                     # Deep Discovery, Infographics, Scraping, Publishing & Web Push
│   └── guides/                       # Adding Agent Nodes & Configuring LLM Models
├── public/
│   ├── sw.js                         # PWA Service Worker for Web Push & Notifications
│   └── icon.svg                      # Application Brand Icon
├── scripts/                          # Administrative Node Scripts (create-user, clear-auth)
├── .env.example                      # Template for all environment variables
├── .nvmrc                            # Node.js runtime configuration (>=24.22.1)
├── convex.json                       # Node 24 runtime & Resvg package externalization
├── CODE_OF_CONDUCT.md                # Contributor Covenant v2.1
├── CONTRIBUTING.md                    # Contribution Guidelines & Workflow
├── DESIGN.md                         # Design System specifications
├── LICENSE                           # MIT Open Source License
├── SECURITY.md                       # Security & Vulnerability Policy
├── vitest.config.mts                 # Vitest test suite configuration
└── package.json                      # Project configuration & dependencies
```

---

## 📚 Technical Documentation

Deep architectural guides, state machine designs, and contributor documentation are located in [`docs/`](docs/index.md):

- 🏛️ **[System Architecture Overview](docs/architecture/overview.md)**: Full-stack topology, reactive boundaries, and Workpool task scheduling.
- 🧠 **[Multi-Agent LangGraph Architectures](docs/architecture/multi-agent-graphs.md)**: Deep dive into the News, Social Media, and Topic graph state machines.
- 🔬 **[Deep Discovery Agent](docs/features/deep-discovery.md)**: 4-node investigative subgraph, 5 forensic lenses, and dialectic open-web retrieval.
- 🎨 **[Automated Editorial Infographics Engine](docs/features/infographics-engine.md)**: Satori virtual DOM layout, Resvg 2x Retina PNG compiler, and 5 visual archetypes.
- 💾 **[State Checkpointing & HITL Execution](docs/architecture/state-checkpointing.md)**: PostgreSQL checkpointers, centralized pools, thread persistence, and interrupts.
- ⚡ **[Circuit Breaker & Resilience](docs/architecture/circuit-breaker.md)**: Multi-provider failover chains across Google Gemini 4 Hydrogen, DeepSeek, and OpenAI.
- 🌐 **[Web Scraping & Verification Pipeline](docs/features/scraping-pipeline.md)**: Firecrawl, Jina fallback, native Google Trends resolution, and YouTube transcripts.
- 📱 **[Meta Threads Publishing Engine](docs/features/threads-publishing.md)**: OAuth 2.0 token life cycles, automated cron refresh, and media containers.
- 🎯 **[The Virality Engine](docs/features/virality-engine.md)**: Closed-World Differential Critic, surgical post pinning, and platform guardrails.
- 🔔 **[W3C Web Push & Mobile PWA Notifications](docs/features/web-push-notifications.md)**: VAPID cryptographic setup, service worker routing, and cursor pagination.
- 🛠️ **[Guide: Adding an Agent Node](docs/guides/adding-an-agent-node.md)**: Step-by-step developer tutorial for extending LangGraph workflows.
- 🤖 **[Guide: Adding an LLM Model](docs/guides/adding-a-model.md)**: Configuring new AI providers with circuit breaker tracking and thinking levels.

---

## 🧪 Testing & Quality Assurance

Viral Thread Generator includes a comprehensive test suite covering Convex backend mutations, token lifecycle management, character validation limits, and LangGraph node executions.

```bash
# Run unit & integration tests (runs 100% offline via mocks)
pnpm test

# Run type check across Next.js and Convex
pnpm type-check

# Run linter
pnpm lint

# Run secret vulnerability scan
pnpm exec secretlint "**/*"
```

---

## 🤝 Contributing

Contributions, feature requests, and improvements are welcome! Please check out our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

1. Fork the Project
2. Create a Feature Branch (`git checkout -b feature/EpicFeature`)
3. Commit your Changes (`git commit -m 'feat: add EpicFeature'`)
4. Verify Checks (`pnpm type-check && pnpm lint && pnpm test`)
5. Push to the Branch (`git push origin feature/EpicFeature`)
6. Open a Pull Request

---

## 👨‍💻 Author

**Agnivo Neogi**
- Website: [agnivon.dev](https://agnivon.dev)
- GitHub: [@agnivon](https://github.com/agnivon)

---

## 🔒 Security

For security vulnerability disclosures, please review our [Security Policy](SECURITY.md).

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
