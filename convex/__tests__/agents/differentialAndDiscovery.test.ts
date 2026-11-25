import { describe, test, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeWithFallbacks: vi.fn(),
  tavilySearch: vi.fn(),
  jinaRead: vi.fn(),
}));

vi.mock("../../lib/agents/utils.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/agents/utils.js")>();
  return {
    ...actual,
    invokeWithFallbacks: mocks.invokeWithFallbacks,
  };
});

vi.mock("@tavily/core", () => ({
  tavily: vi.fn(() => ({
    search: mocks.tavilySearch,
  })),
}));

vi.mock("../../lib/clients/jina.js", () => ({
  JinaClient: class MockJinaClient {
    read = mocks.jinaRead;
  },
}));

import {
  calculateMonotonicScore,
  detectDeterministicDraftRegressions,
  processDifferentialEvaluation,
  reconcileSurgicalDraft,
} from "../../lib/agents/utils.js";
import * as newsNodes from "../../lib/agents/news/nodes.js";
import * as socialNodes from "../../lib/agents/social_media/nodes.js";
import * as topicNodes from "../../lib/agents/topic/nodes.js";
import * as clickbaitNodes from "../../lib/agents/clickbait/nodes.js";
import * as newsTools from "../../lib/agents/news/tools.js";
import { extractDiscoveryTopic, DialecticRetrievalNode } from "../../lib/agents/discovery/nodes.js";
import { executeDialecticRetrieval } from "../../lib/agents/discovery/retrieval.js";

