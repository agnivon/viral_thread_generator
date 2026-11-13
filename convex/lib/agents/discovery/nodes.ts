"use node";

import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import {
  googleGemini35FlashLiteT02Key1,
  googleGemini35FlashLiteT02Key2,
  googleGemini31FlashLiteT02Key1,
  googleGemini31FlashLiteT02Key2,
  deepSeekFlashT02ReasoningNone,
  googleGemini38FlashT00Key1,
  googleGemini38FlashT00Key2,
  googleGemini36FlashT00Key1,
  googleGemini36FlashT00Key2,
  deepSeekFlashT00ReasoningNone,
} from "../models.js";
import { invokeWithFallbacks, normalizeResearchDossier, withTimeout } from "../utils.js";
import {
  VECTOR_HYPOTHESIZER_PROMPT,
  TENSION_EXTRACTION_PROMPT,
  ANGLE_FORMULATOR_PROMPT,
} from "./prompts.js";
import { executeDialecticRetrieval } from "./retrieval.js";
import {
  DiscoverySearchVectorSchema,
  ExtractedTensionSchema,
  DiscoveryAngleSchema,
} from "./state.js";
import type {
  DiscoveryAgentStateType,
  DiscoverySearchVector,
} from "./state.js";

/**
 * Safely extracts a meaningful, descriptive topic candidate from a URL and/or raw markdown.
 * Avoids picking template section headers (e.g. "VIRAL METRICS, MILESTONES & MICRO-ASSETS")
 * and extracts the true semantic subject (e.g. from the URL slug or the source catalyst).
 */
export function extractDiscoveryTopic(
  url?: string,
  raw_markdown?: string,
  fallback = "Technology Topic"
): string {
  // 1. Try looking in raw_markdown for an explicit Catalyst line or non-template heading first
  if (raw_markdown) {
    const lines = raw_markdown.split("\n");
    // Check if there is an explicit Catalyst line (e.g. "- [The Catalyst: ...]" or "- Catalyst: ...")
    const catalystLine = lines.find((l) => /^[-*#\s]*\[?\s*(?:the\s+)?catalyst\s*:/i.test(l.trim()));
    if (catalystLine) {
      const cleaned = catalystLine
        .replace(/^[-*#\s]*\[?\s*(?:the\s+)?catalyst\s*:\s*/i, "")
        .replace(/[\])}]+$/, "")
        .trim();
      if (cleaned.length > 8) {
        return cleaned.slice(0, 150);
      }
    }

    // Check for an explicit non-template markdown heading (e.g. "# Intel Core Ultra 200S Launch")
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (
        /VIRAL METRICS|NEWSJACKING MATRIX|AGGREGATION CORE|TRANSFORMATION TIMELINE|HUMAN MOMENT|THE RECEIPTS|CATALYST & ASYMMETRY|CRITICAL GUARDRAILS/i.test(
          trimmed
        )
      ) {
        continue;
      }
      if (/^#+\s+/.test(trimmed)) {
        const heading = trimmed.replace(/^#+\s*/, "").trim();
        // Skip numbered sections like "1. ..." or "2. ..."
        if (heading.length > 8 && !/^\d+\./.test(heading)) {
          return heading.slice(0, 150);
        }
      }
    }
  }

  // 2. Try URL slug if it contains a meaningful headline-style slug
  if (url) {
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.split("/").filter(Boolean);
      for (let i = segments.length - 1; i >= 0; i--) {
        const seg = decodeURIComponent(segments[i]);
        // Strip trailing .html or .htm
        const stripped = seg.replace(/\.html?$/i, "");
        // Ignore date segments like 2026-09-17 or simple numeric IDs
        if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(stripped) || /^\d+$/.test(stripped)) {
          continue;
        }
        if (stripped.includes("-") && stripped.length > 8) {
          const words = stripped.split("-").filter(Boolean);
          if (words.length >= 2) {
            return words.join(" ").slice(0, 150).trim();
          }
        }
      }
    } catch {
      // Ignore URL parse error
    }
  }

  // 3. Fallback to first non-template bullet point or sentence in raw_markdown
  if (raw_markdown) {
    const lines = raw_markdown.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (
        /VIRAL METRICS|NEWSJACKING MATRIX|AGGREGATION CORE|TRANSFORMATION TIMELINE|HUMAN MOMENT|THE RECEIPTS|CATALYST & ASYMMETRY|CRITICAL GUARDRAILS/i.test(
          trimmed
        )
      ) {
        continue;
      }
      if (/^[-*]\s+/.test(trimmed)) {
        const bullet = trimmed
          .replace(/^[-*]\s*/, "")
          .replace(/^\[.*?\]\s*/, "")
          .trim();
        if (bullet.length > 15) {
          return bullet.slice(0, 150);
        }
      } else if (!trimmed.startsWith("#") && trimmed.length > 15) {
        return trimmed.slice(0, 150);
      }
    }
  }

  // 4. Fallback to URL or default
  return url || fallback;
}

