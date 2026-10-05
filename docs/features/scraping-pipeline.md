# Web Scraping & Research Pipeline

High-quality viral threads depend on accurate, deep context. The scraping and research infrastructure in **Viral Thread Generator** utilizes a multi-layered tool stack designed to extract clean markdown, parse video transcripts, and verify claims across the live web.

---

## 🛠️ Research Tool Architecture

```
                               ┌────────────────────────────────┐
                               │       Incoming URL / Query     │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                         ┌─────────────────────────────────────────────┐
                         │              URL Classifier                 │
                         └───────┬──────────────┬──────────────┬───────┘
                                 │              │              │
                   YouTube Link  │   News / Web │  Topic Query │
            ┌────────────────────┘              │              └────────────────┐
            ▼                                   ▼                               ▼
┌─────────────────────────┐         ┌─────────────────────────┐     ┌─────────────────────────┐
│  YoutubeScraperTool     │         │   WebScraperTool        │     │  TavilySearchTool       │
│  (Subtitle Extraction)  │         │   (Firecrawl API)       │     │  (Advanced Deep Search) │
└───────────┬─────────────┘         └───────────┬─────────────┘     └───────────┬─────────────┘
            │                                   │ Fallback                      │
            │                                   ▼                               ▼
            │                       ┌─────────────────────────┐     ┌─────────────────────────┐
            │                       │   JinaReaderTool        │     │  DuckDuckGoSearchTool   │
            │                       │   (Markdown Extraction) │     │  (Zero-Rate-Limit Hits) │
            │                       └───────────┬─────────────┘     └───────────┬─────────────┘
            │                                   │                               │
            ▼                                   ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            ContentAuthenticityCheckerTool                                   │
│                            (Tavily Cross-Reference & Claims)                               │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📄 1. Web Extraction: Firecrawl & Jina Reader

Located in `convex/lib/agents/news/tools.ts` and `convex/lib/agents/topic/tools.ts`:

### Firecrawl Primary Scraper
- Evaluates dynamic JavaScript, bypasses bot shields, and extracts the primary article text without advertising banners or boilerplate navigation.
- Extracts high-resolution inline images associated with the article for use in thread cards.

### Jina Reader Fallback
- If Firecrawl fails due to timeout or upstream rate limits, `WebScraperTool` seamlessly falls back to **Jina AI Reader** (`https://r.jina.ai/`):
```typescript
try {
  const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
  const scrapeResult = await app.scrape(url, { onlyMainContent: true, formats: ["markdown", "images"] });
  return JSON.stringify({ markdown: scrapeResult.markdown, images: scrapeResult.images || [] });
} catch (_e) {
  console.warn(`[WebScraperTool] Firecrawl failed for ${url}, falling back to Jina Reader...`);
  const jina = new JinaClient();
  const jinaResult = await jina.read(url, { respondWith: 'markdown' });
  // Process and return clean Jina markdown...
}
```

---

## 📺 2. YouTube Transcript Engine

Located in `convex/lib/agents/news/tools.ts`:

- When a creator provides a YouTube video URL (e.g. `https://youtube.com/watch?v=...` or `https://youtu.be/...`), `YoutubeScraperTool` invokes `youtube-transcript-plus`.
- Fetches all spoken subtitles, strips timing metadata, and concatenates the transcript into structured textual markdown.
- Allows 30-to-60-minute longform podcasts, keynotes, and interviews to be synthesized into punchy, high-retention social threads.

---

## 🔍 3. Live Claim Verification & Authenticity Checking

Located in `convex/lib/agents/news/tools.ts`:

The **`ContentAuthenticityCheckerTool`** runs factual claims made in drafts against real-time news sources using Tavily AI Search:

- **Search Depth**: `"advanced"` with synthesized AI answers.
- **Verification Directives**: Confirms numerical claims, dates, corporate announcements, and regulatory quotes.
- Flags unverified assertions to the `ViralityCriticNode` before thread drafts are approved.

---

## 🛡️ 4. SSRF & Security Guardrails

When fetching URL metadata or link preview images, the backend enforces strict **Server-Side Request Forgery (SSRF)** prevention:

- Validates protocol strictly (`http:` and `https:`).
- Parses hostnames and rejects private, loopback, and link-local IP addresses:
  - `127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`
  - `169.254.169.254` (cloud metadata endpoints)
  - `localhost`, `.internal`, `.local`
