---
name: anypost-tiktok-analyzer
description: Analyze TikTok videos for agents — AI summary, caption, creator, duration, and hashtags as clean Markdown via anypost.md. Requires Pro+ API key. Use for tiktok.com/@user/video/ URLs or when the user asks what a TikTok video is about. Does not include likes, views, or comments unless you opt in (see Optional extensions).
---

# AnyPost TikTok video analysis

Turn a **TikTok video URL** into structured Markdown for LLMs — without downloading the video file.

## When to use

- User shares `https://www.tiktok.com/@handle/video/1234567890`
- Agent needs **what the video is about**: summary, content signals, caption, creator, duration, hashtags
- Quick context for research, monitoring, or reply drafting

Do **not** use for caption-only convert — use the main AnyPost skill (`/i/skill.md`) and `/api/convert` instead.

## Try free samples (no API key)

Humans can preview the Markdown shape on **five curated videos** (no signup, browser-only):

`https://anypost.md/free-tools/tiktok-video-analyzer`

Agents still need `apk_…` for live URLs.

## Requirements

- **Full URL** with `@user/video/ID` (short `vm.tiktok.com` links are unreliable)
- **Pro+ plan** API key (`apk_…`) — no anonymous free tier
- **5 credits** per successful analysis

## API (default — no likes, views, or comments)

```http
GET https://anypost.md/api/analyze/video?url=<encoded_tiktok_url>
Authorization: Bearer apk_YOUR_KEY
```

Response JSON includes `markdown`, `summary`, `whatHappens`, `contentSignals`, and `metadata` (creator, duration, hashtags, plus oEmbed fields when public: `thumbnailUrl`, `authorUrl`, `musicTitle`, `musicUrl`, `mediaType`).

## Example

```bash
curl -sS \
  -H "Authorization: Bearer apk_YOUR_KEY" \
  "https://anypost.md/api/analyze/video?url=https%3A%2F%2Fwww.tiktok.com%2F%40absoluteronaldow%2Fvideo%2F7622230004394462486"
```

## What you get (default)

| Included | Notes |
| --- | --- |
| AI summary + “what happens” bullets | From caption/metadata only — no invented dialogue |
| Content signals | Format, topics, tone, audience, CTA |
| Caption | On-screen / post text |
| Creator + duration + hashtags | oEmbed + page markdown when public |
| Thumbnail, author profile, sound, media type | From oEmbed (`thumbnailUrl`, `authorUrl`, `musicTitle`, `musicUrl`, `mediaType` in JSON metadata) |

| Not included by default | Notes |
| --- | --- |
| Views, likes, shares, comment counts | Only if TikTok exposes them in the page fetch (often missing on guest fetch) |
| Comment thread | Use optional `comments=` below |

## Data limits (v1)

Analysis is **page-only**. **Spoken transcript / subtitles are not included** — the summary must not invent dialogue.

## Optional extensions

These exist when you need engagement, a custom question, or audience replies. They are **not** part of the default agent skill flow.

### Custom question (`prompt` or `ask`)

Humans and agents can pass free text — what they want to know about the clip. Answered from **caption and metadata only** (no spoken transcript).

```http
GET https://anypost.md/api/analyze/video?url=<encoded_url>&prompt=Is+this+a+product+review%3F
Authorization: Bearer apk_YOUR_KEY
```

Alias: `ask=` (same meaning). Max **500** characters. Markdown adds `## Your question` before the summary; JSON includes `userPrompt` and `promptAnswer` when set.

```bash
curl -sS \
  -H "Authorization: Bearer apk_YOUR_KEY" \
  "https://anypost.md/api/analyze/video?url=https%3A%2F%2Fwww.tiktok.com%2F%40absoluteronaldow%2Fvideo%2F7622230004394462486&ask=Who+is+the+target+audience%3F"
```

### Latest comments on the same analyze endpoint

Ask AnyPost to parse up to **30** visible comments from the post page (when TikTok shows them in markdown):

```http
GET https://anypost.md/api/analyze/video?url=<encoded_url>&comments=30
Authorization: Bearer apk_YOUR_KEY
```

```bash
curl -sS \
  -H "Authorization: Bearer apk_YOUR_KEY" \
  "https://anypost.md/api/analyze/video?url=https%3A%2F%2Fwww.tiktok.com%2F%40absoluteronaldow%2Fvideo%2F7622230004394462486&comments=30"
```

| Param | Default | Values |
| --- | --- | --- |
| `comments` | `0` (off) | `1`–`30`, or `on` / `true` for max (30) |

Same **5 credits** per analysis. Many public URLs return **zero** comments because TikTok hides them behind login.

### Views / likes / full post convert

For a **Markdown post export** (caption + metadata + optional comment thread in convert layout), use the convert API instead:

```http
GET https://anypost.md/api/convert?url=<encoded_tiktok_url>&comments=10
Authorization: Bearer apk_YOUR_KEY
```

Requires Pro+ and charges convert credits (1 post + per-comment rules). Engagement stats appear in metadata **only when** the fetch layer returns them.

## Related

- **Free samples (5 videos):** `https://anypost.md/free-tools/tiktok-video-analyzer`
- **Install this skill:** `https://anypost.md/i/tiktok-analyzer/skill.md`
- Caption-only convert: `https://anypost.md/convert/tiktok`
- General social → Markdown skill: `https://anypost.md/i/skill.md`