// ─────────────────────────────────────────────────────────────
// Node 1: Vector Hypothesizer Node
// ─────────────────────────────────────────────────────────────

const vectorHypothesizerSchema = z.object({
  search_vectors: z.array(DiscoverySearchVectorSchema).min(3).max(5),
});

const vectorHypothesizerModels = [
  googleGemini35FlashLiteT02Key1.withStructuredOutput(vectorHypothesizerSchema, {
    name: "vector_hypothesizer",
    method: "functionCalling",
  }),
  withTimeout(
    googleGemini35FlashLiteT02Key2.withStructuredOutput(vectorHypothesizerSchema, {
      name: "vector_hypothesizer",
      method: "functionCalling",
    }),
    45000
  ),
  googleGemini31FlashLiteT02Key1.withStructuredOutput(vectorHypothesizerSchema, {
    name: "vector_hypothesizer",
    method: "functionCalling",
  }),
  withTimeout(
    googleGemini31FlashLiteT02Key2.withStructuredOutput(vectorHypothesizerSchema, {
      name: "vector_hypothesizer",
      method: "functionCalling",
    }),
    45000
  ),
  deepSeekFlashT02ReasoningNone.withStructuredOutput(vectorHypothesizerSchema, {
    name: "vector_hypothesizer",
    method: "functionCalling",
  }),
];

