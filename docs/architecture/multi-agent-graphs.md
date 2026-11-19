# Multi-Agent LangGraph Architectures

The core generation capabilities of **Viral Thread Generator** are driven by three specialized state machines built using **LangGraph.js**:

1. **`NewsThreadFactoryGraph`**: Ingests breaking news articles, verifies claims, and drafts factual, balanced threads.
2. **`SocialMediaThreadFactoryGraph`**: Processes YouTube video transcripts, blogs, and social links to extract core narratives.
3. **`TopicThreadFactoryGraph`**: Synthesizes open-ended thematic threads from scratch via autonomous multi-query web research.

---

## 🏗️ 1. News Intelligence Graph (`NewsThreadFactoryGraph`)

### Workflow Diagram

```
[START]
   │
   ▼
[ScraperNode] ──────── (Failure < 3 retries) ──────────────────┐
   │                                                           │
   ├────────── (discovery_agent: true) ────────┐               │
   │                                           │               │
   ▼ (Default)                                 ▼               │
[ContextResearcherNode]                [NewsDiscoveryNode]     │
   │                                    (DiscoveryAgentGraph)  │
   │ (Failure < 3 retries) ──┐                 │               │
   │                         │                 │               │
   ▼ (Success)               │                 │               │
   └─────────────────────────┼─────────────────┘               │
                             │                                 │
                             ▼                                 │
                   [HookStrategistNode] ── (Failure < 3) ────┐ │
                             │                               │ │
                             ├─ (manual_hook_selection: true)┤ │
                             │                               │ │
                             ▼ (Auto)                        ▼ │
                   [ThreadWriterNode] ◄── [ManualHookSelect] │ │
                      │   ▲                                  │ │
                      ▼   │ (Validation Failed < 3)          │ │
                   [CharacterValidatorNode]                  │ │
                      │                                      │ │
                      ▼ (Valid or Max Retries)               │ │
                   [ViralityCriticNode]                      │ │
                      │                                      │ │
                      ├─ (Rejected & iterations < 3) ────────┤ │
                      │                                      │ │
                      ▼ (Approved or Max Iterations)         │ │
                      ├─ (infographic_generation: true) ─┐   │ │
                      │                                  │   │ │
                      ▼                                  ▼   │ │
          [VisualKeywordStrategistNode]        [InfographicGen]│
                      │                                  │   │ │
                      ▼                                  ▼   │ │
                    [END]                              [END] │ │
                                                             ▼ ▼
                                                        [RETRY LOOP]
```

### Node Responsibilities
- **`ScraperNode`**: Scrapes the input URL using Firecrawl API with Jina Reader fallback. Extracts clean markdown and associated image assets.
- **`NewsDiscoveryNode` (Subgraph)**: Dispatches to `DiscoveryAgentGraph` when `discovery_agent` is enabled. Executes vector hypothesizing, dialectic open-web retrieval (Tavily + Jina), and tension extraction across 5 forensic lenses to produce `discovery_angles` and `core_delta`.
- **`ContextResearcherNode`**: Searches Tavily to extract entity metadata, public sentiment, and background context. Compiles an evidentiary research dossier when Discovery is not activated.
- **`HookStrategistNode`**: Evaluates the dossier/discovery angles and generates 5 diverse psychological hook variations (Curiosity Gap, Contrarian, High Stakes, Data-Driven, Storyteller).
- **`ManualHookSelectionNode`**: An interrupt node that pauses the graph for user selection if `manual_hook_selection` was requested.
- **`ThreadWriterNode`**: Emulates top viral ghostwriter pacing, narrative tension, and clean formatting. Uses surgical post pinning for iterations $\ge 2$.
- **`CharacterValidatorNode`**: Deterministic validation tool checking 500-char limits, max 4 line breaks, and eliminating banned clichés.
- **`ViralityCriticNode`**: Zero-shot critical evaluation on pass 1; Closed-World Differential Critic on passes 2–3 producing post-by-post structural feedback and fix directives.
- **`InfographicGeneratorNode`**: Synthesizes structured data visualization specifications (`InfographicSpec`) across 5 visual archetypes (`kpi_flow`, `entity_comparison`, `comparison_bars`, `stat_callout`, `custom_layout`) for server-side Satori/Resvg compilation.
- **`VisualKeywordStrategistNode`**: Crafts targeted image and video search prompts for the hero hook and subsequent thread posts.

---

## 🎥 2. Social Media & Video Ingestion Graph (`SocialMediaThreadFactoryGraph`)

### Key Differences
- **YouTube Ingestion Engine**: If the provided URL matches a YouTube video, the graph utilizes `YoutubeScraperTool` (`youtube-transcript-plus`) to extract the entire spoken transcript.
- **Narrative Chunking**: Long-form transcripts (often 10,000+ words) are filtered to identify key takeaways, timestamps, and core conceptual arguments before hook generation.
- **Authenticity Checker**: Uses Tavily search to cross-verify claims made in video transcripts against authoritative sources before publication.

---

## 🔍 3. Thematic Topic Graph (`TopicThreadFactoryGraph`)

### Key Differences
- **`ResearchOrchestratorNode`**: Instead of reading a single article, this node breaks the topic into 3–5 search vectors.
- **Multi-Engine Synthesis**: Dispatches queries concurrently across **DuckDuckGo** and **Tavily**, synthesizing results to discover the most compelling angles.
- **`DeepPageScraperNode`**: Dynamically scrapes the top 2–3 cited URLs discovered during topic research using Firecrawl to build deep context.

