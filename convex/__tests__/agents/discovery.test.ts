/// <reference types="vite/client" />
import { expect, test, describe, vi, afterEach } from "vitest";
import { END } from "@langchain/langgraph";
import {
  VectorHypothesizerNode,
  DialecticRetrievalNode,
  TensionExtractionNode,
  AngleFormulatorNode,
  extractDiscoveryTopic,
} from "../../lib/agents/discovery/nodes.js";
import {
  DiscoveryAgentGraph,
  route_after_hypothesizer,
  route_after_retrieval,
  route_after_tension,
  route_after_formulator,
} from "../../lib/agents/discovery/graph.js";
import {
  DiscoveryAgentStateType,
} from "../../lib/agents/discovery/state.js";
import * as agentUtils from "../../lib/agents/utils.js";
import * as retrievalModule from "../../lib/agents/discovery/retrieval.js";
import { TopicDiscoveryNode, ThreadWriterNode as TopicThreadWriterNode } from "../../lib/agents/topic/nodes.js";
import { NewsDiscoveryNode, ThreadWriterNode as NewsThreadWriterNode } from "../../lib/agents/news/nodes.js";
import { SocialMediaDiscoveryNode, ThreadWriterNode as SocialMediaThreadWriterNode } from "../../lib/agents/social_media/nodes.js";
import type { TopicThreadFactoryStateType } from "../../lib/agents/topic/state.js";
import type { NewsThreadFactoryStateType } from "../../lib/agents/news/state.js";
import type { SocialMediaThreadFactoryStateType } from "../../lib/agents/social_media/state.js";

