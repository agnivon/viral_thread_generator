# The Virality Engine: Critique, Validation & Reflection

Social media algorithms prioritize engagement signals: high retention, fast scroll-stopping opening hooks, and conversational tension. **Viral Thread Generator** implements an automated **Virality Engine** that audits, critiques, and refines every thread before it reaches the creator.

---

## 🔍 1. Automated Self-Correction Loop

```
       ┌───────────────────────────────┐
       │       ThreadWriterNode        │
       │    (Drafts multi-post thread) │
       └───────────────┬───────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │     CharacterValidatorTool    │ ── (Format / Length Defects) ──┐
       │   (Algorithmic Rule Check)    │                                │
       └───────────────┬───────────────┘                                │
                       │ (Valid)                                        │
                       ▼                                                │
       ┌───────────────────────────────┐                                │
       │       ViralityCriticNode      │                                │
       │   (Zero-Shot Editorial Audit) │                                │
       └───────────────┬───────────────┘                                │
                       │                                                │
         [Score < 85 & iterations < 3]                                  │
                       │                                                │
                       ▼                                                │
       ┌───────────────────────────────┐                                │
       │ Pass Granular Fix Directives  │ ◄──────────────────────────────┘
       │  (Targeted Rewriting Cycle)   │
       └───────────────┬───────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │    Re-execute ThreadWriter    │
       └───────────────────────────────┘
```

---

## 🎯 2. The Virality Critic (`ViralityCriticNode`)

The critic operates at **temperature `0.0`** using high-reasoning models (DeepSeek Flash with reasoning enabled or Google Gemini 3.8 / 3.6 Flash) to ensure a cold, objective appraisal.

### Evaluation Dimensions:
1. **Hook Strength (0–30 pts)**: Does the opening line create an unavoidable curiosity gap without feeling like cheap clickbait?
2. **Cognitive Momentum (0–30 pts)**: Does each post deliver one clear idea that naturally propels the reader to the next post?
3. **Pacing & Relief Valves (0–20 pts)**: Are long explanatory posts balanced by short, punchy rhythm-breakers?
4. **Resolution & CTA (0–20 pts)**: Does the final post provide satisfying closure and a natural conversational prompt?

### Granular Post-Level Feedback:
Rather than returning a vague summary, the critic outputs structured JSON containing post-by-post assessments:
```json
{
  "virality_score": 78,
  "is_approved": false,
  "critique": "Hook lacks immediate stakes. Body post 3 is too academic.",
  "post_critiques": [
    {
      "post_index": 0,
      "critique": "The hook asks a rhetorical question instead of stating an unexpected fact.",
      "fix_directive": "Reframe around the 40% reduction metric."
    },
    {
      "post_index": 2,
      "critique": "Paragraph is 4 lines of dense text with no whitespace.",
      "fix_directive": "Split into two punchy 1-sentence lines."
    }
  ]
}
```

---

## 🎯 3. Closed-World Differential Critic (Iteration $\ge 2$)

A persistent vulnerability in iterative LLM pipelines is **moving goalposts**: on iteration 2, an open-ended critic evaluates the newly revised thread from scratch and invents completely new, subjective complaints about previously passing posts. This leads to infinite oscillation and creative degradation.

**Viral Thread Generator** solves this with the **Closed-World Differential Critic**:

```
Iteration 1: [Open-Ended Virality Critic]
   │
   ▼
Produces Issue Punchlist: [Post 0: needs_fix, Post 2: needs_fix]
   │
   ▼
Iteration 2+: [Closed-World Differential Critic]
   │
   ├─► 1. Verify Prior Defects: Are Post 0 and Post 2 resolved?
   ├─► 2. Objective Violations Only: Did the rewrite breach char limits or banned phrases?
   └─► 3. Forbid New Subjective Complaints on Pinned Passing Posts.
```

### The Differential Contract (`differentialCriticSchema`):
```typescript
export const differentialCriticSchema = z.object({
  previous_issues_resolution: z.array(
    z.object({
      post_index: z.number(),
      status: z.enum(["resolved", "unresolved"]),
      notes: z.string(),
    })
  ),
  new_platform_violations: z.array(
    z.object({
      post_index: z.number(),
      violation_type: z.enum(["char_limit", "banned_phrase", "formatting", "syntax"]),
      fix_directive: z.string(),
    })
  ),
  virality_score: z.number().min(0).max(100),
  is_approved: z.boolean(),
  critique: z.string(),
});
```

---

## ✂️ 4. Surgical Post Pinning in `ThreadWriterNode`

When defects are detected, asking an LLM to rewrite the entire thread from scratch frequently damages the posts that were already excellent.

Instead, the **Surgical Thread Writer** uses post pinning:
1. **Pinned Posts**: Passing posts from iteration 1 are tagged `[PINNED - DO NOT MODIFY]`.
2. **Flagged Posts**: Only posts tagged `needs_fix` or `re_flagged` receive rewrite directives.
3. **Draft Reconciliation**: `reconcileSurgicalDraft` merges rewritten posts back into their exact sequential positions while preserving tone, pacing, and continuity.

---

## 📈 5. Monotonic Virality Scoring & Pareto Frontier Checkpointing

To guarantee steady progress toward publication:
- **`calculateMonotonicScore`**: Computes virality scores that are mathematically bounded. If a writer resolves the defects on Post 0 and Post 2, the virality score is guaranteed not to fall below the previous iteration's baseline.
- **Pareto Frontier Checkpointing**: Throughout graph execution, `handleGraphCompletion` records `best_thread_draft`, `best_virality_score`, and the complete `audit_history`. If an iteration causes an unexpected regression, the Pareto-optimal candidate is automatically restored as the final deliverable.

---

## 📏 6. Deterministic Platform Rules (`CharacterValidatorTool`)

Located in `convex/lib/agents/tools.ts`:

1. **Threads 500-Character Hard Ceiling**: Posts exceeding 500 characters fail immediately.
2. **Relief Valve Pacing**: Only up to **3 posts** in the thread are permitted to exceed 200 characters. The rest must be short, fast reads.
3. **Line Break Guardrails**: Maximum of **4 line breaks** per post to prevent vertical screen hogging.
4. **9-Post Maximum Thread Limit**: Threads longer than 9 posts suffer severe drop-off on Threads and are automatically condensed.
5. **Banned Engagement Bait Phrases**: Programmatically detects and rejects clichés:
   - *"a thread 🧵"*
   - *"let's dive in"*
   - *"here is why"*
   - *"in today's fast-paced world"*
   - *"save this tweet"*
   - *"look no further"*
6. **Hyperlink Restriction**: Links are banned from the hook and body posts. External URLs are only allowed in the final CTA post to protect algorithmic distribution.
7. **Anti-AI Formatting & Em Dash Prohibition**: Complete ban on em dashes (`—`) and generic artificial transitions (*"Furthermore"*, *"In conclusion"*), enforcing natural human momentum and authentic sentence breaks.

---

## 🖼️ 7. Visual Keyword Strategist (`VisualKeywordStrategistNode`)

The final node generates contextual image and video search prompts tailored for stock footage, Unsplash, or AI image generators:
- **Hero Visual Query**: Conceptual visual for the opening post (e.g., *"dramatic cinematic split view of classical library vs modern server room"*).
- **Post-Level Visual Queries**: Targeted prompts for each post highlighting key statistics or quotes.
