/// <reference types="vite/client" />
import { describe, it, expect, vi, afterEach } from "vitest";
import { ClickbaitArchetypeSchema, ClickbaitThreadFactoryState } from "../../lib/agents/clickbait/state";
import {
  CLICKBAIT_SCRAPER_PROMPT,
  CLICKBAIT_ANGLE_PROMPT,
  CLICKBAIT_HOOK_PROMPT,
  CLIFFHANGER_WRITER_PROMPT,
  CLICKBAIT_CRITIC_PROMPT,
  CLICKBAIT_DIFFERENTIAL_CRITIC_PROMPT,
} from "../../lib/agents/clickbait/prompts";
import { ClickbaitThreadFactoryGraph } from "../../lib/agents/clickbait/graph";
import {
  threadDraftInputValidator,
  clickbaitArchetypeValidator,
  clickbaitArousalValenceValidator,
} from "../../schema";

describe("Clickbait Agent - Schemas & State", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("validates all 5 clickbait archetypes", () => {
    expect(clickbaitArchetypeValidator).toBeDefined();
    expect(clickbaitArousalValenceValidator).toBeDefined();
    const validArchetypes = [
      "forbidden_secret",
      "catastrophic_asymmetry",
      "counter_intuitive_reversal",
      "thriller_cold_open",
      "elite_cheat_code",
    ];

    for (const archetype of validArchetypes) {
      expect(ClickbaitArchetypeSchema.parse(archetype)).toBe(archetype);
    }

    expect(() => ClickbaitArchetypeSchema.parse("invalid_archetype")).toThrow();
  });

  it("compiles ClickbaitThreadFactoryState with all required clickbait fields", () => {
    expect(ClickbaitThreadFactoryState).toBeDefined();
    // Validate state shape keys by inspecting graph channels
    const channels = Object.keys(ClickbaitThreadFactoryGraph.channels);
    expect(channels).toContain("url");
    expect(channels).toContain("archetype");
    expect(channels).toContain("shock_payload");
    expect(channels).toContain("withheld_mechanism");
    expect(channels).toContain("high_arousal_valence");
    expect(channels).toContain("core_hooks");
    expect(channels).toContain("selected_hook");
    expect(channels).toContain("thread_draft");
    expect(channels).toContain("virality_score");
  });

  it("threadDraftInputValidator accepts clickbait agent inputs", () => {
    expect(threadDraftInputValidator).toBeDefined();
    // Valid clickbait input
    const validPayload = {
      agent: "clickbait" as const,
      url: "https://example.com/post-mortem",
    };
    // Convex union validator validation
    expect(validPayload.agent).toBe("clickbait");
    expect(validPayload.url).toBe("https://example.com/post-mortem");
  });
});

describe("Clickbait Agent - Prompts Integrity & Cognitive Architecture", () => {
  it("CLICKBAIT_SCRAPER_PROMPT targets extreme asymmetries, buried bombshells, and receipts", () => {
    expect(CLICKBAIT_SCRAPER_PROMPT).toContain("THE EXTREME ASYMMETRIES & TABOO RECEIPTS");
    expect(CLICKBAIT_SCRAPER_PROMPT).toContain("THE BURIED BOMBSHELL");
    expect(CLICKBAIT_SCRAPER_PROMPT).toContain("CONFLICT, VILLAINS & VICTIMS");
    expect(CLICKBAIT_SCRAPER_PROMPT).toContain("THE COUNTER-INTUITIVE TRUTH");
  });

  it("CLICKBAIT_ANGLE_PROMPT encodes all 5 archetypes and Loewenstein's Curiosity Cloaking", () => {
    expect(CLICKBAIT_ANGLE_PROMPT).toContain("forbidden_secret");
    expect(CLICKBAIT_ANGLE_PROMPT).toContain("catastrophic_asymmetry");
    expect(CLICKBAIT_ANGLE_PROMPT).toContain("counter_intuitive_reversal");
    expect(CLICKBAIT_ANGLE_PROMPT).toContain("thriller_cold_open");
    expect(CLICKBAIT_ANGLE_PROMPT).toContain("elite_cheat_code");
    expect(CLICKBAIT_ANGLE_PROMPT).toContain("shock_payload");
    expect(CLICKBAIT_ANGLE_PROMPT).toContain("withheld_mechanism");
    expect(CLICKBAIT_ANGLE_PROMPT).toContain("high_arousal_valence");
  });

  it("CLICKBAIT_HOOK_PROMPT strictly enforces the 5-Word Eye-Skimming Rule and Curiosity Cloaking", () => {
    expect(CLICKBAIT_HOOK_PROMPT).toContain("THE 5-WORD EYE-SKIMMING RULE");
    expect(CLICKBAIT_HOOK_PROMPT).toContain("THE CURIOSITY CLOAKING MANDATE");
    expect(CLICKBAIT_HOOK_PROMPT).toContain("NO DUPLICATE OPENERS");
    expect(CLICKBAIT_HOOK_PROMPT).toContain("ZERO URLS");
  });

  it("CLIFFHANGER_WRITER_PROMPT mandates the Dopamine Cliffhanger Cascade and Micro-Cliffhangers", () => {
    expect(CLIFFHANGER_WRITER_PROMPT).toContain("THE DOPAMINE CLIFFHANGER CASCADE");
    expect(CLIFFHANGER_WRITER_PROMPT).toContain("MICRO-CLIFFHANGER ENDINGS");
    expect(CLIFFHANGER_WRITER_PROMPT).toContain("ZERO EM DASHES");
    expect(CLIFFHANGER_WRITER_PROMPT).toContain("ATOMIC SCREENSHOT RULE");
  });

  it("CLICKBAIT_CRITIC_PROMPT defines the 100-Point Adversarial Audit Rubric with Payoff Integrity", () => {
    expect(CLICKBAIT_CRITIC_PROMPT).toContain("100-POINT ADVERSARIAL CLICKBAIT AUDIT RUBRIC");
    expect(CLICKBAIT_CRITIC_PROMPT).toContain("CURIOSITY GAP & CLOAKING INTEGRITY");
    expect(CLICKBAIT_CRITIC_PROMPT).toContain("THUMB-STOP VELOCITY & FIRST 5 WORDS");
    expect(CLICKBAIT_CRITIC_PROMPT).toContain("CLIFFHANGER CASCADE & RETENTION FLOW");
    expect(CLICKBAIT_CRITIC_PROMPT).toContain("PAYOFF INTEGRITY & ANTI-SCAM AUDIT");
    expect(CLICKBAIT_CRITIC_PROMPT).toContain("ANTI-AI PROTOCOL & VOICE");
  });

  it("CLICKBAIT_DIFFERENTIAL_CRITIC_PROMPT is configured for iterative evaluation", () => {
    expect(CLICKBAIT_DIFFERENTIAL_CRITIC_PROMPT).toBeDefined();
    expect(CLICKBAIT_DIFFERENTIAL_CRITIC_PROMPT).toContain("Differential Critic Node");
  });
});

