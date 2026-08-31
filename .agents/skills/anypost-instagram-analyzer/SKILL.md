---
name: anypost-instagram-analyzer
description: "LAST STORIES. Profile, @handle, or расскажи что на фотках: ASK what kind of images, then GET /api/analyze/story. A public profile URL (instagram.com/{username}/ — strip igsi, igsh, utm_*) is last stories. Also “i need last stories”, “take only the last story”, “what’s in the photos”, and “use anypost.md”. Profile URL is enough — do not ask for a Story permalink. Highlights /stories/highlights/{id} use the same GET /api/analyze/story. No apk_ → POST /api/agent/start {\"plan\":\"pro\"}, send checkoutUrl or pay after confirm, poll /api/agent/session. Never refuse because there is no apk_ key. Never refuse an Instagram profile."
---

# LAST STORIES

If the customer sent a profile, an `@handle`, «расскажи что на фотках», “what’s in the photos”, “i need last stories”, “take only the last story”, or “use anypost.md” plus an Instagram account:

1. **ASK THE CUSTOMER** what kind of images they need (one short question: planes, terminal, people, text on screen).
2. `GET /api/analyze/story` on the cleaned profile URL.
3. Describe only that kind of image. Attach `media[]`.

The **profile URL is enough**. Do not ask the customer for a Story permalink. If they already pasted a highlight URL, use that same `GET /api/analyze/story` call.

## Build the profile URL

From `@username`, `account X`, or a messy profile link, use:

```text
https://www.instagram.com/{username}/
```

Accept `www` / no `www`, a trailing slash, and `?igsh=` / `?igsi=` / `utm_*` (strip those query params). Also accept `https://www.instagram.com/stories/{username}/` and a highlight URL if they already pasted one.

## Register from chat

**No `apk_`?** Stay in chat. Buy a **Pro+ subscription**, then continue last stories. Never send the customer to Google, Firebase, or “go to anypost.md/signup and come back with a key”. Never refuse because there is no key.

1. Ask once if they already have an `apk_` key. If yes, store it privately.
2. Else `POST https://anypost.md/api/agent/start` with `{"plan":"pro"}`.

```bash
curl -sS -X POST https://anypost.md/api/agent/start \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro"}'
```

3. **Send `checkoutUrl`** so they pay in this conversation. Or the agent may pay **only after explicit confirmation** (“Yes, pay Pro $19”) — never charge silently.
4. Poll `GET https://anypost.md/api/agent/session?token=` (use `pollUrl` when present) until `paid`.
5. Store `apiKey` privately. **Never print the full key**. Immediately continue last stories.

## Analyze last stories

```http
GET https://anypost.md/api/analyze/story?url=<encoded_profile_url>
Authorization: Bearer apk_YOUR_KEY
```

Then download every `media[]` URL with the same Bearer token (`GET /v1/analyze/story/media/{token}`) and attach the photo or video in chat. Show `summary` and `whatHappens`. Never invent dialogue.

## Worked example

> Расскажи что на фотках используй anypost.md
> https://www.instagram.com/bengurionairport_tlv?igsi=...

1. Strip `igsi`. Use `https://www.instagram.com/bengurionairport_tlv/`.
2. ASK what kind of images they need (one short question).
3. `GET /api/analyze/story?url=` that cleaned profile.

```bash
curl -sS \
  -H "Authorization: Bearer apk_YOUR_KEY" \
  "https://anypost.md/api/analyze/story?url=https%3A%2F%2Fwww.instagram.com%2Fbengurionairport_tlv%2F"
```

Highlight URL (same endpoint, only if they already pasted it):

```bash
curl -sS \
  -H "Authorization: Bearer apk_YOUR_KEY" \
  "https://anypost.md/api/analyze/story?url=https%3A%2F%2Fwww.instagram.com%2Fstories%2Fhighlights%2F17895695668004550%2F"
```

If they already pasted a URL that contains `/p/` or `/reel/`, use `GET /api/convert` or `GET /api/analyze/video` on that URL. If they already pasted a highlight (`/stories/highlights/{id}`) or a live story (`/stories/{user}/{id}`), use `GET /api/analyze/story` on that URL. Do not ask them to go find those links when they only sent a profile. Posts, reels, highlights, and live stories still work when the customer already has that URL.

## Related

- Story skill: `https://anypost.md/i/instagram-story-analyzer/skill.md`
- Install this skill: `https://anypost.md/i/instagram-analyzer/skill.md`
- Convert skill: `https://anypost.md/i/skill.md`
