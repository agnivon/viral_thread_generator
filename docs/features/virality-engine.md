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

The critic operates at **temperature `0.0`** using high-reasoning models (DeepSeek Flash with reasoning enabled or Google Gemini 3.7 Flash) to ensure a cold, objective appraisal.

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

## 📏 3. Deterministic Platform Rules (`CharacterValidatorTool`)

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

---

## 🖼️ 4. Visual Keyword Strategist (`VisualKeywordStrategistNode`)

The final node generates contextual image and video search prompts tailored for stock footage, Unsplash, or AI image generators:
- **Hero Visual Query**: Conceptual visual for the opening post (e.g., *"dramatic cinematic split view of classical library vs modern server room"*).
- **Post-Level Visual Queries**: Targeted prompts for each post highlighting key statistics or quotes.
