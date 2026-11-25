import { describe, test, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  scrape: vi.fn(),
  jinaRead: vi.fn(),
  ddgSearch: vi.fn(),
  tavilySearch: vi.fn(),
}));

vi.mock("@mendable/firecrawl-js", () => ({
  default: class MockFirecrawlApp {
    scrape = mocks.scrape;
  },
}));

vi.mock("../../lib/clients/jina.js", () => ({
  JinaClient: class MockJinaClient {
    read = mocks.jinaRead;
  },
}));

vi.mock("duck-duck-scrape", () => ({
  SafeSearchType: { MODERATE: 0 },
  search: mocks.ddgSearch,
}));

vi.mock("@tavily/core", () => ({
  tavily: vi.fn(() => ({
    search: mocks.tavilySearch,
  })),
}));

import {
  extractJinaContent,
  extractMarkdownImages,
  formatScraperUserPrompt,
  isBlockedOrThinScrape,
  parseScraperToolResult,
  sanitizeScrapedMarkdown,
} from "../../lib/agents/scrapeUtils.js";
import { WebScraperTool } from "../../lib/agents/news/tools.js";
import { DuckDuckGoSearchTool, JinaReaderTool } from "../../lib/agents/topic/tools.js";

describe("scrapeUtils pure helpers", () => {
  test("extractMarkdownImages collects trimmed URLs", () => {
    const imgs = extractMarkdownImages("Look: ![Chart]( https://img.example/a.png ) and ![](https://img.example/b.jpg)");
    expect(imgs).toEqual(["https://img.example/a.png", "https://img.example/b.jpg"]);
  });

  test("extractJinaContent normalizes string and nested data objects", () => {
    expect(extractJinaContent("  # Raw text  ")).toEqual({ markdown: "# Raw text", title: "" });
    expect(extractJinaContent({ data: "  Nested string  " })).toEqual({ markdown: "Nested string", title: "" });
    expect(extractJinaContent({ data: { content: "Article body", title: "Real Headline" } })).toEqual({
      markdown: "Article body",
      title: "Real Headline",
    });
    expect(extractJinaContent({ data: { text: "Fallback text", title: "Doc Title" } })).toEqual({
      markdown: "Fallback text",
      title: "Doc Title",
    });
  });

  test("isBlockedOrThinScrape flags JS challenges, Access Denied titles, and thin payloads", () => {
    expect(isBlockedOrThinScrape("", "", "https://example.com/a")).toBe(true);
    expect(isBlockedOrThinScrape("Just a moment... Enable JavaScript to continue.", "", "https://example.com/a")).toBe(true);
    expect(
      isBlockedOrThinScrape(
        "Short placeholder body that fails threshold because length is tiny",
        "Access Denied",
        "https://example.com/news/story"
      )
    ).toBe(true);

    const validLongArticle = "Microsoft announced a strategic reorganization around core AI safety infrastructure. ".repeat(5);
    expect(isBlockedOrThinScrape(validLongArticle, "Microsoft reorganizes AI unit", "https://example.com/news/msft")).toBe(false);
  });

  test("sanitizeScrapedMarkdown removes portal sidebars while keeping primary article body", () => {
    const dirty = [
      "Return to Homepage",
      "",
      "[Skip to main content](https://portal.example/#main)",
      "",
      "# Microsoft Declares Code Red on Copilot Quality",
      "",
      "Internal leadership reshuffled engineering priorities to accelerate enterprise adoption across core Office apps.",
      "",
      "## Top Stories",
      "- [Nvidia launches new workstation GPU](https://portal.example/nvidia)",
      "- [AMD updates Ryzen chipset drivers](https://portal.example/amd)",
      "- [Sony reveals controller patent](https://portal.example/sony)",
      "",
      "[Video 1]: Watch unrelated highlight reel",
      "",
      "## Financial Impact",
      "Enterprise seats expanded 28% year over year following security audit milestones.",
    ].join("\n");

    const clean = sanitizeScrapedMarkdown(dirty);
    expect(clean).toContain("# Microsoft Declares Code Red on Copilot Quality");
    expect(clean).toContain("## Financial Impact");
    expect(clean).toContain("Enterprise seats expanded 28%");
    expect(clean).not.toContain("Return to Homepage");
    expect(clean).not.toContain("Nvidia launches new workstation GPU");
    expect(clean).not.toContain("Watch unrelated highlight reel");
  });

  test("parseScraperToolResult & formatScraperUserPrompt anchor metadata cleanly", () => {
    const payload = parseScraperToolResult(
      JSON.stringify({
        markdown: "Main story body",
        images: ["https://cdn.example/hero.png"],
        title: "OpenAI Releases Benchmark Update",
        description: "Official breakdown of coding evaluations.",
      })
    );
    expect(payload).toEqual({
      markdown: "Main story body",
      images: ["https://cdn.example/hero.png"],
      title: "OpenAI Releases Benchmark Update",
      description: "Official breakdown of coding evaluations.",
    });

    const formatted = formatScraperUserPrompt({
      url: "https://example.com/story",
      title: payload.title,
      description: payload.description,
      markdown: payload.markdown,
    });
    expect(formatted).toContain("<TARGET_URL>\nhttps://example.com/story\n</TARGET_URL>");
    expect(formatted).toContain("<ARTICLE_TITLE>\nOpenAI Releases Benchmark Update\n</ARTICLE_TITLE>");
    expect(formatted).toContain("<SCRAPED_MARKDOWN>\nMain story body\n</SCRAPED_MARKDOWN>");

    expect(parseScraperToolResult("plain raw markdown")).toEqual({
      markdown: "plain raw markdown",
      images: [],
      title: "",
      description: "",
    });
  });
});