function createMockDiscoveryState(overrides: Partial<DiscoveryAgentStateType> = {}): DiscoveryAgentStateType {
  return {
    topic: "Test Topic",
    seed_claims: undefined,
    description: undefined,
    guidance: undefined,
    raw_markdown: undefined,
    search_vectors: [],
    retrieval_evidence: [],
    extracted_tensions: [],
    discovery_angles: [],
    core_delta: undefined,
    research_dossier: "",
    parse_success: true,
    retries: { hypothesizer: 0, retrieval: 0, tension: 0, formulator: 0 },
    iterations: 0,
    max_iterations: 2,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("extractDiscoveryTopic", () => {
  test("extracts explicit Catalyst from raw_markdown skipping template headers", () => {
    const rawMarkdown = `### 1. VIRAL METRICS, MILESTONES & MICRO-ASSETS (THE RECEIPTS)
- 3nm process node
- 24 cores
### 2. THE NEWSJACKING MATRIX (Catalyst & Asymmetry)
- [The Catalyst: Intel officially launches Core Ultra 200S desktop processors]
- The Immediate Impact: Shifts desktop battleground to power efficiency`;

    const topic = extractDiscoveryTopic(
      "https://example.com/articleshow/114120349.cms",
      rawMarkdown,
      "News topic"
    );

    expect(topic).toBe("Intel officially launches Core Ultra 200S desktop processors");
  });

  test("extracts explicit non-template markdown heading when no catalyst is present", () => {
    const rawMarkdown = `# Apple M4 Ultra Architecture Breakdown
Here are the architectural highlights...`;

    const topic = extractDiscoveryTopic(
      "https://theverge.com/article/tech-launch",
      rawMarkdown,
      "News topic"
    );

    expect(topic).toBe("Apple M4 Ultra Architecture Breakdown");
  });

  test("extracts clean topic from hyphenated URL slug when markdown lacks clear catalyst or title", () => {
    const rawMarkdown = `### 1. VIRAL METRICS, MILESTONES & MICRO-ASSETS (THE RECEIPTS)
- $499 starting price point`;

    const topic = extractDiscoveryTopic(
      "https://theverge.com/2024/10/intel-launches-core-ultra-200s-processors",
      rawMarkdown,
      "News topic"
    );

    expect(topic).toBe("intel launches core ultra 200s processors");
  });

  test("falls back to default when both url and markdown lack structured indicators", () => {
    const topic = extractDiscoveryTopic(undefined, undefined, "Fallback topic");
    expect(topic).toBe("Fallback topic");
  });
});

describe("Discovery Agent - Node Execution", () => {
  test("VectorHypothesizerNode - extracts 5 paired search vectors on LLM success", async () => {
    const mockVectors = [
      {
        vector: "bom_paradox",
        vector_name: "The BOM Paradox (Symbiotic Rivals)",
        queries: [
          "Apple Vision Pro display supplier Sony margin",
          "Apple Vision Pro micro-OLED yield teardown",
        ],
      },
      {
        vector: "production_stagecraft",
        vector_name: "Production Stagecraft & PR Mitigation",
        queries: [
          "Vision Pro EyeSight demo failure glitch",
          "Vision Pro external battery cable tether issues",
        ],
      },
      {
        vector: "supply_chain_arbitrage",
        vector_name: "Supply Chain Arbitrage & Reverse Feature Flow",
        queries: [
          "Pico 4 pancake lens Shenzhen ODM prior art",
          "Goertek VR optical module supply chain history",
        ],
      },
      {
        vector: "engineering_tradeoffs",
        vector_name: "Engineering Trade-offs vs. Marketing Framing",
        queries: [
          "Vision Pro M2 sustained thermal throttling benchmark",
          "Vision Pro weight distribution neck strain physics",
        ],
      },
      {
        vector: "regulatory_asymmetry",
        vector_name: "Regulatory & Litigation Asymmetry",
        queries: [
          "Vision Pro trademark litigation China Huawei",
          "Vision Pro biometric privacy EU compliance",
        ],
      },
    ];

    vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
      search_vectors: mockVectors,
    });

    const result = await VectorHypothesizerNode(createMockDiscoveryState({
      topic: "Apple Vision Pro",
    }));

    expect(result.parse_success).toBe(true);
    expect(result.search_vectors).toHaveLength(5);
    expect(result.search_vectors[0].vector).toBe("bom_paradox");
    expect(result.retries?.hypothesizer).toBe(0);
  });

  test("VectorHypothesizerNode - provides deterministic fallback vectors on LLM failure", async () => {
    vi.spyOn(agentUtils, "invokeWithFallbacks").mockRejectedValue(new Error("LLM failure"));

    const result = await VectorHypothesizerNode(createMockDiscoveryState({
      topic: "Tesla Cybercab",
    }));

    expect(result.parse_success).toBe(false);
    expect(result.search_vectors).toHaveLength(5);
    expect(result.search_vectors[0].vector).toBe("bom_paradox");
    expect(result.search_vectors[0].queries[0]).toContain("Tesla Cybercab");
    expect(result.retries?.hypothesizer).toBe(1);
  });

  test("DialecticRetrievalNode - executes open-web retrieval and returns evidence", async () => {
    const mockEvidence = [
      {
        vector: "bom_paradox",
        query: "Sony micro-OLED margin",
        title: "Sony Display Analysis",
        snippet: "Sony supplies the 4K micro-OLED panels at an estimated $456 BOM cost.",
        source: "tavily_web",
      },
      {
        vector: "engineering_tradeoffs",
        query: "sustained thermal throttling",
        title: "Geekbench VR Loop",
        snippet: "Throttles by 18% under sustained 20-minute rendering workloads.",
        source: "tavily_web",
      },
    ];

    vi.spyOn(retrievalModule, "executeDialecticRetrieval").mockResolvedValue(mockEvidence);

    const result = await DialecticRetrievalNode(createMockDiscoveryState({
      topic: "Apple Vision Pro",
      search_vectors: [
        {
          vector: "bom_paradox",
          vector_name: "The BOM Paradox",
          queries: ["Sony micro-OLED margin"],
        },
      ],
    }));

    expect(result.parse_success).toBe(true);
    expect(result.retrieval_evidence).toHaveLength(2);
    expect(result.retrieval_evidence[0].snippet).toContain("Sony supplies");
  });

  test("TensionExtractionNode - extracts surface vs forensic realities and contradiction scores", async () => {
    const mockTensions = [
      {
        vector: "BOM & Symbiotic Rivalry",
        surface_narrative: "Apple invents the ultimate spatial computing display.",
        forensic_reality: "Sony supplies the micro-OLED displays taking $450+ margins per unit.",
        core_tension: "Their camera sensor rival captures 30% of the total hardware bill.",
        primary_proof_sources: ["TechInsights BOM Teardown", "Omdia Display Yield Report"],
        contradiction_score: 9,
      },
    ];

    vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
      extracted_tensions: mockTensions,
    });

    const result = await TensionExtractionNode(createMockDiscoveryState({
      topic: "Apple Vision Pro",
      retrieval_evidence: [
        {
          vector: "bom_paradox",
          query: "Sony BOM",
          snippet: "TechInsights confirms Sony display at $450 BOM.",
        },
      ],
    }));

    expect(result.parse_success).toBe(true);
    expect(result.extracted_tensions).toHaveLength(1);
    expect(result.extracted_tensions[0].contradiction_score).toBe(9);
    expect(result.iterations).toBe(1);
  });

  test("AngleFormulatorNode - emits structured discovery angles, core delta, and markdown dossier", async () => {
    const mockOutput = {
      topic: "Apple Vision Pro",
      discovery_angles: [
        {
          vector: "BOM & Symbiotic Rivalry",
          surface_narrative: "Apple invents the ultimate spatial computing display.",
          forensic_reality: "Sony supplies the micro-OLED displays taking $450+ margins per unit.",
          core_tension: "Their camera sensor rival captures 30% of the total hardware bill.",
          primary_proof_sources: ["TechInsights BOM Teardown"],
        },
      ],
      core_delta: "Their camera sensor rival captures 30% of the total hardware bill.",
      research_dossier: "# FORENSIC DISCOVERY DOSSIER: Apple Vision Pro\n\n## 1. THE CORE DELTA\nReceipts verified.",
    };

    vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue(mockOutput);

    const result = await AngleFormulatorNode(createMockDiscoveryState({
      topic: "Apple Vision Pro",
      extracted_tensions: [
        {
          vector: "BOM & Symbiotic Rivalry",
          surface_narrative: "Apple invents display.",
          forensic_reality: "Sony supplies it.",
          core_tension: "Rival profits most.",
          primary_proof_sources: ["TechInsights"],
          contradiction_score: 9,
        },
      ],
    }));

    expect(result.parse_success).toBe(true);
    expect(result.discovery_angles).toHaveLength(1);
    expect(result.core_delta).toBe(mockOutput.core_delta);
    expect(result.research_dossier).toContain("FORENSIC DISCOVERY DOSSIER");
  });
});