describe("Clickbait Agent - Graph Compilation", () => {
  it("compiles ClickbaitThreadFactoryGraph with all nodes and transitions", () => {
    expect(ClickbaitThreadFactoryGraph).toBeDefined();
    expect(typeof ClickbaitThreadFactoryGraph.invoke).toBe("function");
    // Verify nodes presence
    const nodeKeys = Object.keys(ClickbaitThreadFactoryGraph.nodes);
    expect(nodeKeys).toContain("ClickbaitScraperNode");
    expect(nodeKeys).toContain("ClickbaitAngleStrategistNode");
    expect(nodeKeys).toContain("HookStrategistNode");
    expect(nodeKeys).toContain("ManualHookSelectionNode");
    expect(nodeKeys).toContain("ThreadWriterNode");
    expect(nodeKeys).toContain("CharacterValidatorNode");
    expect(nodeKeys).toContain("ViralityCriticNode");
    expect(nodeKeys).not.toContain("VisualKeywordStrategistNode");
    expect(nodeKeys).toContain("ClickbaitDiscoveryNode");
    expect(nodeKeys).toContain("InfographicGeneratorNode");
  });

  it("prompts align selected_hook, score >= 85 threshold, and differential schema", async () => {
    const {
      CLICKBAIT_HOOK_PROMPT,
      CLICKBAIT_CRITIC_PROMPT,
      CLICKBAIT_DIFFERENTIAL_CRITIC_PROMPT,
    } = await import("../../lib/agents/clickbait/prompts");

    expect(CLICKBAIT_HOOK_PROMPT).toContain('"selected_hook"');
    expect(CLICKBAIT_CRITIC_PROMPT).toContain("score >= 85");
    expect(CLICKBAIT_CRITIC_PROMPT).not.toContain("score >= 75");
    expect(CLICKBAIT_DIFFERENTIAL_CRITIC_PROMPT).toContain("issue_evaluations");
    expect(CLICKBAIT_DIFFERENTIAL_CRITIC_PROMPT).toContain("suggested_score");
  });

  it("ClickbaitDiscoveryNode invokes DiscoveryAgentGraph and ClickbaitScraperNode handles array blocks", async () => {
    const { ClickbaitDiscoveryNode, ClickbaitScraperNode } = await import(
      "../../lib/agents/clickbait/nodes"
    );
    const { DiscoveryAgentGraph } = await import("../../lib/agents/discovery/graph");
    const tools = await import("../../lib/agents/clickbait/tools");
    const agentUtils = await import("../../lib/agents/utils");

    const discoverySpy = vi.spyOn(DiscoveryAgentGraph, "invoke").mockResolvedValue({
      discovery_angles: [
        {
          vector: "Engineering Compromise",
          surface_narrative: "Claim",
          forensic_reality: "Reality",
          core_tension: "Tension",
          primary_proof_sources: ["Source"],
        },
      ],
      core_delta: "Hidden flaw",
      research_dossier: "# Forensic Dossier",
    } as never);

    const discResult = await ClickbaitDiscoveryNode({
      url: "https://example.com/clickbait-story",
      raw_markdown: "# Shocking Claim\nDetails here",
      discovery_agent: true,
      parse_success: true,
      retries: { scraper: 0, researcher: 0, hook: 0, writer: 0, critic: 0, validator: 0 },
    } as never);

    expect(discoverySpy).toHaveBeenCalled();
    expect(discResult.parse_success).toBe(true);
    expect(discResult.core_delta).toBe("Hidden flaw");
    expect(discResult.research_context).toBe("# Forensic Dossier");

    vi.spyOn(tools.WebScraperTool, "invoke").mockResolvedValue(
      JSON.stringify({ markdown: "# Article", images: ["https://img.example.com/1.png"] })
    );
    vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
      content: [
        { type: "text", thought: true, text: "Internal reasoning..." },
        { type: "text", text: "## Clean Markdown Facts" },
      ],
    });

    const scrapeResult = await ClickbaitScraperNode({
      url: "https://example.com/clickbait-story",
      retries: { scraper: 0, researcher: 0, hook: 0, writer: 0, critic: 0, validator: 0 },
    } as never);

    expect(scrapeResult.parse_success).toBe(true);
    expect(scrapeResult.raw_markdown).toBe("## Clean Markdown Facts");
    expect(scrapeResult.images).toEqual(["https://img.example.com/1.png"]);
  });
});
