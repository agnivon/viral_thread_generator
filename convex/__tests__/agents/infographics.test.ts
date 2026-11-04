import { describe, it, expect, vi } from "vitest";
import {
  InfographicSpecSchema,
  InfographicSpec,
} from "../../lib/infographics/schema.js";
import {
  buildInfographicReactElement,
  renderInfographicToSvg,
  renderInfographicToPng,
} from "../../lib/infographics/renderer.js";
import { getInfographicFont } from "../../lib/infographics/font.js";
import { InfographicGeneratorNode } from "../../lib/infographics/nodes.js";
import * as agentUtils from "../../lib/agents/utils.js";

describe("InfographicSpecSchema", () => {
  it("validates a kpi_flow spec", () => {
    const spec: InfographicSpec = {
      archetype: "kpi_flow",
      kicker: "ORACLE / TENCENT",
      headline: "~$7bn lease cancelled, FT reports",
      subheading: "AI chips were to stay in Southeast Asia.",
      kpiCards: [
        { value: "5 years", label: "Reported lease term" },
        { value: "Up to 100,000", label: "Advanced AI chips" },
      ],
      flowSteps: [
        { title: "US officials raised concerns" },
        { title: "Oracle reportedly cancelled the lease" },
      ],
      sourceCitation: "Sources: FT via Reuters, Oracle Investor Day",
    };

    const parsed = InfographicSpecSchema.safeParse(spec);
    expect(parsed.success).toBe(true);
  });

  it("validates an entity_comparison spec", () => {
    const spec: InfographicSpec = {
      archetype: "entity_comparison",
      kicker: "CVS PROPOSED SEPARATION",
      headline: "9,000 stores would split off",
      subheading: "The insurer and specialty pharmacy would stay together",
      entityColumns: [
        {
          name: "CVS Health",
          badge: "Would retain",
          items: [
            { title: "Aetna", description: "Health insurance" },
            { title: "Caremark", description: "Prescription benefits" },
          ],
        },
        {
          name: "CVS Pharmacy",
          badge: "Would become independent",
          items: [
            { title: "About 9,000 pharmacies", description: "Retail stores across the U.S." },
            { title: "MinuteClinic", description: "Walk-in and virtual care" },
          ],
        },
      ],
      milestoneBadge: {
        label: "Target completion",
        value: "First half of 2028",
      },
      sourceCitation: "Sources: CVS announcement and investor presentation",
    };

    const parsed = InfographicSpecSchema.safeParse(spec);
    expect(parsed.success).toBe(true);
  });

  it("validates a comparison_bars spec", () => {
    const spec: InfographicSpec = {
      archetype: "comparison_bars",
      kicker: "BLOCK BITCOIN PERFORMANCE",
      headline: "Block's bitcoin gain rose. Its bitcoin gross profit halved.",
      subheading: "Q3 2025 vs Q3 2026 · US$ millions",
      barCharts: [
        {
          title: "Investment bitcoin valuation gain",
          bars: [
            { label: "2025", value: 59.6, displayValue: "59.6" },
            { label: "2026", value: 229.7, displayValue: "229.7" },
          ],
        },
      ],
      sourceCitation: "Source: Block, Form 10-Q filed with SEC",
    };

    const parsed = InfographicSpecSchema.safeParse(spec);
    expect(parsed.success).toBe(true);
  });

  it("validates a stat_callout spec", () => {
    const spec: InfographicSpec = {
      archetype: "stat_callout",
      kicker: "CERN PARTICLE PHYSICS",
      headline: "1 in 10 billion",
      subheading: "Evidence for an exceptionally rare particle decay",
      statCallout: {
        primaryStat: "1 in 10B",
        statLabel: "Decays into 2 muons per 10 billion B0 particles",
        secondaryStat: "3.2σ evidence",
        secondaryLabel: "5σ is usual threshold",
      },
      sourceCitation: "Source: CERN announcement & LHCb preprint",
    };

    const parsed = InfographicSpecSchema.safeParse(spec);
    expect(parsed.success).toBe(true);
  });
});