describe("Discovery Agent - Subgraph Routing & Cyclic Edges", () => {
  const baseState = createMockDiscoveryState();

  test("route_after_hypothesizer - routes to DialecticRetrievalNode on success", () => {
    expect(route_after_hypothesizer(baseState)).toBe("DialecticRetrievalNode");
  });

  test("route_after_hypothesizer - retries VectorHypothesizerNode when parse failed and retries < 3", () => {
    expect(
      route_after_hypothesizer({
        ...baseState,
        parse_success: false,
        retries: { hypothesizer: 1, retrieval: 0, tension: 0, formulator: 0 },
      })
    ).toBe("VectorHypothesizerNode");
  });

  test("route_after_hypothesizer - falls forward to DialecticRetrievalNode when retries >= 3", () => {
    expect(
      route_after_hypothesizer({
        ...baseState,
        parse_success: false,
        retries: { hypothesizer: 3, retrieval: 0, tension: 0, formulator: 0 },
      })
    ).toBe("DialecticRetrievalNode");
  });

  test("route_after_retrieval - retries retrieval when parse_success is false and retries < 3", () => {
    expect(
      route_after_retrieval({
        ...baseState,
        parse_success: false,
        retries: { hypothesizer: 0, retrieval: 1, tension: 0, formulator: 0 },
      })
    ).toBe("DialecticRetrievalNode");
  });

  test("route_after_retrieval - falls forward to TensionExtractionNode when retries >= 3 or parse_success is true", () => {
    expect(
      route_after_retrieval({
        ...baseState,
        parse_success: false,
        retries: { hypothesizer: 0, retrieval: 3, tension: 0, formulator: 0 },
      })
    ).toBe("TensionExtractionNode");

    expect(
      route_after_retrieval({
        ...baseState,
        parse_success: true,
      })
    ).toBe("TensionExtractionNode");
  });

  test("route_after_tension - cycles back to DialecticRetrievalNode when contradiction score < 4 and iterations < max_iterations", () => {
    expect(
      route_after_tension({
        ...baseState,
        extracted_tensions: [
          {
            vector: "Tradeoff",
            surface_narrative: "Claims",
            forensic_reality: "Reality",
            core_tension: "Tension",
            primary_proof_sources: [],
            contradiction_score: 2,
          },
        ],
        iterations: 0,
        max_iterations: 2,
      })
    ).toBe("DialecticRetrievalNode");
  });

  test("route_after_tension - proceeds to AngleFormulatorNode when contradiction score >= 4", () => {
    expect(
      route_after_tension({
        ...baseState,
        extracted_tensions: [
          {
            vector: "Tradeoff",
            surface_narrative: "Claims",
            forensic_reality: "Reality",
            core_tension: "Tension",
            primary_proof_sources: [],
            contradiction_score: 7,
          },
        ],
        iterations: 0,
        max_iterations: 2,
      })
    ).toBe("AngleFormulatorNode");
  });

  test("route_after_formulator - completes to END on success", () => {
    expect(route_after_formulator(baseState)).toBe(END);
  });

  test("DiscoveryAgentGraph - compiles as executable StateGraph", () => {
    expect(DiscoveryAgentGraph).toBeDefined();
    expect(typeof DiscoveryAgentGraph.invoke).toBe("function");
  });
});

