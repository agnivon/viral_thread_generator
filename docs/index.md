# 📚 Viral Thread Generator Technical Documentation

Welcome to the technical documentation for **Viral Thread Generator**, the enterprise-grade autonomous AI creator studio and multi-agent publishing engine for Meta Threads.

This documentation is designed for software engineers, AI system architects, and open-source contributors looking to understand, extend, or deploy the platform.

---

## 🗺️ Documentation Map

```
docs/
├── architecture/
│   ├── overview.md               # High-level architecture: Next.js + Convex + LangGraph
│   ├── multi-agent-graphs.md     # Deep dive into News, Social Media, and Topic graphs & routing
│   ├── state-checkpointing.md    # PostgresSaver, thread persistence & Human-in-the-Loop interrupts
│   └── circuit-breaker.md        # Multi-provider LLM failover, tripping rules & resilience
├── features/
│   ├── scraping-pipeline.md      # Firecrawl, Jina fallback, Tavily claim verifier & YouTube parser
│   ├── threads-publishing.md     # OAuth token lifecycle & Threads Graph API media containers
│   ├── virality-engine.md        # ViralityCriticNode, reflection loops & CharacterValidator rules
│   └── web-push-notifications.md # VAPID setup, service worker routing & emerging trend crons
└── guides/
    ├── adding-an-agent-node.md   # Step-by-step guide to implement a new LangGraph node
    └── adding-a-model.md         # Guide to configuring new LLM models in models.ts
```

---

## 📖 Recommended Reading Paths

### For Full-Stack Engineers & Deployers
1. [Architecture Overview](architecture/overview.md) — Understand the division of labor between Next.js 16, Convex, and LangGraph.
2. [State Checkpointing](architecture/state-checkpointing.md) — How PostgreSQL checkpointers keep serverless agent runs stateful.
3. [Threads Publishing Engine](features/threads-publishing.md) — Meta Graph API token life cycles and media publishing containers.
4. [Web Push Notifications](features/web-push-notifications.md) — Service Worker delivery and VAPID setup.

### For AI & Agentic Workflow Researchers
1. [Multi-Agent Graphs](architecture/multi-agent-graphs.md) — State schemas, routing heuristics, and retry quotas for the three factory graphs.
2. [Circuit Breaker & Model Failover](architecture/circuit-breaker.md) — Dynamic fallback cascading across Google, OpenAI, DeepSeek, and OpenRouter.
3. [The Virality Engine](features/virality-engine.md) — Zero-shot critic evaluation, reflection loops, and algorithmic platform guardrails.
4. [Scraping & Verification Pipeline](features/scraping-pipeline.md) — Multilayered web research and real-time claim authenticity checking.

### For Open-Source Contributors
1. [Adding an Agent Node](guides/adding-an-agent-node.md) — Learn the node contract, state transformations, and test requirements.
2. [Adding a Model](guides/adding-a-model.md) — Register new LLM providers and attach circuit breaker identities.
3. [Contributing Guidelines](../CONTRIBUTING.md) — Branching models, zero `any` policy, and pre-commit checks.

---

## ⚡ Core Architecture Principles

1. **Deterministic Database vs. Nondeterministic AI Isolation**:
   All database operations (queries, mutations) in Convex are deterministic and transactionally safe. All nondeterministic LLM workflows, HTTP scraping, and external API requests run exclusively inside Convex Actions or LangGraph agents.
2. **Strict Zero-`any` Type Safety**:
   Types are strictly modeled across Zod schemas, LangGraph state channels, Convex `v` validators, and TypeScript interfaces.
3. **Resilience Over Optimism**:
   Network scrapers feature automatic fallbacks (e.g. Firecrawl $\to$ Jina Reader); LLM calls feature active circuit breakers that automatically route around provider outages; and graph executions persist incrementally to PostgreSQL.
