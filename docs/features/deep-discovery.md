# Deep Discovery Agent

The **Deep Discovery Agent** is an autonomous investigative intelligence subgraph embedded within **Viral Thread Generator**. While standard AI writing tools summarize press releases and parrot marketing claims, the Deep Discovery Agent conducts forensic open-web investigations to uncover hidden tensions, economic anomalies, physical constraints, and regulatory asymmetries behind any topic or breaking news story.

---

## 🏛️ Subgraph Topology & Architecture

The Deep Discovery Agent executes as a dedicated LangGraph subgraph (`DiscoveryAgentGraph` in `convex/lib/agents/discovery/graph.ts`):

```
                       [START]
                          │
                          ▼
             ┌─────────────────────────┐
             │ VectorHypothesizerNode  │
             │ (Forms 5 Forensic Lenses│
             │  & Search Queries)      │
             └────────────┬────────────┘
                          │
                          ▼
             ┌─────────────────────────┐ ◄─────────────────────────┐
             │  DialecticRetrievalNode │                           │
             │ (Open-Web Tavily + Jina │                           │
             │  Primary Sources)       │                           │
             └────────────┬────────────┘                           │
                          │                                        │
                          ▼                                        │
             ┌─────────────────────────┐                           │ Weak Tension
             │  TensionExtractionNode  │ ── (Contradiction < 4) ───┘ & Retries < 2
             │ (Identifies Acute PR vs │
             │  Reality Contradictions)│
             └────────────┬────────────┘
                          │ (Contradiction >= 4 or Max Passes)
                          ▼
             ┌─────────────────────────┐
             │   AngleFormulatorNode   │
             │ (Synthesizes Angles &   │
             │  Core Explanatory Delta)│
             └────────────┬────────────┘
                          │
                          ▼
                        [END]
```

### The 4 Specialized Subgraph Nodes:
1. **`VectorHypothesizerNode`**: Analyzes the topic, raw markdown, or seed claims and generates 3–5 targeted search vectors spanning the 5 forensic lenses, along with optimized search queries.
2. **`DialecticRetrievalNode`**: Executes open-web search queries concurrently across Tavily Search and Jina Reader without restrictive domain filters. Pulls primary documents: SEC 10-K/10-Q filings, court dockets, hardware teardown reports, and academic preprints.
3. **`TensionExtractionNode`**: Cross-examines the retrieved evidentiary documents against the surface PR narrative. Extracts acute contradictions, scores contradiction strength (`1–10`), and isolates specific proof sources.
   - **Cyclic Loop-Back**: If the maximum contradiction score is `< 4` and iteration limits have not been reached (`iterations < max_iterations`), the graph loops back to `DialecticRetrievalNode` to run deeper queries before formulating angles.
4. **`AngleFormulatorNode`**: Synthesizes the finalized `discovery_angles` and defines the `core_delta`—the singular contrarian insight that explains why conventional wisdom on this story is mistaken or incomplete.

---

## 🔬 The 5 Forensic Lenses

The Deep Discovery Agent evaluates every story through 5 distinct analytical frameworks defined in `convex/lib/agents/discovery/state.ts` and `prompts.ts`:

| Forensic Lens | Focus & Investigative Target | Typical Discovery Pattern |
| :--- | :--- | :--- |
| **BOM Paradox** | Bill-of-materials vs retail markup; raw compute costs vs pricing. | Hardware selling at 80% gross margins despite off-the-shelf components; cloud AI APIs priced below raw electricity/inference costs. |
| **Stagecraft** | PR theater, scripted keynote demos, and curated benchmarks vs operational reality. | Cherry-picked synthetic benchmarks masking severe real-world thermal throttling or latency degradation. |
| **Supply Chain Arbitrage** | Geographic, regulatory, or vendor margin capture across subcontractors. | Single-source dependency on obscure regional suppliers; tariff avoidance through intermediate transshipment hubs. |
| **Engineering Trade-offs** | Hidden architectural compromises, technical debt, and physical bottlenecks. | Claiming 10x throughput increases by sacrificing consistency guarantees or doubling memory overhead. |
| **Regulatory Asymmetry** | Compliance loopholes, jurisdictional arbitrage, and pending antitrust exposure. | Exploiting non-enforcement windows before looming EU AI Act or FTC enforcement deadlines. |

---

## 🔀 Provider-Aware Response Format Partitioning

Different AI providers handle structured JSON outputs differently:
- **Google Gemini**: Performs best using native tool binding (`toolStrategy` with `functionCalling`).
- **DeepSeek**: Operates natively with system prompt schemas and `providerStrategy(schema)` (`response_format: { type: "json_object" }`).

To prevent schema translation failures across fallback models, `convex/lib/agents/utils.ts` implements **Provider-Aware Response Format Partitioning** in `buildAgents`:

```typescript
export function buildAgents<T>(
  candidates: AgentCandidate[],
  config: {
    systemPrompt: string;
    responseFormat: ProviderResponseFormat;
  }
): AgentCandidate[]
```

When building agent instances, candidates are partitioned by provider family (`google` vs `deepseek` vs `openai`). Each model receives the optimal invocation strategy for its architecture, guaranteeing resilient structured extraction across mixed-provider fallbacks.

---

## 🌐 Pipeline Integration

The Deep Discovery Agent is integrated as an optional, high-signal pre-processing phase in all three generation graphs:

1. **News Pipeline (`NewsDiscoveryNode`)**: Runs immediately after `ScraperNode`, turning breaking news articles into investigative exposés before `HookStrategistNode` runs.
2. **Social Media Pipeline (`SocialDiscoveryNode`)**: Ingests video transcripts or social threads and fact-checks surface creator assertions against open-web teardowns.
3. **Topic Pipeline (`TopicDiscoveryNode`)**: Replaces standard topic search with forensic vector hypothesis testing, generating high-authority thematic deep dives from rough prompts.

### Output State Fields:
- **`discovery_agent`**: Boolean toggle indicating whether the forensic lens was activated.
- **`discovery_angles`**: Array of structured angles containing `vector`, `surface_narrative`, `forensic_reality`, `core_tension`, and `primary_proof_sources`.
- **`core_delta`**: The foundational analytical takeaway that anchors both the hook options and the narrative progression of the written thread.

---

## 💻 Creator Studio UI

In the Next.js frontend:
- **Toggle Card**: Accessible Base UI Switch component styled with the **Forensic Lens** category badge, distinct Lucide icon, and violet accent in both `CreateThreadForm` and `RegenerateDialog`.
- **Dossier Dialog (`ResearchDossierDialog.tsx`)**: Allows creators to inspect the retrieved proof sources, tension scores, and forensic reality bullets side-by-side with the generated thread draft.