export const VectorHypothesizerNode = async (
  state: DiscoveryAgentStateType,
  config?: RunnableConfig
) => {
  let result;
  let parse_success = true;

  try {
    const descriptionContext = state.description
      ? `\n\n<DESCRIPTION>\n${state.description}\n</DESCRIPTION>`
      : "";
    const seedClaimsContext = state.seed_claims
      ? `\n\n<SEED_CLAIMS>\n${state.seed_claims}\n</SEED_CLAIMS>`
      : "";
    const rawMarkdownContext = state.raw_markdown
      ? `\n\n<SOURCE_TEXT>\n${state.raw_markdown.slice(0, 3000)}\n</SOURCE_TEXT>`
      : "";
    const guidanceContext = state.guidance
      ? `\n\n<GUIDANCE>\n${state.guidance}\n</GUIDANCE>`
      : "";

    result = await invokeWithFallbacks(
      vectorHypothesizerModels,
      [
        { role: "system", content: VECTOR_HYPOTHESIZER_PROMPT },
        {
          role: "user",
          content: `<TOPIC>\n${state.topic}\n</TOPIC>${seedClaimsContext}${descriptionContext}${rawMarkdownContext}${guidanceContext}`,
        },
      ],
      { ...config, timeout: 45000 }
    );

    if (!result || !Array.isArray(result.search_vectors) || result.search_vectors.length === 0) {
      parse_success = false;
    }
  } catch (err) {
    console.warn("[VectorHypothesizerNode] Invocation failed:", err);
    parse_success = false;
  }

  // Ensure default vectors if model omitted any of the 5
  let finalVectors: DiscoverySearchVector[] = [];
  if (parse_success && result?.search_vectors) {
    finalVectors = result.search_vectors;
  } else {
    // Deterministic fallback search pairs
    const topic = state.topic || "tech product";
    finalVectors = [
      {
        vector: "bom_paradox",
        vector_name: "The BOM Paradox (Symbiotic Rivals)",
        queries: [
          `${topic} key component suppliers Bill of Materials teardown`,
          `${topic} competitor supply contracts margins`,
        ],
      },
      {
        vector: "production_stagecraft",
        vector_name: "Production Stagecraft & PR Mitigation",
        queries: [
          `${topic} live demo failure glitch prototype delay`,
          `${topic} staged presentation unaddressed bugs`,
        ],
      },
      {
        vector: "supply_chain_arbitrage",
        vector_name: "Supply Chain Arbitrage & Reverse Feature Flow",
        queries: [
          `${topic} patent filing Shenzhen ODM Chinese smartphone first introduced`,
          `${topic} supply chain component origin white-label`,
        ],
      },
      {
        vector: "engineering_tradeoffs",
        vector_name: "Engineering Trade-offs vs. Marketing Framing",
        queries: [
          `${topic} sustained benchmark thermal throttling battery compromise`,
          `${topic} hardware trade-offs engineering limitations`,
        ],
      },
      {
        vector: "regulatory_asymmetry",
        vector_name: "Regulatory & Litigation Asymmetry",
        queries: [
          `${topic} antitrust compliance mandate court order EU regulation`,
          `${topic} regulatory fine compliance docket patent dispute`,
        ],
      },
    ];
  }

  return {
    search_vectors: finalVectors,
    parse_success,
    retries: {
      ...(state.retries || {}),
      hypothesizer: parse_success ? 0 : (state.retries?.hypothesizer || 0) + 1,
    },
  };
};

// ─────────────────────────────────────────────────────────────
// Node 2: Dialectic Retrieval Node
// ─────────────────────────────────────────────────────────────

export const DialecticRetrievalNode = async (
  state: DiscoveryAgentStateType,
  _config?: RunnableConfig
) => {
  let evidence: Awaited<ReturnType<typeof executeDialecticRetrieval>> = [];
  let parse_success = true;

  try {
    evidence = await executeDialecticRetrieval({
      vectors: state.search_vectors,
      maxQueriesPerVector: 2,
      timeoutMs: 25000,
    });

    if (evidence.length === 0) {
      // Create fallback baseline evidence so downstream nodes proceed smoothly
      evidence = state.search_vectors.map((sv) => ({
        vector: sv.vector,
        query: sv.queries[0] || state.topic,
        title: `${sv.vector_name} Context`,
        snippet: `Investigation into ${state.topic} regarding ${sv.vector_name}. Official narratives frame this as an innovation breakthrough, while engineering and supply chain realities dictate component tradeoffs and supplier interdependencies.`,
        source: "forensic_baseline",
      }));
    }
  } catch (err) {
    console.warn("[DialecticRetrievalNode] Retrieval error:", err);
    parse_success = false;
    if (evidence.length === 0) {
      evidence = (state.search_vectors || []).map((sv) => ({
        vector: sv.vector,
        query: sv.queries?.[0] || state.topic,
        title: `${sv.vector_name} Context`,
        snippet: `Investigation into ${state.topic} regarding ${sv.vector_name}. Official narratives frame this as an innovation breakthrough, while engineering and supply chain realities dictate component tradeoffs and supplier interdependencies.`,
        source: "forensic_baseline",
      }));
    }
  }

  return {
    retrieval_evidence: evidence,
    parse_success,
    retries: {
      ...(state.retries || {}),
      retrieval: parse_success ? 0 : (state.retries?.retrieval || 0) + 1,
    },
  };
};

// ─────────────────────────────────────────────────────────────
// Node 3: Tension Extraction Node
// ─────────────────────────────────────────────────────────────

const tensionExtractionSchema = z.object({
  extracted_tensions: z.array(ExtractedTensionSchema).min(1),
});

