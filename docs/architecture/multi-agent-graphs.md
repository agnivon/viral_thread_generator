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
[ScraperNode] ──────── (Failure < 3 retries) ───────┐
   │                                                │
   ▼ (Success)                                      │
[ContextResearcherNode] ─ (Failure < 3 retries) ──┐ │
   │                                              │ │
   ▼ (Success)                                    │ │
[HookStrategistNode] ── (Failure < 3 retries) ──┐ │ │
   │                                            │ │ │
   ├────────── (manual_hook_selection: true) ─┐ │ │ │
   │                                          │ │ │ │
   ▼ (Auto)                                   ▼ │ │ │
[ThreadWriterNode] ◄── [ManualHookSelection]  │ │ │ │
   │   ▲                                      │ │ │ │
   ▼   │ (Validation Failed & retries < 3)    │ │ │ │
[CharacterValidatorNode]                      │ │ │ │
   │                                          │ │ │ │
   ▼ (Valid or Max Retries)                   │ │ │ │
[ViralityCriticNode]                          │ │ │ │
   │                                          │ │ │ │
   ├────────── (Rejected & iterations < 3) ───┤ │ │ │
   │                                          │ │ │ │
   ▼ (Approved or Max Iterations)             │ │ │ │
[VisualKeywordStrategistNode]                 │ │ │ │
   │                                          ▼ ▼ ▼ ▼
   ▼                                         [RETRY LOOP]
 [END]
```

### Node Responsibilities
- **`ScraperNode`**: Scrapes the input URL using Firecrawl API with Jina Reader fallback. Extracts clean markdown and associated image assets.
- **`ContextResearcherNode`**: Searches Tavily to extract entity metadata, public sentiment, and background context. Compiles an evidentiary research dossier.
- **`HookStrategistNode`**: Evaluates the dossier and generates 5 diverse psychological hook variations (Curiosity Gap, Contrarian, High Stakes, Data-Driven, Storyteller).
- **`ManualHookSelectionNode`**: An interrupt node that pauses the graph for user selection if `manual_hook_selection` was requested.
- **`ThreadWriterNode`**: Emulates top viral ghostwriter pacing, narrative tension, and clean formatting.
- **`CharacterValidatorNode`**: Deterministic validation tool checking 500-char limits, max 4 line breaks, and eliminating banned clichés.
- **`ViralityCriticNode`**: Zero-shot critical evaluation producing post-by-post structural feedback and fix directives.
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

  // Ingested context
  raw_markdown: string;
  research_context: string;
  images: string[];

  // Drafting & Hooks
  core_hooks: string[];
  selected_hook: string | null;
  thread_draft: string[];

  // Critique & Iteration
  virality_score: number;
  critique: string | null;
  post_critiques: Array<{
    post_index: number;
    critique: string;
    fix_directive?: string;
  }>;
  iterations: number;
  is_approved: boolean;

  // Visual Assets
  search_queries?: {
    hero_visual_query: string;
    post_visual_queries: Array<{
      post_index: number;
      image_search_query: string;
      video_search_query: string;
    }>;
  };

  // Node Retry & Diagnostics
  retries: Record<string, number>;
  parse_success: boolean;
}
```

---

## ⚙️ Conditional Routing & Error Escalation

Each state machine enforces bounded execution limits to prevent infinite loops:

1. **Node Retry Quotas**: If a node fails to produce valid JSON or crashes, the conditional router increments `retries[node]`. If retries reach `3`, the graph throws a fatal error that records the exact failure reason in Convex.
2. **Character Validation Relief**: If character formatting errors persist after 3 attempts, but only line-break violations remain (without breaching the 500-char hard ceiling), the router gracefully advances to `ViralityCriticNode` rather than aborting.
3. **Iteration Caps**: The reflection loop between `ViralityCriticNode` and `ThreadWriterNode` is capped at **3 iterations**. If the thread is not approved after 3 passes, the best draft is finalized and forwarded to `VisualKeywordStrategistNode`.