describe("Factory Subgraph Integration Nodes", () => {
  test("TopicDiscoveryNode - invokes DiscoveryAgentGraph and forwards discovery angles", async () => {
    const mockAngles = [
      {
        vector: "BOM Paradox",
        surface_narrative: "Surface claim",
        forensic_reality: "Forensic reality",
        core_tension: "Core tension",
        primary_proof_sources: ["Teardown 1"],
      },
    ];

    vi.spyOn(DiscoveryAgentGraph, "invoke").mockResolvedValue(
      createMockDiscoveryState({
        discovery_angles: mockAngles,
        core_delta: "Explosive tension",
        research_dossier: "# TOPIC FORENSIC DOSSIER",
      })
    );

    const result = await TopicDiscoveryNode({
      topic: "Rabbit R1",
      discovery_agent: true,
      parse_success: true,
    } as unknown as TopicThreadFactoryStateType);

    expect(result.parse_success).toBe(true);
    expect(result.discovery_angles).toEqual(mockAngles);
    expect(result.core_delta).toBe("Explosive tension");
    expect(result.research_dossier).toContain("TOPIC FORENSIC DOSSIER");
  });

  test("NewsDiscoveryNode - extracts topic candidate from raw_markdown and invokes DiscoveryAgentGraph", async () => {
    const mockAngles = [
      {
        vector: "Engineering Compromise",
        surface_narrative: "Surface claim",
        forensic_reality: "Forensic reality",
        core_tension: "Core tension",
        primary_proof_sources: ["FCC Filing"],
      },
    ];

    const invokeSpy = vi.spyOn(DiscoveryAgentGraph, "invoke").mockResolvedValue(
      createMockDiscoveryState({
        discovery_angles: mockAngles,
        core_delta: "Thermal limit reached",
        research_dossier: "# NEWS FORENSIC DOSSIER",
      })
    );

    const result = await NewsDiscoveryNode({
      url: "https://theverge.com/article/tech-launch",
      raw_markdown: "# Intel Core Ultra 200S Launch\nFull review details...",
      discovery_agent: true,
      parse_success: true,
    } as unknown as NewsThreadFactoryStateType);

    expect(result.parse_success).toBe(true);
    expect(invokeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "Intel Core Ultra 200S Launch",
      }),
      expect.anything()
    );
    expect(result.discovery_angles).toEqual(mockAngles);
    expect(result.core_delta).toBe("Thermal limit reached");
  });

  test("SocialMediaDiscoveryNode - invokes DiscoveryAgentGraph and forwards research context", async () => {
    const mockAngles = [
      {
        vector: "Production Stagecraft",
        surface_narrative: "Demo shows instant latency",
        forensic_reality: "Pre-rendered video feed",
        core_tension: "Live presentation was simulated",
        primary_proof_sources: ["Metadata Analysis"],
      },
    ];

    vi.spyOn(DiscoveryAgentGraph, "invoke").mockResolvedValue(
      createMockDiscoveryState({
        discovery_angles: mockAngles,
        core_delta: "Live presentation was simulated",
        research_dossier: "# SOCIAL FORENSIC DOSSIER",
      })
    );

    const result = await SocialMediaDiscoveryNode({
      url: "https://x.com/tech_insider/status/123",
      raw_markdown: "Breaking: AI startup demo shows zero latency responses",
      discovery_agent: true,
      parse_success: true,
    } as unknown as SocialMediaThreadFactoryStateType);

    expect(result.parse_success).toBe(true);
    expect(result.discovery_angles).toEqual(mockAngles);
    expect(result.core_delta).toBe("Live presentation was simulated");
  });

  test("ThreadWriterNode (Topic) - injects <DISCOVERY_ANGLES> into writer prompt", async () => {
    const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
      thread_draft: ["Post 1: Unveiling the real cost...", "Post 2: Teardown data proves it."],
    });

    const mockAngles = [
      {
        vector: "BOM & Symbiotic Rivalry",
        surface_narrative: "Revolutionary custom display",
        forensic_reality: "Sony supplies panels at $450 BOM",
        core_tension: "Rival takes bulk of hardware profits",
        primary_proof_sources: ["Teardown 2024"],
      },
    ];

    await TopicThreadWriterNode({
      selected_hook: "The dirty secret behind this hardware launch",
      research_dossier: "Full research data",
      discovery_angles: mockAngles,
      thread_draft: [],
      retries: { writer: 0 },
      parse_success: true,
    } as unknown as TopicThreadFactoryStateType);

    expect(invokeSpy).toHaveBeenCalled();
    const callArgs = invokeSpy.mock.calls[0];
    const messages = callArgs[1] as Array<{ role: string; content: string }>;
    const userPrompt = messages.find((m) => m.role === "user")?.content || "";
    expect(userPrompt).toContain("<DISCOVERY_ANGLES>");
    expect(userPrompt).toContain("Sony supplies panels at $450 BOM");
  });

  test("ThreadWriterNode (News) - injects <DISCOVERY_ANGLES> into writer prompt", async () => {
    const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
      thread_draft: ["Post 1: News analysis...", "Post 2: Deep dive."],
    });

    const mockAngles = [
      {
        vector: "Engineering Trade-offs",
        surface_narrative: "Thinnest chassis ever",
        forensic_reality: "25% thermal throttling under load",
        core_tension: "Aesthetics sacrificed sustained performance",
        primary_proof_sources: ["3DMark loop"],
      },
    ];

    await NewsThreadWriterNode({
      selected_hook: "Why this laptop throttles immediately",
      raw_markdown: "Laptop review",
      discovery_angles: mockAngles,
      thread_draft: [],
      retries: { writer: 0 },
      parse_success: true,
    } as unknown as NewsThreadFactoryStateType);

    expect(invokeSpy).toHaveBeenCalled();
    const callArgs = invokeSpy.mock.calls[0];
    const messages = callArgs[1] as Array<{ role: string; content: string }>;
    const userPrompt = messages.find((m) => m.role === "user")?.content || "";
    expect(userPrompt).toContain("<DISCOVERY_ANGLES>");
    expect(userPrompt).toContain("25% thermal throttling under load");
  });

  test("ThreadWriterNode (Social Media) - injects <DISCOVERY_ANGLES> into writer prompt", async () => {
    const invokeSpy = vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
      thread_draft: ["Post 1: Viral breakdown...", "Post 2: Proof."],
    });

    const mockAngles = [
      {
        vector: "Production Stagecraft",
        surface_narrative: "Live demo worked seamlessly",
        forensic_reality: "Staged pre-rendered video playback",
        core_tension: "Software was non-functional in real-time",
        primary_proof_sources: ["Frame analysis"],
      },
    ];

    await SocialMediaThreadWriterNode({
      selected_hook: "The stagecraft behind the viral demo",
      raw_markdown: "Viral post content",
      discovery_angles: mockAngles,
      thread_draft: [],
      retries: { writer: 0 },
      parse_success: true,
    } as unknown as SocialMediaThreadFactoryStateType);

    expect(invokeSpy).toHaveBeenCalled();
    const callArgs = invokeSpy.mock.calls[0];
    const messages = callArgs[1] as Array<{ role: string; content: string }>;
    const userPrompt = messages.find((m) => m.role === "user")?.content || "";
    expect(userPrompt).toContain("<DISCOVERY_ANGLES>");
    expect(userPrompt).toContain("Staged pre-rendered video playback");
  });
});
