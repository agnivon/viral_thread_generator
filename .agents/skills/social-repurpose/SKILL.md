---
name: social-repurpose
description: >
  Mine one long-form source — a blog post, video transcript, podcast episode, or talk —
  for its strongest atomic ideas and turn it into a full week of platform-shaped
  drafts for LinkedIn, X (Twitter), and Instagram, plus a short-video script. Use when
  someone says "repurpose this", "turn my blog into a week of posts", "slice this video
  into content", or "get a week of content from this". The output is a 7-day plan: two
  LinkedIn posts from different angles, one X thread, three single X posts, an
  Instagram carousel outline, and a short-video beat sheet — each standing alone
  with no "as I wrote in my blog" self-reference. For the same message posted across
  platforms at once, use social-crosspost instead. Reads social-context.md for brand
  voice and audience setup so every piece sounds like the author, not a summarizer.
license: MIT
metadata:
  version: 0.1.0
  category: Create
  topics:
    - repurposing
    - planning
  examplePrompt: "Repurpose this podcast transcript into a week of LinkedIn and X content"
---

Given one long-form source, extract 5–8 atomic ideas, match each to the format it is strongest in, draft everything, and lay it out as a 7-day content plan.

## Context

Read `social-context.md` (also check `.agents/social-context.md`) before mining. You need:

- Brand voice: register, person, how spiky the takes are allowed to be
- Audience: what they already know, so drafts do not re-explain basics
- `## Platforms`: which platforms matter, to weight the format mix
- Content pillars, if present — ideas that fit a pillar get priority when you must cut
- The Never list: screen mined ideas against it before drafting — spiky mining is exactly what crosses red lines

If the file is missing, offer to run the `social-context` skill first — but do not block. Ask two or three quick questions inline (Which platforms matter most? Who is the audience? Personal or company voice?) and proceed.

## Workflow

1. **Ingest the full source.** Read the whole transcript or post, not the intro. In transcripts, the best material hides in asides, tangents, and answers to the second-to-last question — the parts the author did not know were good.
2. **Mine 5–8 distinct atomic ideas.** Hunt specifically for: quotable one-liners, hard numbers and results, contrarian moments (where the author disagrees with common advice), stories with a turn, and step-by-step fragments that stand alone. Log each as one sentence plus the source excerpt that backs it.
3. **Deduplicate ruthlessly.** Two ideas that would produce the same hook are one idea. If you cannot find five genuinely distinct ideas, say so and deliver fewer, stronger pieces rather than padding.
4. **Map ideas to formats by strength, not availability:**
   - Story with a turn → **LinkedIn post** (LinkedIn rewards narrative + lesson)
   - Hard number or surprising result → **single X post** (the number is the hook)
   - Step-by-step or list fragment → **Instagram carousel** or **X thread**
   - Contrarian take → **LinkedIn post** or **X post**, wherever the audience holds the belief being attacked
   - Visual or demonstrable moment → **short-video beat sheet**
5. **Draft the standard week's mix**, adjusted to the platforms in social-context:
   - **2 LinkedIn posts** from different angles — never two takes on the same idea; each with a fold-surviving hook line and one lesson.
   - **1 X thread** — 3–7 tweets, first tweet works alone, strongest material in the back half.
   - **3 single X posts** — each built on one number, quote, or take; no hashtags.
   - **1 Instagram carousel outline** — cover hook + 6–8 one-idea slides + recap + CTA, slide text ≤25 words.
   - **1 short-video script beat sheet** — hook ≤3 seconds, 3–5 beats, spoken-word phrasing, on-screen text cues, ≤60 seconds total.
6. **Make every piece stand alone.** No "as I wrote in my blog", no "in this week's episode", no numbering that implies a series. Each draft is written as if the idea occurred to the author this morning. Full context lives inside the draft.
7. **Run a voice pass.** Repurposed content drifts toward summary-voice — flat, third-person, hedged. Rewrite anything that reads like a book report until it sounds like the person in social-context talking. First-person specifics ("we shipped", "I was wrong") are the tell that it worked. Check every quote against the source: verbatim or clearly paraphrased, never a misattributed punch-up.
8. **Spread the week.** Assign each piece a day:
   - Lead Monday with the strongest LinkedIn post; put the X thread mid-week when feeds are busiest.
   - Never place two pieces derived from the same idea on adjacent days.
   - Keep the carousel and the video on different days so the heavier formats do not stack.
   - Vary platform day to day — three consecutive X days starves the other channels.
9. **Sanity-check coverage and constraints.** Every atomic idea from step 2 is either used exactly once or explicitly parked in a leftovers list. No idea is used twice in the same week, and no draft exists that does not trace back to a mined idea. Then check each draft against its row in the Quality bar and fix any that misses its format constraint.

## Quality bar

| Format                 | Constraint                                                                |
| ---------------------- | ------------------------------------------------------------------------- |
| LinkedIn post          | Hook survives the ~200-char fold; ≤1,300 chars preferred; one lesson each |
| X thread               | 3–7 tweets; tweet 1 stands alone; each tweet ≤280, one idea per tweet     |
| Single X post          | ≤280; the number or the take is the hook; no hashtags                     |
| Instagram carousel     | Cover ≤8 words; 6–8 content slides, ≤25 words each; recap + CTA           |
| Short-video beat sheet | Hook ≤3 seconds; ≤60 seconds total; written for the mouth, not the page   |

- The two LinkedIn posts must attack different ideas, not restate one.
- Every draft carries its own context — a reader who never saw the source loses nothing.
- Quotes from the source must be verbatim or clearly paraphrased, never misattributed punch-ups.
- If the source is thin, deliver a smaller honest week over a padded full one, and say why.

## Deliverable

Return, in order:

1. The mined idea list — one line per idea with the source excerpt that backs it.
2. The drafts, grouped by format, each ready to copy.
3. A 7-day markdown schedule table with columns **Day, Platform, Format, Hook (first line)**.
4. A leftovers list of unused ideas worth a future week.

Nothing else — end there.