const tensionExtractionModels = [
  googleGemini38FlashT00Key1.withStructuredOutput(tensionExtractionSchema, {
    name: "tension_extraction",
    method: "functionCalling",
  }),
  withTimeout(
    googleGemini38FlashT00Key2.withStructuredOutput(tensionExtractionSchema, {
      name: "tension_extraction",
      method: "functionCalling",
    }),
    45000
  ),
  googleGemini36FlashT00Key1.withStructuredOutput(tensionExtractionSchema, {
    name: "tension_extraction",
    method: "functionCalling",
  }),
  withTimeout(
    googleGemini36FlashT00Key2.withStructuredOutput(tensionExtractionSchema, {
      name: "tension_extraction",
      method: "functionCalling",
    }),
    45000
  ),
  deepSeekFlashT00ReasoningNone.withStructuredOutput(tensionExtractionSchema, {
    name: "tension_extraction",
    method: "functionCalling",
  }),
];

export const TensionExtractionNode = async (
  state: DiscoveryAgentStateType,
  config?: RunnableConfig
) => {
  let result;
  let parse_success = true;

  try {
    const formattedEvidence = (state.retrieval_evidence || [])
      .map((e, idx) => `[Evidence ${idx + 1}] Vector: ${e.vector}\nSource: ${e.source || e.title || "Web"}\nSnippet: ${e.snippet}\n${e.full_text ? `Full Excerpt: ${e.full_text.slice(0, 600)}\n` : ""}`)
      .join("\n---\n");

    const userPrompt = `<TOPIC>\n${state.topic}\n</TOPIC>\n\n<FORENSIC_EVIDENCE>\n${formattedEvidence || "No external search evidence retrieved."}\n</FORENSIC_EVIDENCE>${state.guidance ? `\n\n<GUIDANCE>\n${state.guidance}\n</GUIDANCE>` : ""}`;

    result = await invokeWithFallbacks(
      tensionExtractionModels,
      [
        { role: "system", content: TENSION_EXTRACTION_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { ...config, timeout: 60000 }
    );

    const rawData = (result && typeof result === "object" && "structuredResponse" in result)
      ? (result as Record<string, unknown>).structuredResponse
      : result;
    const finalResult = rawData as z.infer<typeof tensionExtractionSchema> | undefined;

    if (!finalResult || !Array.isArray(finalResult.extracted_tensions) || finalResult.extracted_tensions.length === 0) {
      parse_success = false;
    }
  } catch (err) {
    console.warn("[TensionExtractionNode] Extraction error:", err);
    parse_success = false;
  }

  const rawData = (result && typeof result === "object" && "structuredResponse" in result)
    ? (result as Record<string, unknown>).structuredResponse
    : result;
  const finalResult = rawData as z.infer<typeof tensionExtractionSchema> | undefined;

  const finalTensions = parse_success && finalResult?.extracted_tensions
    ? finalResult.extracted_tensions
    : [
        {
          vector: "Engineering Compromise",
          surface_narrative: `Headline metrics highlight peak performance of ${state.topic}.`,
          forensic_reality: `Physical thermal dissipation and component packaging enforce sustained constraints under load.`,
          core_tension: `Performance targets clash with physical thermal laws and sustained chassis constraints.`,
          primary_proof_sources: ["Hardware Architecture & Teardown Analysis"],
          contradiction_score: 8,
        },
      ];

  return {
    extracted_tensions: finalTensions,
    parse_success,
    iterations: (state.iterations || 0) + 1,
    retries: {
      ...(state.retries || {}),
      tension: parse_success ? 0 : (state.retries?.tension || 0) + 1,
    },
  };
};

// ─────────────────────────────────────────────────────────────
// Node 4: Angle Formulator Node
// ─────────────────────────────────────────────────────────────

const angleFormulatorSchema = z.object({
  topic: z.string(),
  discovery_angles: z.array(DiscoveryAngleSchema).min(1),
  core_delta: z.string().min(1, "Must articulate a core delta"),
  research_dossier: z.string().min(1, "Must synthesize research dossier"),
});

const angleFormulatorModels = [
  googleGemini38FlashT00Key1.withStructuredOutput(angleFormulatorSchema, {
    name: "angle_formulator",
    method: "functionCalling",
  }),
  withTimeout(
    googleGemini38FlashT00Key2.withStructuredOutput(angleFormulatorSchema, {
      name: "angle_formulator",
      method: "functionCalling",
    }),
    45000
  ),
  googleGemini36FlashT00Key1.withStructuredOutput(angleFormulatorSchema, {
    name: "angle_formulator",
    method: "functionCalling",
  }),
  withTimeout(
    googleGemini36FlashT00Key2.withStructuredOutput(angleFormulatorSchema, {
      name: "angle_formulator",
      method: "functionCalling",
    }),
    45000
  ),
  deepSeekFlashT00ReasoningNone.withStructuredOutput(angleFormulatorSchema, {
    name: "angle_formulator",
    method: "functionCalling",
  }),
];

export const AngleFormulatorNode = async (
  state: DiscoveryAgentStateType,
  config?: RunnableConfig
) => {
  let result;
  let parse_success = true;

  try {
    const tensionsContext = JSON.stringify(state.extracted_tensions, null, 2);
    result = await invokeWithFallbacks(
      angleFormulatorModels,
      [
        { role: "system", content: ANGLE_FORMULATOR_PROMPT },
        {
          role: "user",
          content: `<TOPIC>\n${state.topic}\n</TOPIC>\n\n<EXTRACTED_TENSIONS>\n${tensionsContext}\n</EXTRACTED_TENSIONS>${state.guidance ? `\n\n<GUIDANCE>\n${state.guidance}\n</GUIDANCE>` : ""}`,
        },
      ],
      { ...config, timeout: 60000 }
    );

    const rawData = (result && typeof result === "object" && "structuredResponse" in result)
      ? (result as Record<string, unknown>).structuredResponse
      : result;
    const finalResult = rawData as z.infer<typeof angleFormulatorSchema> | undefined;

    if (!finalResult || !Array.isArray(finalResult.discovery_angles) || finalResult.discovery_angles.length === 0) {
      parse_success = false;
    }
  } catch (err) {
    console.warn("[AngleFormulatorNode] Formulation error:", err);
    parse_success = false;
  }

  const rawData = (result && typeof result === "object" && "structuredResponse" in result)
    ? (result as Record<string, unknown>).structuredResponse
    : result;
  const finalResult = rawData as z.infer<typeof angleFormulatorSchema> | undefined;

  const discovery_angles = parse_success && finalResult?.discovery_angles
    ? finalResult.discovery_angles
    : (state.extracted_tensions || []).map((t) => ({
        vector: t.vector,
        surface_narrative: t.surface_narrative,
        forensic_reality: t.forensic_reality,
        core_tension: t.core_tension,
        primary_proof_sources: t.primary_proof_sources,
      }));

  const core_delta = parse_success && finalResult?.core_delta
    ? finalResult.core_delta
    : discovery_angles[0]?.core_tension || `The core tension behind ${state.topic}.`;

  const research_dossier = parse_success && finalResult?.research_dossier
    ? normalizeResearchDossier(finalResult.research_dossier)
    : `# FORENSIC DISCOVERY DOSSIER: ${state.topic}\n\n## 1. THE CORE DELTA\n${core_delta}\n\n## 2. DISCOVERY ANGLES\n` +
      discovery_angles
        .map(
          (a) =>
            `### ${a.vector}\n- **Surface Narrative:** ${a.surface_narrative}\n- **Forensic Reality:** ${a.forensic_reality}\n- **Core Tension:** ${a.core_tension}\n- **Proof Sources:** ${a.primary_proof_sources.join(", ")}`
        )
        .join("\n\n");

  return {
    topic: state.topic,
    discovery_angles,
    core_delta,
    research_dossier,
    parse_success,
    retries: {
      ...(state.retries || {}),
      formulator: parse_success ? 0 : (state.retries?.formulator || 0) + 1,
    },
  };
};