describe("Scraper & Search Fallbacks (Section 4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("WebScraperTool falls back to Jina Reader when Firecrawl returns a soft-block challenge", async () => {
    mocks.scrape.mockResolvedValueOnce({
      markdown: "Just a moment... Checking your browser before accessing example.com. Enable JavaScript and cookies to continue.",
      metadata: { title: "Just a moment..." },
      images: [],
    });

    const cleanArticle =
      "# Real Investigative Report\n\n" +
      "Detailed engineering metrics show sustained throughput rose 42% after scheduler redesign across production clusters. ".repeat(3) +
      "\n![Architecture](https://cdn.example/arch.png)\n\n## Top Stories\n- [Unrelated headline](https://portal.example/other)";

    mocks.jinaRead.mockResolvedValueOnce({
      data: {
        title: "Real Investigative Report",
        content: cleanArticle,
      },
    });

    const raw = await WebScraperTool.invoke({ url: "https://portal.example/real-report" });
    const parsed = JSON.parse(raw) as { markdown: string; title?: string; images: string[] };

    expect(mocks.jinaRead).toHaveBeenCalledTimes(1);
    expect(parsed.title).toBe("Real Investigative Report");
    expect(parsed.markdown).toContain("sustained throughput rose 42%");
    expect(parsed.markdown).not.toContain("Unrelated headline");
    expect(parsed.images).toEqual(["https://cdn.example/arch.png"]);
  });

  test("WebScraperTool preserves metadata and skips Jina when Firecrawl returns healthy article", async () => {
    const healthyMarkdown =
      "# Primary Cloud Postmortem\n\n" +
      "Control plane failover completed in 43 seconds while preserving all committed transactions across regional shards. ".repeat(3) +
      "\n\n## Trending Now\n- [Distraction Story](https://portal.example/distraction)";

    mocks.scrape.mockResolvedValueOnce({
      markdown: healthyMarkdown,
      metadata: {
        ogTitle: "Primary Cloud Postmortem",
        ogDescription: "Official engineering review",
      },
      images: ["https://cdn.example/diagram.png"],
    });

    const raw = await WebScraperTool.invoke({ url: "https://portal.example/postmortem" });
    const parsed = JSON.parse(raw) as { markdown: string; title?: string; description?: string; images: string[] };

    expect(mocks.jinaRead).not.toHaveBeenCalled();
    expect(parsed.title).toBe("Primary Cloud Postmortem");
    expect(parsed.description).toBe("Official engineering review");
    expect(parsed.markdown).toContain("Control plane failover completed");
    expect(parsed.markdown).not.toContain("Distraction Story");
  });

  test("DuckDuckGoSearchTool falls back to Tavily basic search on anomaly error", async () => {
    mocks.ddgSearch.mockRejectedValueOnce(new Error("DDG Anomaly detected; blocked"));
    mocks.tavilySearch.mockResolvedValueOnce({
      results: [
        {
          title: "Fallback Result Title",
          url: "https://example.com/fallback",
          content: "Verified factual snippet from Tavily basic search.",
        },
      ],
    });

    const raw = await DuckDuckGoSearchTool.invoke({ query: "AI chip export controls" });
    const parsed = JSON.parse(raw) as Array<{ title: string; url: string; description: string }>;

    expect(mocks.tavilySearch).toHaveBeenCalledWith("AI chip export controls", {
      searchDepth: "basic",
      maxResults: 5,
    });
    expect(parsed).toEqual([
      {
        title: "Fallback Result Title",
        url: "https://example.com/fallback",
        description: "Verified factual snippet from Tavily basic search.",
      },
    ]);
  });

  test("DuckDuckGoSearchTool falls back to Tavily basic search when DDG returns empty results", async () => {
    mocks.ddgSearch.mockResolvedValueOnce({ results: [] });
    mocks.tavilySearch.mockResolvedValueOnce({
      results: [{ title: "Recovered", url: "https://example.com/rec", content: "Details here" }],
    });

    const raw = await DuckDuckGoSearchTool.invoke({ query: "edge inference latency" });
    const parsed = JSON.parse(raw) as Array<{ title: string; url: string; description: string }>;
    expect(mocks.tavilySearch).toHaveBeenCalledTimes(1);
    expect(parsed[0].title).toBe("Recovered");
  });

  test("JinaReaderTool rejects blocked challenge responses instead of returning noise", async () => {
    mocks.jinaRead.mockResolvedValueOnce({
      data: {
        title: "Access Denied",
        content: "Access to this page has been denied. Verify you are human.",
      },
    });

    const raw = await JinaReaderTool.invoke({ url: "https://blocked.example/article" });
    const parsed = JSON.parse(raw) as { error?: string };
    expect(parsed.error).toContain("blocked or returned insufficient readable article content");
  });
});