describe("Infographic Renderer (Satori + Resvg)", () => {
  const sampleSpec: InfographicSpec = {
    archetype: "kpi_flow",
    kicker: "ORACLE / TENCENT",
    headline: "~$7bn lease cancelled, FT reports",
    subheading: "AI chips were to stay in Southeast Asia.",
    kpiCards: [
      { value: "5 years", label: "Reported lease term" },
      { value: "Up to 100,000", label: "Advanced AI chips" },
    ],
    flowSteps: [
      { title: "US officials raised concerns" },
      { title: "Oracle reportedly cancelled the lease" },
    ],
    sourceCitation: "Sources: FT via Reuters, Oracle Investor Day",
  };

  it("builds React elements for each archetype without throwing", () => {
    const archetypes: Array<InfographicSpec["archetype"]> = [
      "kpi_flow",
      "entity_comparison",
      "comparison_bars",
      "stat_callout",
      "custom_layout",
    ];

    for (const archetype of archetypes) {
      const el = buildInfographicReactElement({
        ...sampleSpec,
        archetype,
        entityColumns: [
          { name: "A", items: [{ title: "Item A", description: "Desc A" }] },
          { name: "B", items: [{ title: "Item B", description: "Desc B" }] },
        ],
        barCharts: [
          {
            title: "Test Bars",
            bars: [{ label: "A", value: 10, displayValue: "10" }],
          },
        ],
        statCallout: {
          primaryStat: "99%",
          statLabel: "Accuracy",
        },
      });
      expect(el).toBeDefined();
    }
  });

  it("renders SVG string via satori with vector path glyphs and dimensions", async () => {
    const svg = await renderInfographicToSvg(sampleSpec);
    expect(typeof svg).toBe("string");
    expect(svg).toContain("<svg");
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="675"');
    expect(svg).toContain("<path");
  });

  it("renders high-res PNG Buffer with valid PNG magic bytes", async () => {
    const png = await renderInfographicToPng(sampleSpec);
    expect(Buffer.isBuffer(png)).toBe(true);
    expect(png.length).toBeGreaterThan(1000);
    // Verify PNG header: 0x89, 0x50, 0x4E, 0x47
    expect(png[0]).toBe(0x89);
    expect(png[1]).toBe(0x50);
    expect(png[2]).toBe(0x4e);
    expect(png[3]).toBe(0x47);
  });

  it("handles extra-long headlines and stats by scaling down gracefully", async () => {
    const longSpec: InfographicSpec = {
      archetype: "stat_callout",
      kicker: "FINANCIAL INTELLIGENCE",
      headline: "An Exceptionally Detailed and Lengthy Investigation Revealing Multilateral Regulatory Intervention Across Continental Markets",
      subheading: "Summary of assets unfrozen across continental clearing networks",
      statCallout: {
        primaryStat: "€41,450,000,000 Unfrozen",
        statLabel: "Total asset value preserved across institutional custodian accounts",
        secondaryStat: "€1.14m",
        secondaryLabel: "Target baseline",
      },
      sourceCitation: "Verified regulatory filing",
    };

    const svg = await renderInfographicToSvg(longSpec);
    expect(svg).toContain("<svg");
    expect(svg).toContain('width="1200"');
    const png = await renderInfographicToPng(longSpec);
    expect(png.length).toBeGreaterThan(1000);
  });

  it("loads and caches the TrueType font reliably", () => {
    const font = getInfographicFont();
    expect(Buffer.isBuffer(font)).toBe(true);
    expect(font.length).toBeGreaterThan(100000);
    // Successive load returns cached instance
    const font2 = getInfographicFont();
    expect(font2).toBe(font);
  });
});

describe("InfographicGeneratorNode", () => {
  it("synthesizes infographic_spec on successful model response", async () => {
    const mockSpec: InfographicSpec = {
      archetype: "kpi_flow",
      kicker: "MARKET IMPACT",
      headline: "Headline from Model",
      subheading: "Subheading from Model",
      sourceCitation: "Source: Verified report",
    };

    vi.spyOn(agentUtils, "invokeWithFallbacks").mockResolvedValue({
      structuredResponse: mockSpec,
    });

    const result = await InfographicGeneratorNode({
      thread_draft: ["Post 1 text", "Post 2 text"],
      research_context: "Research context text",
    });

    expect(result.infographic_spec).toEqual(mockSpec);
  });

  it("handles failure gracefully and returns undefined spec", async () => {
    vi.spyOn(agentUtils, "invokeWithFallbacks").mockRejectedValue(new Error("LLM failure"));

    const result = await InfographicGeneratorNode({
      thread_draft: ["Post 1"],
    });

    expect(result.infographic_spec).toBeUndefined();
  });
});