---

## 🔀 State Channels & Reducers

All graphs inherit from the unified state schema defined in `convex/lib/agents/sharedState.ts`:

```typescript
export interface BaseThreadFactoryStateType {
  // Input arguments
  url?: string;
  topic?: string;
  guidance?: string;
  manual_hook_selection?: boolean;
  search_query_generation?: boolean;
  infographic_generation?: boolean;
  discovery_agent?: boolean;

  // Ingested context & Discovery
  raw_markdown: string;
  research_context: string;
  images: string[];
  discovery_angles?: Array<{
    vector: string;
    surface_narrative: string;
    forensic_reality: string;
    core_tension: string;
    primary_proof_sources: string[];
  }>;
  core_delta?: string;

  // Drafting & Hooks
  core_hooks: string[];
  selected_hook: string | null;
  thread_draft: string[];

  // Critique, Differential Audit & Pareto State
  virality_score: number;
  critique: string | null;
  post_critiques: Array<{
    post_index: number;
    critique: string;
    fix_directive?: string;
    status?: "open" | "resolved" | "unresolved";
  }>;
  best_thread_draft?: string[];
  best_virality_score?: number;
  audit_history: Array<{
    iteration: number;
    virality_score: number;
    post_critiques: Array<{
      post_index: number;
      critique: string;
      fix_directive?: string;
      status: "open" | "resolved" | "unresolved";
    }>;
  }>;
  iterations: number;
  max_iterations: number;
  is_approved: boolean;

  // Visual Assets & Infographics
  search_queries?: {
    hero_visual_query: string;
    post_visual_queries: Array<{
      post_index: number;
      image_search_query: string;
      video_search_query: string;
    }>;
  };
  infographic_spec?: InfographicSpec;
  infographic_url?: string;

  // Node Retry & Diagnostics
  retries: Record<string, number>;
  parse_success: boolean;
}
```

---

## ⚙️ Conditional Routing, Differential Audits & Pareto Checkpointing

Each state machine enforces bounded execution limits to prevent infinite loops:

1. **Deep Discovery Subgraph Dispatch (`route_after_scraper`)**:
   - If `discovery_agent` is enabled, the graph routes directly to `NewsDiscoveryNode` (or `SocialDiscoveryNode` / `TopicDiscoveryNode`).
   - The node executes the 4-step `DiscoveryAgentGraph` (`VectorHypothesizerNode` $\to$ `DialecticRetrievalNode` $\to$ `TensionExtractionNode` $\to$ `AngleFormulatorNode`).
   - If the contradiction strength extracted by `TensionExtractionNode` is weak (`maxScore < 4`), it loops back to `DialecticRetrievalNode` to find stronger counter-evidence before formulating angles.
2. **Provider-Aware Response Format Partitioning**:
   - In `convex/lib/agents/utils.ts`, `buildAgents` dynamically partitions candidate models into provider-native structured output strategies:
     - Google Gemini candidates receive `toolStrategy` with native function calling (`method: "functionCalling"`).
     - DeepSeek candidates receive `providerStrategy(schema)` with `json_object` schemas.
   - This prevents schema translation errors when failing over across heterogeneous providers.
3. **Closed-World Differential Critique (iteration $\ge 2$)**:
   - Initial drafts (iteration 1) undergo zero-shot editorial critique.
   - For all subsequent passes (iterations 2 and 3), the graph transitions to the **Closed-World Differential Critic**. Instead of performing an open-ended review that risks hallucinations and "moving goalposts", it takes the exact punchlist of previously flagged post defects and strictly checks whether they are resolved, verifying that no new objective platform rules (character limits, banned phrases) were violated.
4. **Surgical Post Pinning**:
   - In iteration $\ge 2$, `ThreadWriterNode` does not discard and rewrite the entire thread.
   - Passing posts are pinned in place. The writer context explicitly isolates only posts marked `needs_fix` or `re_flagged`, and `reconcileSurgicalDraft` merges the revisions back while preserving global context and voice.
5. **Monotonic Scoring & Pareto Frontier Checkpointing**:
   - `calculateMonotonicScore` prevents virality scores from declining when previously flagged defects are fixed.
   - Throughout iteration loops, `handleGraphCompletion` evaluates candidate states against the Pareto frontier (`best_virality_score`, `best_thread_draft`). If an iteration results in a lower score or unapproved state, the system automatically restores the highest-scoring candidate draft.
6. **Infographic Routing (`createRouteAfterCritic`)**:
   - When the critic approves the draft or hits iteration ceilings, `createRouteAfterCritic` checks if `infographic_generation` is enabled.
   - If enabled, execution advances to `InfographicGeneratorNode` to construct the `InfographicSpec` before ending the graph run.
7. **Node Retry Quotas**: If a node fails to produce valid JSON or crashes, the conditional router increments `retries[node]`. If retries reach `3`, the graph throws a fatal error that records the exact failure reason in Convex.
8. **Character Validation Relief**: If character formatting errors persist after 3 attempts, but only line-break violations remain (without breaching the 500-char hard ceiling), the router gracefully advances to `ViralityCriticNode` rather than aborting.
9. **Iteration Caps**: The reflection loop between `ViralityCriticNode` and `ThreadWriterNode` is capped at **3 iterations** (`max_iterations: 3`). Once complete, the finalized Pareto-optimal draft is forwarded to visual synthesis and infographics.