describe("Section 3 - Differential Critic & Surgical Rewrite Safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("reconcileSurgicalDraft prevents positional shift when writer returns a subset array", () => {
    const previousDraft = [
      "Original Post 1 Hook",
      "Original Post 2 Flawed Body",
      "Original Post 3 Strong Proof",
      "Original Post 4 Closer",
    ];
    // Writer flagged ONLY Post 2, accidentally returned 1 unlabeled replacement post:
    const subsetCandidate = ["Fixed Post 2 Rewrite Without Label"];
    const reconciled = reconcileSurgicalDraft(previousDraft, subsetCandidate, [2]);

    // Post 1 MUST stay untouched; Post 2 gets the targeted rewrite; Post 3 & 4 preserved
    expect(reconciled).toEqual([
      "Original Post 1 Hook",
      "Fixed Post 2 Rewrite Without Label",
      "Original Post 3 Strong Proof",
      "Original Post 4 Closer",
    ]);
  });

  test("reconcileSurgicalDraft strips unintended Post N: labels but keeps pre-existing Post N: prefixes", () => {
    const previousDraft = [
      "Plain hook opening",
      "Post 2: Already prefixed body",
      "Plain closer text",
    ];
    const candidate = [
      "[Post 1]: Improved hook without label wanted",
      "Post 2: Updated body preserving intentional prefix",
      "Post 3: Improved closer without label wanted",
    ];

    const reconciled = reconcileSurgicalDraft(previousDraft, candidate, [1, 2, 3]);
    expect(reconciled).toEqual([
      "Improved hook without label wanted",
      "Post 2: Updated body preserving intentional prefix",
      "Improved closer without label wanted",
    ]);
  });

  test("detectDeterministicDraftRegressions catches exact duplicates, paraphrase duplicates, em-dashes, and Post N: leaks", () => {
    const draft = [
      "AI coding agents now write 40% of boilerplate pull requests across enterprise teams.",
      "AI coding agents now write 40% of boilerplate pull requests inside enterprise teams today.",
      "AI coding agents now write 40% of boilerplate pull requests across enterprise teams.",
      "Post 4: Broken label with an em dash — right here.",
    ];
    const prevDraft = ["H1", "B2", "B3", "Clean closer without label"];

    const regressions = detectDeterministicDraftRegressions(draft, prevDraft);
    const types = regressions.map((r) => `${r.post_index}:${r.violation_type}`);

    expect(types).toContain("2:duplicate_post");
    expect(types).toContain("3:duplicate_post");
    expect(types).toContain("4:formatting");
    expect(types).toContain("4:em_dash");
  });

  test("processDifferentialEvaluation enforces Option A cap (<85 stays unapproved) & edit-scoped vs thread-wide violations", () => {
    const evalLowScore = processDifferentialEvaluation({
      threadDraft: ["Hook fixed cleanly with specific metric.", "Distinct body copy explaining tradeoffs."],
      previousThreadDraft: ["Weak hook", "Distinct body copy explaining tradeoffs."],
      iterations: 1,
      previousScore: 76,
      bestViralityScore: 76,
      bestThreadDraft: ["Weak hook", "Distinct body copy explaining tradeoffs."],
      priorActionableCritiques: [{ post_index: 1, critique: "Weak hook", fix_directive: "Add metric" }],
      structuredResponse: {
        overall_critique: "Fixed Post 1 but overall pacing feels mediocre.",
        issue_evaluations: [
          { post_index: 1, prior_issue: "Weak hook", status: "resolved", reasoning: "Added 40% metric." },
        ],
        new_violations: [
          // Edit-scoped violation on UNEDITED Post 2 -> ignored!
          { post_index: 2, violation_type: "coherence_break", critique: "Transition is abrupt" },
          // Edit-scoped violation on EDITED Post 1 -> kept!
          { post_index: 1, violation_type: "ai_tell", critique: "Reads slightly robotic" },
        ],
        suggested_score: 82,
      },
    });

    expect(evalLowScore.is_approved).toBe(false);
    expect(evalLowScore.virality_score).toBeGreaterThanOrEqual(76);
    expect(evalLowScore.virality_score).toBeLessThan(85);
    expect(evalLowScore.post_critiques).toHaveLength(1);
    expect(evalLowScore.post_critiques[0].post_index).toBe(1);

    // Even with zero new violations and all prior resolved, suggested_score 82 does NOT snap to 88
    const evalCapBelow85 = processDifferentialEvaluation({
      threadDraft: ["Great unique hook sentence here.", "Completely distinct closing sentence."],
      previousThreadDraft: ["Weak hook", "Completely distinct closing sentence."],
      iterations: 1,
      previousScore: 76,
      priorActionableCritiques: [{ post_index: 1, critique: "Weak hook", fix_directive: "Add metric" }],
      structuredResponse: {
        overall_critique: "Decent but lacks punch for virality.",
        issue_evaluations: [
          { post_index: 1, prior_issue: "Weak hook", status: "resolved", reasoning: "Resolved." },
        ],
        new_violations: [],
        suggested_score: 82,
      },
    });
    expect(evalCapBelow85.is_approved).toBe(false);
    expect(evalCapBelow85.virality_score).toBe(82);
    expect(calculateMonotonicScore({ previousScore: 80, suggestedScore: 84, totalIssues: 1, resolvedCount: 1, hasNewViolations: false })).toBe(84);

    // Thread-wide factual_error on UNEDITED Post 2 MUST be accepted
    const evalFactualOnUnedited = processDifferentialEvaluation({
      threadDraft: ["Fixed hook about Microsoft cloud spending.", "Microsoft revenue dropped 90% in Q3."],
      previousThreadDraft: ["Weak hook", "Microsoft revenue dropped 90% in Q3."],
      iterations: 1,
      previousScore: 80,
      priorActionableCritiques: [{ post_index: 1, critique: "Weak hook", fix_directive: "Fix" }],
      structuredResponse: {
        overall_critique: "Post 2 contains an unverified factual hallucination.",
        issue_evaluations: [{ post_index: 1, prior_issue: "Weak hook", status: "resolved", reasoning: "Resolved" }],
        new_violations: [
          { post_index: 2, violation_type: "factual_error", critique: "Revenue did not drop 90% in source" },
        ],
        suggested_score: 68,
      },
    });
    expect(evalFactualOnUnedited.is_approved).toBe(false);
    expect(evalFactualOnUnedited.post_critiques.some((pc) => pc.post_index === 2)).toBe(true);
  });

  test("All 4 factory Differential Critic nodes pass source/dossier & previous draft context cleanly", async () => {
    mocks.invokeWithFallbacks.mockResolvedValue({
      structuredResponse: {
        overall_critique: "Verified cleanly against source.",
        issue_evaluations: [{ post_index: 1, prior_issue: "Need citation", status: "resolved", reasoning: "Grounded" }],
        new_violations: [],
        suggested_score: 90,
      },
    });

    const baseCritiques = [{ post_index: 1, critique: "Need citation", fix_directive: "Cite Q4 metric" }];

    // 1. News
    const newsRes = await newsNodes.ViralityCriticNode({
      raw_markdown: "NEWS_SOURCE_FACT_XYZ",
      research_context: "NEWS_RESEARCH_DETAIL",
      thread_draft: ["Updated Hook 1", "Body 2"],
      previous_thread_draft: ["Old Hook 1", "Body 2"],
      iterations: 1,
      virality_score: 76,
      post_critiques: baseCritiques,
      retries: { critic: 0, validator: 0 },
    } as unknown as Parameters<typeof newsNodes.ViralityCriticNode>[0]);
    const newsPrompt = String(mocks.invokeWithFallbacks.mock.calls[0][1].messages[0].content);
    expect(newsPrompt).toContain("<SOURCE_MATERIAL>\nNEWS_SOURCE_FACT_XYZ\n</SOURCE_MATERIAL>");
    expect(newsPrompt).toContain("<RESEARCH_CONTEXT>\nNEWS_RESEARCH_DETAIL\n</RESEARCH_CONTEXT>");
    expect(newsPrompt).toContain("<PREVIOUS_THREAD_DRAFT>");
    expect(newsPrompt).toContain("<MODIFIED_POST_INDICES>\nPost 1\n</MODIFIED_POST_INDICES>");
    expect((newsRes as { previous_thread_draft?: string[] }).previous_thread_draft).toEqual(["Updated Hook 1", "Body 2"]);

    // 2. Social Media
    await socialNodes.ViralityCriticNode({
      raw_markdown: "SOCIAL_SOURCE_FACT",
      research_context: "SOCIAL_RESEARCH_DETAIL",
      thread_draft: ["Updated Social 1", "Social 2"],
      previous_thread_draft: ["Old Social 1", "Social 2"],
      iterations: 1,
      virality_score: 76,
      post_critiques: baseCritiques,
      retries: { critic: 0, validator: 0 },
    } as unknown as Parameters<typeof socialNodes.ViralityCriticNode>[0]);
    const socialPrompt = String(mocks.invokeWithFallbacks.mock.calls[1][1].messages[0].content);
    expect(socialPrompt).toContain("<SOURCE_MATERIAL>\nSOCIAL_SOURCE_FACT\n</SOURCE_MATERIAL>");
    expect(socialPrompt).toContain("<RESEARCH_CONTEXT>\nSOCIAL_RESEARCH_DETAIL\n</RESEARCH_CONTEXT>");

    // 3. Topic
    await topicNodes.ViralityCriticNode({
      research_dossier: "TOPIC_DOSSIER_RECEIPT",
      thread_draft: ["Updated Topic 1", "Topic 2"],
      previous_thread_draft: ["Old Topic 1", "Topic 2"],
      iterations: 1,
      virality_score: 76,
      post_critiques: baseCritiques,
      retries: { critic: 0, validator: 0 },
    } as unknown as Parameters<typeof topicNodes.ViralityCriticNode>[0]);
    const topicPrompt = String(mocks.invokeWithFallbacks.mock.calls[2][1].messages[0].content);
    expect(topicPrompt).toContain("<DOSSIER>\nTOPIC_DOSSIER_RECEIPT\n</DOSSIER>");

    // 4. Clickbait
    await clickbaitNodes.ClickbaitViralityCriticNode({
      raw_markdown: "CLICKBAIT_SOURCE_FACT",
      research_context: "CLICKBAIT_RESEARCH_DETAIL",
      archetype: "Contrarian",
      shock_payload: "50% drop",
      withheld_mechanism: "hidden margin",
      high_arousal_valence: "shock",
      thread_draft: ["Updated Clickbait 1", "Clickbait 2"],
      previous_thread_draft: ["Old Clickbait 1", "Clickbait 2"],
      iterations: 1,
      virality_score: 76,
      post_critiques: baseCritiques,
      retries: { critic: 0, validator: 0 },
    } as unknown as Parameters<typeof clickbaitNodes.ClickbaitViralityCriticNode>[0]);
    const clickbaitPrompt = String(mocks.invokeWithFallbacks.mock.calls[3][1].messages[0].content);
    expect(clickbaitPrompt).toContain("<SOURCE_MATERIAL>\nCLICKBAIT_SOURCE_FACT\n</SOURCE_MATERIAL>");
    expect(clickbaitPrompt).toContain("<CLICKBAIT_STRATEGY>");
  });

  test("ScraperNode anchors prompt on <TARGET_URL>/<ARTICLE_TITLE> and persists article_title", async () => {
    const spy = vi.spyOn(newsTools.WebScraperTool, "invoke").mockResolvedValueOnce(
      JSON.stringify({
        markdown: "Clean primary body",
        images: ["https://cdn.example/img.png"],
        title: "Authoritative Target Headline",
        description: "Primary article description",
      })
    );
    mocks.invokeWithFallbacks.mockResolvedValueOnce({ content: "Summarized factual brief" });

    const res = await newsNodes.ScraperNode({
      url: "https://example.com/news/target-story",
      retries: { scraper: 0 },
    } as unknown as Parameters<typeof newsNodes.ScraperNode>[0]);

    expect(spy).toHaveBeenCalledTimes(1);
    const userMsg = String(mocks.invokeWithFallbacks.mock.calls[0][1][1].content);
    expect(userMsg).toContain("<TARGET_URL>\nhttps://example.com/news/target-story\n</TARGET_URL>");
    expect(userMsg).toContain("<ARTICLE_TITLE>\nAuthoritative Target Headline\n</ARTICLE_TITLE>");
    expect(res.article_title).toBe("Authoritative Target Headline");
  });
});

