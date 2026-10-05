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
                       │          Brave Search ── Google Trends ── YouTube      │
                       └───────────────────────────┬────────────────────────────┘
                                                   │
                                                   ▼
                       ┌────────────────────────────────────────────────────────┐
                       │          AUTONOMOUS MULTI-AGENT PIPELINE               │
                       │                                                        │
                       │  1. ContextResearcherNode (Synthesizes Dossier)       │
                       │  2. HookStrategistNode    (Crafts 5 Viral Angles)     │
                       │  3. [Optional] Human-In-The-Loop Hook Selector         │
                       │  4. ThreadWriterNode      (Pacing & Narrative Flow)    │
                       │  5. CharacterValidator    (500-Char Safety & Rules)    │
                       │  6. ViralityCriticNode    (Reflection & Self-Fix Loop) │
                       │  7. VisualKeywordStrategist (Image/Video Prompts)      │
                       └───────────────────────────┬────────────────────────────┘
                                                   │
                                                   ▼
                       ┌────────────────────────────────────────────────────────┐
                       │           REACTIVE CREATOR STUDIO & PUBLISHER          │
                       │  Live Editor ── Asset Picker ── Threads Graph API      │
                       │     Circuit Breaker Failover ── W3C Web Push (PWA)     │
                       └────────────────────────────────────────────────────────┘
