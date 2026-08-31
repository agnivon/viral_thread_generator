---
name: social-crosspost
description: >
  Turn one story, blog post, announcement, or idea into native-feeling drafts for
  multiple platforms at once — LinkedIn, X (Twitter), Instagram, Facebook, Threads,
  Bluesky, and Mastodon — adapting tone, length, structure, hashtags, and format per
  platform instead of copy-pasting one caption everywhere. Use when someone says
  "cross-post", "post this everywhere", "post this on LinkedIn, X, and Instagram", or
  "adapt this for LinkedIn and X". Each draft comes with a one-line note explaining
  what changed for that platform and why. For turning one long source into a week of
  different posts, use social-repurpose instead. Reads social-context.md for brand voice,
  audience, and default platform setup so every draft sounds like the same person
  speaking each platform's dialect.
license: MIT
metadata:
  version: 0.1.0
  category: Create
  topics:
    - cross-posting
    - linkedin
    - x
    - instagram
    - facebook
  examplePrompt: "Turn https://blog.example.com/launch into posts for LinkedIn and X"
---

Given one source — a URL, pasted text, or a raw idea — produce a native draft per platform, each shaped for how that platform actually reads, with a one-line rationale per draft.

## Context

Read `social-context.md` (also check `.agents/social-context.md`) before drafting. You need:

- Brand voice: register, person ("I" vs "we"), emoji policy, banned phrases
- Audience per platform, if specified — the LinkedIn reader and the Bluesky reader are rarely the same person
- `## Platforms`: the default platform list when the user does not name targets
- The Never list: red lines to keep out of every draft, since one message goes to many public feeds

If the file is missing, offer to run the `social-context` skill first — but do not block. Ask two or three quick questions inline (Which platforms? Personal voice or company voice? Anything off-limits?) and proceed.

## Workflow

1. **Ingest the source.** Fetch the URL or read the pasted text in full — the best social material is often a buried aside, not the headline. If it is only an idea, ask one clarifying question at most, then work with what you have.
2. **Extract the ONE core claim plus 2–3 supporting points.** Write these down and show them before drafting. Every platform draft argues the same claim; what varies is how. If you cannot state the claim in one sentence, the source is not ready — say so and propose the sharpest available angle. Also harvest the receipts: any number, quote, or before/after in the source, because those survive adaptation better than prose.
3. **Confirm target platforms.** Use the user's list if given; otherwise default to `## Platforms` from social-context; otherwise ask. Do not silently produce all seven — an unwanted Mastodon draft is noise, not thoroughness.
4. **Draft each platform natively, from the claim — not from another draft.** These are siblings, not truncations of each other. Load [references/platform-rules.md](references/platform-rules.md) and draft each target to its length, structure, hashtag, and link rules there. Keep the receipts (numbers, quotes, before/after) — they survive adaptation better than prose — and give every platform its own hook, since reusing one first line wastes the variable that matters most.
5. **Write the per-draft rationale.** One line under each draft: what you changed for this platform and why ("compressed to the stat because X rewards one sharp number", "led with the customer story because LinkedIn's fold buries anything slower"). The rationale teaches the user the platform, not just this post.
6. **Voice-check the set.** Read all drafts in a row and hold them to three tests:
   - Same person, different rooms — if any draft could not have been written by the voice in social-context, revise it.
   - No verbatim repeats — kill any phrase that appears word-for-word in three or more drafts; siblings, not clones.
   - Claim intact — every draft still argues the core claim from step 2; a draft that drifted into a different point gets rewritten, not kept.
7. **Check every draft against its platform rules.** Using [references/platform-rules.md](references/platform-rules.md), verify each draft on every axis — length, structure, hashtags, links — and fix violations: count characters on X, Threads, Bluesky, and Mastodon and trim to fit by cutting the weakest middle clause, never by amputating the ending. Screen every draft against the Never list too.
8. **Flag gaps honestly.** If a platform is a poor fit for this story (a B2B pricing memo on Instagram), include the draft but say so in its rationale rather than forcing false enthusiasm — the user may still want it, but they should not be surprised when it underperforms.

## Quality bar

Per-platform limits and drafting notes live in [references/platform-rules.md](references/platform-rules.md) — check every draft against its platform's row there, not against memory. Across the whole set:

- Every draft must contain the core claim; no draft may contradict another.
- Numbers and concrete nouns survive adaptation; adjectives do not have to.
- Never pad a short-form draft to feel "complete" — Bluesky at 180 chars beats Bluesky at 300.
- Hooks differ per platform: reusing the same first line on LinkedIn and X wastes the one variable that matters most.
- Hashtags are platform culture, not decoration: Instagram expects them, X and Threads punish them, Mastodon wants them CamelCase.
- Emoji follow the social-context policy; when in doubt, LinkedIn and Mastodon get fewer, Instagram and Threads tolerate more.
- Thread decisions are structural: only thread on X when there are 3+ distinct beats — a two-tweet thread is a long tweet that lost its nerve.
- No draft may trip the Never list.

## Deliverable

Return, in order:

1. A two-line summary: the core claim in one sentence, and the platforms covered.
2. One section per platform: a heading, the ready-to-copy draft in a fenced block, and the one-line rationale beneath it.
3. Character counts on every draft with a hard cap (X, Threads, Bluesky, Mastodon), shown as `(214/280)`.

Nothing else — end there.
