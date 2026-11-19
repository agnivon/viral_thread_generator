# Convex Backend Architecture

This directory contains the reactive backend for **Viral Thread Generator**, built on [Convex](https://convex.dev).

---

## 🏛️ Directory Structure & Architectural Standards

```text
convex/
├── schema.ts                   # Strictly typed database schema with validators
├── crons.ts                    # Scheduled background tasks (token refresh, trend alerts)
├── http.ts                     # HTTP actions (OAuth callback handling)
├── threads.ts                  # Root domain queries & mutations for threadDrafts
├── tokens.ts                   # Domain queries & mutations for Meta access tokens
├── notifications.ts            # Cursor-paginated notification center queries & mutations
├── trendAlerts.ts              # Emerging trends & alert notification mutations
├── pushSubscriptions.ts        # W3C Web Push subscription lifecycle
├── actions/                    # Asynchronous actions ("use node";)
│   ├── threads.ts              # Agent graph invocation, queueing & infographic actions
│   ├── googleTrends.ts         # Native Google Trends ingestion & redirect resolution
│   ├── pushNotifications.ts    # VAPID payload signing & push delivery
│   └── setup.ts                # Environment verification & diagnostic actions
├── notifications/              # Workpool lifecycle hooks
│   └── onComplete.ts           # Workpool completion & stuck draft handlers
├── lib/
│   ├── agents/                 # Multi-agent LangGraph architectures
│   │   ├── checkpointer.ts     # Centralized PostgresSaver connection pool
│   │   ├── circuitBreaker.ts   # Multi-provider circuit breaker & failover
│   │   ├── models.ts           # LLM candidate definitions & routing matrix
│   │   ├── sharedRouters.ts    # Bounded execution & differential critique routers
│   │   ├── sharedState.ts      # Base thread state schema definition
│   │   ├── utils.ts            # FallbackChatModel & provider format partitioner
│   │   ├── news/               # NewsThreadFactoryGraph
│   │   ├── social_media/       # SocialMediaThreadFactoryGraph (YouTube)
│   │   ├── topic/              # TopicThreadFactoryGraph (Multi-Search)
│   │   └── discovery/          # Deep Discovery Agent subgraph (5 forensic lenses)
│   ├── infographics/           # Automated Editorial Infographics Engine
│   │   ├── schema.ts           # InfographicSpec Zod schema (5 archetypes)
│   │   ├── renderer.ts         # Satori virtual DOM & Resvg PNG compiler
│   │   ├── nodes.ts            # InfographicGeneratorNode
│   │   ├── font.ts             # TrueType font caching & remote CDN download fallback
│   │   └── prompts.ts          # Structured visual density prompts
│   └── clients/                # Consolidated external service clients
│       ├── googleTrends.ts     # Native Google Trends client & batchexecute RPC
│       ├── brave.ts            # Brave Search API client
│       ├── jina.ts             # Jina Reader API client
│       └── threads.ts          # Meta Threads Graph API client
└── __tests__/                  # Private test suite (ignored by Convex route generation)
    ├── actions/                # Action unit tests
    ├── agents/                 # Agent nodes, graphs & discovery tests
    ├── lib/                    # Client & utility tests
    └── threads.test.ts         # End-to-end thread mutations & lifecycle tests
```

---

## ⚡ Key Architectural Principles

1. **Domain Cohesion at Root**:
   Keep domain queries and mutations for a specific table together in unified modules at `convex/` root (`convex/threads.ts`, `convex/tokens.ts`, `convex/trendAlerts.ts`). Avoid fragmented `queries/` and `mutations/` subdirectories.
2. **Action Runtime Boundary (`"use node";`)**:
   All files performing outbound network calls, LLM invocations, or utilizing Node modules must reside in `convex/actions/` or `convex/lib/agents/` and include `"use node";` at the very top.
3. **Mandatory Authorization**:
   Any action, mutation, or query accessing or modifying user state must strictly derive authenticated identity server-side via `await requireAuthUserId(ctx)`. Client-provided user IDs are strictly rejected.
4. **Node 24 Runtime & Resvg Externalization**:
   Configured via `convex.json`, the deployment runs Node 24 and externalizes `@resvg/resvg-js` for native binary rendering support.
5. **Private Underscore Folders for Tests**:
   All backend tests reside inside `convex/__tests__/` so they are completely ignored by Convex's API routing engine.