```

### 🧠 1. Specialized Multi-Agent LangGraph Architectures
Instead of generic single-prompt generation, the platform orchestrates three specialized LangGraph state machines:
- **News Intelligence Agent (`NewsThreadFactoryGraph`)**: Ingests breaking news articles, runs real-time fact-checking dossiers, extracts high-velocity news hooks, and synthesizes balanced journalistic summaries optimized for social debate.
- **Social Media & Video Ingestion Agent (`SocialMediaThreadFactoryGraph`)**: Pulls full YouTube video transcripts (`youtube-transcript-plus`), blog posts, or public social discussions, decomposing complex 60-minute video narratives into bite-sized, high-retention thread posts.
- **Thematic Topic Agent (`TopicThreadFactoryGraph`)**: Expands high-level topics or rough ideas using dynamic multi-query search synthesis across DuckDuckGo, Brave Search, and Tavily, scraping target sources with Firecrawl and Jina to build rich thematic threads from scratch.

---

### 🔄 2. Self-Healing Reflection & Critique Engine
The built-in **`ViralityCriticNode`** introduces automated self-correction loops:
- **Zero-Shot Virality Scoring**: Evaluates drafted threads on hook strength, cognitive momentum, tension resolution, and audience call-to-action effectiveness.
- **Post-by-Post Critique & Fix Directives**: Generates granular feedback on individual posts, automatically routing failing drafts back to the `ThreadWriterNode` with structured rewrite instructions.
- **Persistent LangGraph Checkpointing**: State graphs are backed by PostgreSQL (`PostgresSaver`) for resilience across serverless execution and human-in-the-loop workflows.

---

### ⚡ 3. Enterprise Circuit Breaker & Model Failover
Integrated with **`convex/lib/agents/circuitBreaker.ts`**:
- **Automatic Fallback Chains**: If an LLM provider encounters rate limits (`429`), server errors (`5xx`), or timeouts, calls are instantly rerouted to healthy backup providers.
- **Dynamic Circuit Tripping**: Automatically suppresses failing model/provider pairs for configurable cooling-off periods to conserve tokens and prevent cascaded failures.
- **Zero Data Loss**: In-flight graph state remains safely check-pointed in PostgreSQL throughout provider outages.

---

### 🛡️ 4. Strict Algorithmic Compliance & Sanitization
The **`CharacterValidatorTool`** enforces social platform rules before posts ever hit draft status:
- **Platform Ceilings**: Strict enforcement of Meta Threads' 500-character hard limit per post.
- **Pacing & Relief Valves**: Enforces concise punchy posts with a maximum of 3 "relief valve" posts exceeding 200 characters.
- **Format Sanitization**: Strips invalid markdown formatting (e.g. nested bolding, headers, code fences) that break raw social rendering.
- **Banned Cliché Elimination**: Programmatically rejects spammy engagement phrases (e.g., *"a thread 🧵"*, *"let's dive in"*, *"here is why"*, *"in today's fast-paced world"*).
- **Hyperlink Guardrails**: Restricts external URLs exclusively to Call-to-Action (CTA) posts to prevent platform reach throttling.

---

### 🌐 5. Multi-Source Scraping & Verification Super-Stack
The engine utilizes a layered research infrastructure:
- **Firecrawl**: Deep JavaScript rendering and clean markdown extraction from complex single-page apps and protected websites.
- **Jina AI Reader**: High-context document parser used as an intelligent fallback layer.
- **Tavily AI Search**: Context expander, background dossier builder, and real-time claim authenticity verification.
- **Brave Search API**: Privacy-preserving web search for high-signal technical documentation and fresh queries.
- **DuckDuckGo Scraping**: Fast entity metadata discovery without rate limits.
- **YouTube Transcript Engine**: Automated video subtitle parsing and narrative segmentation.

---

### 🎨 6. AI Visual Keyword Strategist
The **`VisualKeywordStrategistNode`** analyzes every drafted post and programmatically outputs tailored search queries:
- **Hero Visual Query**: Conceptual high-impact visual query for the opening hook.
- **Post-by-Post Queries**: Individualized image and video search keywords for every post in the thread, enabling creators to quickly source royalty-free assets, memes, and illustrations.

---

### ⚡ 7. Multi-Model LLM Routing Matrix
Dynamically routes tasks to specialized models optimized for cost, speed, and reasoning depth:

| Task / Node | Primary Models | Temperature | Purpose |
| :--- | :--- | :--- | :--- |
| **Web Scraping & Parsing** | Gemini 3.5 / 3.1 Flash-Lite | `0.10` | High-fidelity data extraction with zero hallucinations |
| **Hook Strategy & Ideation** | Gemini 3.5 Flash-Lite / GPT-5.4 Mini | `0.80` | High creative variance & compelling psychological angles |
| **Thread Writing** | Gemini 3.8 / 3.7 / 3.6 / 3.5 Flash, DeepSeek Flash, GPT-5.4 | `0.80` | Narrative pacing, voice emulation & engaging prose |
| **Virality Critique & Audit** | Gemini 3.7 Flash / DeepSeek Flash (High Reasoning) | `0.00` | Cold, analytical appraisal and structural diagnosis |
| **Context Research** | Gemini 3.5 Flash-Lite | `0.20` | Structured background dossier assembly |

---

### 🔔 8. W3C Web Push & Trend Notifications (PWA)
- **Background Service Worker**: [`public/sw.js`](public/sw.js) receives push messages from FCM/Web Push on Android WebAPK and desktop browsers.
- **VAPID Cryptographic Authentication**: Type-safe subscription management in `convex/pushSubscriptions.ts` with automatic dead endpoint pruning.
- **Quiet Hours & Preferences**: User-configurable delivery windows and quiet-hour silencing.
- **Emerging Trend Crons**: 15-minute background cron monitoring trending keywords with one-click direct navigation to thread drafting.

---

### 📱 9. Direct Meta Threads API Publishing Engine
- **OAuth Token Lifecycle**: Handles automatic exchange from short-lived tokens to long-lived tokens with recurring Convex cron auto-refreshes.
- **Rich Media Publishing**: Supports single image uploads, multi-image carousels, video attachments, and multi-post reply chains.
- **Asynchronous Container Polling**: Monitors Meta media container processing states (`IN_PROGRESS`, `FINISHED`, `ERROR`) for guaranteed delivery.

---

## 💻 Creator Studio User Interface

The frontend is designed around a modern, high-contrast AI Creator Studio aesthetic:
- **Interactive Approval Studio**: Full-featured editor with drag-and-drop ordering, real-time character counters, and line-break warnings.
- **Human-In-The-Loop Hook Selection**: Compare 5 AI-generated hook concepts ranked by psychological trigger type (Curiosity Gap, Contrarian, Data-Driven, Storyteller).
- **Research Dossier Inspector**: Inspect the underlying research data, scraped sources, and verified claims used to construct the thread.
- **Asset Picker & Media Manager**: Attach and preview images or videos directly within the thread simulator.
- **Dark & Light Mode**: Built with Tailwind CSS 4, Radix UI primitives, and Lucide icons.
- **Bot Protection**: Cloudflare Turnstile integration for secure generation endpoints.

---

## 🛠️ Tech Stack

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions, React 19)
- **Backend**: [Convex](https://convex.dev/) (Reactive real-time database, Workpools, Scheduled Crons, Auth)
- **Agent Framework**: [LangChain](https://js.langchain.com/) & [LangGraph.js](https://langchain-ai.github.io/langgraphjs/)
- **Checkpointer**: PostgreSQL via `@langchain/langgraph-checkpoint-postgres`
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), Radix UI, Base UI, Sonner Toasts
- **Data Fetching**: TanStack React Query v5
- **Tooling**: TypeScript 6, ESLint 9, Secretlint, Vitest, Husky

---

## 🏁 Quickstart Guide

### Prerequisites

- **Node.js**: v20.0.0 or higher
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
| `pnpm test` | Runs the full Vitest automated test suite (`28 test files, 261 tests`) |
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
│   └── ConvexClientProvider.tsx      # Real-time Convex Provider
├── components/                       # Shared UI & Component Primitives
├── convex/                           # Convex Reactive Backend
│   ├── actions/                      # Asynchronous Actions (AI & Network APIs)
│   ├── mutations/                    # Database Mutations & State Changes
│   ├── queries/                      # Real-time Subscriptions & Queries
│   ├── crons.ts                      # Scheduled Background Tasks & Token Refresh
│   ├── schema.ts                     # Strictly Typed Database Schema
│   └── lib/
│       ├── agents/                   # LangGraph Multi-Agent Architecture
│       │   ├── news/                 # News Intelligence Agent Graph
│       │   ├── social_media/         # Video & Social Ingestion Agent Graph
│       │   ├── topic/                # Topic Expansion Agent Graph
│       │   ├── circuitBreaker.ts     # Multi-Provider Resilience & Failover
│       │   ├── models.ts             # LLM Model Routing Configuration
│       │   └── tools.ts              # Agent Tools & Formatting Validator
│       └── clients/                  # Consolidated Third-Party Service Clients
│           ├── threads.ts            # Meta Threads Graph API SDK
│           ├── brave.ts              # Brave Search API Client
│           ├── currents.ts           # Currents News API Client
│           ├── newsdata.ts           # NewsData.io Client
│           ├── jina.ts               # Jina Reader API Client
│           └── firebase.ts           # Firebase Admin & Firestore Client
├── docs/                             # Comprehensive Technical Documentation
│   ├── architecture/                 # System Topology, Multi-Agent Graphs & Checkpointing
│   ├── features/                     # Scraping, Threads Publishing, Virality Engine & Web Push
│   └── guides/                       # Adding Agent Nodes & Configuring LLM Models
├── public/
│   ├── sw.js                         # PWA Service Worker for Web Push & Notifications
│   └── icon.svg                      # Application Brand Icon
├── scripts/                          # Administrative Node Scripts (create-user, clear-auth)
├── .env.example                      # Template for all environment variables
├── CODE_OF_CONDUCT.md                # Contributor Covenant v2.1
├── CONTRIBUTING.md                    # Contribution Guidelines & Workflow
├── DESIGN.md                         # Design System specifications
├── LICENSE                           # MIT Open Source License
├── SECURITY.md                       # Security & Vulnerability Policy
└── package.json                      # Project configuration & dependencies
```