describe("Section 4 - Topic Extraction & Discovery Retrieval Hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("extractDiscoveryTopic prefers verified articleTitle, strips markdown, avoids mid-word chop, handles underscores & rejects Access Denied", () => {
    expect(
      extractDiscoveryTopic(
        "https://portal.example/news/something_else_deadbeef",
        "- [The Catalyst: Top Stories Roundup of the Day]",
        "Fallback",
        "**Microsoft** declares [code red](https://example.com) over AI quality"
      )
    ).toBe("Microsoft declares code red over AI quality");

    // Rejects Access Denied articleTitle & Access Denied markdown body, falling back cleanly to underscore/hex-stripped URL slug
    expect(
      extractDiscoveryTopic(
        "https://news.example.com/2026/05/google_gemini_enterprise_pricing_shift_a1b2c3d4.html",
        "# Access Denied\nAccess to this page has been denied. Enable JavaScript.",
        "Fallback",
        "Access Denied"
      )
    ).toBe("google gemini enterprise pricing shift");

    // Word boundary truncation at <= 150 chars
    const longTitle = "Enterprise cloud adoption accelerates dramatically after major regional outage forces multi-region failover architecture across healthcare banks worldwide";
    const truncated = extractDiscoveryTopic(undefined, undefined, "Fallback", longTitle);
    expect(truncated.length).toBeLessThanOrEqual(150);
    expect(longTitle.startsWith(truncated)).toBe(true);
    expect(truncated.endsWith("worldwid")).toBe(false);
  });

  test("DialecticRetrievalNode avoids hardware clichés and marks parse_success false when 0 results", async () => {
    const prevKey = process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_API_KEY;
    try {
      const result = await DialecticRetrievalNode({
        topic: "Figma Config Launch",
        search_vectors: [
          { vector: "structural_dependencies", vector_name: "Underlying Economics", queries: ["Figma pricing"] },
        ],
        retries: { retrieval: 0 },
      } as unknown as Parameters<typeof DialecticRetrievalNode>[0]);

      expect(result.parse_success).toBe(false);
      expect(result.retrieval_evidence[0].source).toBe("empty_retrieval_notice");
      expect(result.retrieval_evidence[0].snippet).not.toContain("supply chain realities");
      expect(result.retries.retrieval).toBe(1);
    } finally {
      if (prevKey === undefined) delete process.env.TAVILY_API_KEY;
      else process.env.TAVILY_API_KEY = prevKey;
    }
  });

  test("executeDialecticRetrieval filters low-value URLs and discards blocked Jina responses", async () => {
    const prevKey = process.env.TAVILY_API_KEY;
    process.env.TAVILY_API_KEY = "test-tavily-key";
    try {
      mocks.tavilySearch.mockResolvedValueOnce({
        results: [
          { title: "Search Page", url: "https://duckduckgo.com/?q=test", content: "redirect" },
          { title: "PDF Report", url: "https://example.com/report.pdf", content: "binary" },
          { title: "Valid Deep Post", url: "https://engineering.example.com/post", content: "Valid summary" },
        ],
      });
      mocks.jinaRead.mockResolvedValueOnce({
        data: {
          title: "Just a moment...",
          content: "Enable JavaScript and cookies to continue.",
        },
      });

      const items = await executeDialecticRetrieval({
        vectors: [{ vector: "tradeoffs", vector_name: "Trade-offs", queries: ["query 1"] }],
        maxQueriesPerVector: 1,
        timeoutMs: 5000,
      });

      // Only the valid article URL should be attempted by Jina (not duckduckgo or .pdf)
      expect(mocks.jinaRead).toHaveBeenCalledTimes(1);
      expect(mocks.jinaRead).toHaveBeenCalledWith("https://engineering.example.com/post", expect.any(Object));
      // Blocked Jina output must NOT be attached as full_text
      const deepMatch = items.find((i) => i.url === "https://engineering.example.com/post");
      expect(deepMatch?.full_text).toBeUndefined();
    } finally {
      if (prevKey === undefined) delete process.env.TAVILY_API_KEY;
      else process.env.TAVILY_API_KEY = prevKey;
    }
  });
});