---

## 📚 Technical Documentation

Deep architectural guides, state machine designs, and contributor documentation are located in [`docs/`](docs/index.md):

- 🏛️ **[System Architecture Overview](docs/architecture/overview.md)**: Full-stack topology, reactive boundaries, and Workpool task scheduling.
- 🧠 **[Multi-Agent LangGraph Architectures](docs/architecture/multi-agent-graphs.md)**: Deep dive into the News, Social Media, and Topic graph state machines.
- 💾 **[State Checkpointing & HITL Execution](docs/architecture/state-checkpointing.md)**: PostgreSQL checkpointers, thread persistence, and Human-in-the-Loop interrupts.
- ⚡ **[Circuit Breaker & Resilience](docs/architecture/circuit-breaker.md)**: Multi-provider failover chains across Google, DeepSeek, and OpenAI.
- 🌐 **[Web Scraping & Verification Pipeline](docs/features/scraping-pipeline.md)**: Firecrawl, Jina fallback, Tavily claim verifier, and YouTube transcripts.
- 📱 **[Meta Threads Publishing Engine](docs/features/threads-publishing.md)**: OAuth 2.0 token life cycles, automated cron refresh, and media containers.
- 🎯 **[The Virality Engine](docs/features/virality-engine.md)**: Zero-shot critic evaluation, reflection loops, and algorithmic platform guardrails.
- 🔔 **[W3C Web Push & Mobile PWA Notifications](docs/features/web-push-notifications.md)**: VAPID cryptographic setup, service worker routing, and trend crons.
- 🛠️ **[Guide: Adding an Agent Node](docs/guides/adding-an-agent-node.md)**: Step-by-step developer tutorial for extending LangGraph workflows.
- 🤖 **[Guide: Adding an LLM Model](docs/guides/adding-a-model.md)**: Configuring new AI providers with circuit breaker tracking.

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

## 🔒 Security

For security vulnerability disclosures, please review our [Security Policy](SECURITY.md).

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
