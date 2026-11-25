"use node";

import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import {
  googleGemini35FlashLiteT02Key1,
  googleGemini35FlashLiteT02Key2,
  googleGemini31FlashLiteT02Key1,
  googleGemini31FlashLiteT02Key2,
  deepSeekFlashT02ReasoningNone,
  googleGemini4HydrogenT00Key1,
  googleGemini4HydrogenT00Key2,
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
import { isAccessDeniedOrGenericTitle } from "../../urlMetadata.js";

/**
 * Safely extracts a meaningful, descriptive topic candidate from a URL and/or raw markdown.
 * Avoids picking template section headers (e.g. "VIRAL METRICS, MILESTONES & MICRO-ASSETS")
 * and extracts the true semantic subject (e.g. from the URL slug or the source catalyst).
 */
function stripMarkdownSyntax(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__|\*|_|`)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateAtWordBoundary(text: string, maxLen = 150): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const sliced = trimmed.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(" ");
  return lastSpace >= Math.floor(maxLen * 0.6) ? sliced.slice(0, lastSpace).trim() : sliced.trim();
}

function isBoilerplateOrBlockedTopicCandidate(text: string, url?: string): boolean {
  if (
    /VIRAL METRICS|NEWSJACKING MATRIX|AGGREGATION CORE|TRANSFORMATION TIMELINE|HUMAN MOMENT|THE RECEIPTS|CATALYST & ASYMMETRY|CRITICAL GUARDRAILS/i.test(
      text
    )
  ) {
    return true;
  }
  if (
    /^(?:top stories|trending(?:\s+now)?|recommended(?:\s+(?:stories|videos|for you))?|related(?:\s+(?:articles|stories|news))?|more\s+(?:from\b|stories|news)|latest\s+news|popular(?:\s+stories)?|read\s+next|up\s+next)\b/i.test(
      text
    )
  ) {
    return true;
  }
  return isAccessDeniedOrGenericTitle(text, url || "");
}

function extractUrlSlugTopic(url?: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = decodeURIComponent(segments[i]);
      const stripped = seg
        .replace(/\.(?:html?|php|aspx?)$/i, "")
        .replace(/[-_](?:(?=.*\d)[0-9a-f]{6,}|[0-9a-f]{10,})$/i, "");
      if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(stripped) || /^\d+$/.test(stripped)) {
        continue;
      }
      if ((stripped.includes("-") || stripped.includes("_")) && stripped.length > 8) {
        const words = stripped.split(/[-_]+/).filter(Boolean);
        if (words.length >= 2) {
          return truncateAtWordBoundary(words.join(" "), 150);
        }
      }
    }
  } catch {
    // Ignore URL parse error
  }
  return "";
}

export function extractDiscoveryTopic(
  url?: string,
  raw_markdown?: string,
  fallback = "Technology Topic",
  articleTitle?: string
): string {
  // 1. Prefer verified article title/ogTitle when non-generic
  if (articleTitle) {
    const cleanTitle = stripMarkdownSyntax(articleTitle);
    if (cleanTitle.length > 8 && !isBoilerplateOrBlockedTopicCandidate(cleanTitle, url)) {
      return truncateAtWordBoundary(cleanTitle, 150);
    }
  }

  const slugTopic = extractUrlSlugTopic(url);

  // 2. Try looking in raw_markdown for an explicit Catalyst line or non-template heading first
  if (raw_markdown) {
    const lines = raw_markdown.split("\n");
    const catalystLine = lines.find((l) => /^[-*#\s]*\[?\s*(?:the\s+)?catalyst\s*:/i.test(l.trim()));
    if (catalystLine) {
      const cleaned = stripMarkdownSyntax(
        catalystLine
          .replace(/^[-*#\s]*\[?\s*(?:the\s+)?catalyst\s*:\s*/i, "")
          .replace(/[\])}]+$/, "")
      );
      const isRoundupCatalyst = /(?:top stories|daily roundup|news digest|multiple stories)/i.test(cleaned);
      if (
        cleaned.length > 8 &&
        !isRoundupCatalyst &&
        !isBoilerplateOrBlockedTopicCandidate(cleaned, url)
      ) {
        return truncateAtWordBoundary(cleaned, 150);
      }
    }

    // Check for an explicit non-template markdown heading (e.g. "# Intel Core Ultra 200S Launch")
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^#+\s+/.test(trimmed)) {
        const heading = stripMarkdownSyntax(trimmed.replace(/^#+\s*/, ""));
        if (
          heading.length > 8 &&
          !/^\d+\./.test(heading) &&
          !isBoilerplateOrBlockedTopicCandidate(heading, url)
        ) {
          return truncateAtWordBoundary(heading, 150);
        }
      }
    }
  }

  // 3. Try URL slug if it contains a meaningful headline-style slug
  if (slugTopic) {
    return slugTopic;
  }

  // 4. Fallback to first non-template, non-blocked bullet point or sentence in raw_markdown
  if (raw_markdown) {
    const lines = raw_markdown.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^[-*]\s+/.test(trimmed)) {
        const bullet = stripMarkdownSyntax(
          trimmed.replace(/^[-*]\s*/, "").replace(/^\[.*?\]\s*/, "")
        );
        if (bullet.length > 15 && !isBoilerplateOrBlockedTopicCandidate(bullet, url)) {
          return truncateAtWordBoundary(bullet, 150);
        }
      } else if (!trimmed.startsWith("#")) {
        const cleanedLine = stripMarkdownSyntax(trimmed);
        if (cleanedLine.length > 15 && !isBoilerplateOrBlockedTopicCandidate(cleanedLine, url)) {
          return truncateAtWordBoundary(cleanedLine, 150);
        }
      }
    }
  }

  // 5. Fallback to URL or default
  return url || fallback;
}

// ─────────────────────────────────────────────────────────────
// Node 1: Vector Hypothesizer Node
// ─────────────────────────────────────────────────────────────

const vectorHypothesizerSchema = z.object({
  search_vectors: z.array(DiscoverySearchVectorSchema).min(3).max(5),
});

// Direct `withStructuredOutput`: `functionCalling` is safe for thinking Flash-Lite (`thinkingLevel: "medium"`) and non-thinking DeepSeek (`ReasoningNone`).
export const vectorHypothesizerModels = [
  withTimeout(
    googleGemini35FlashLiteT02Key1.withStructuredOutput(vectorHypothesizerSchema, {
      name: "vector_hypothesizer",
      method: "functionCalling",
    }),
    45000
  ),
  withTimeout(
    googleGemini35FlashLiteT02Key2.withStructuredOutput(vectorHypothesizerSchema, {
      name: "vector_hypothesizer",
      method: "functionCalling",
    }),
    45000
  ),
  withTimeout(
    googleGemini31FlashLiteT02Key1.withStructuredOutput(vectorHypothesizerSchema, {
      name: "vector_hypothesizer",
      method: "functionCalling",
    }),
    45000
  ),
  withTimeout(
    googleGemini31FlashLiteT02Key2.withStructuredOutput(vectorHypothesizerSchema, {
      name: "vector_hypothesizer",
      method: "functionCalling",
    }),
    45000
  ),
  withTimeout(
    deepSeekFlashT02ReasoningNone.withStructuredOutput(vectorHypothesizerSchema, {
      name: "vector_hypothesizer",
      method: "functionCalling",
    }),
    45000
  ),
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

  // Ensure default vectors if model omitted any
  let finalVectors: DiscoverySearchVector[] = [];
  if (parse_success && result?.search_vectors) {
    finalVectors = result.search_vectors;
  } else {
    // Deterministic domain-neutral fallback search pairs
    const topic = state.topic || "subject";
    finalVectors = [
      {
        vector: "structural_dependencies",
        vector_name: "Underlying Economics & Dependencies",
        queries: [
          `${topic} underlying infrastructure economics dependencies`,
          `${topic} key stakeholders incentives business model`,
        ],
      },
      {
        vector: "execution_vs_narrative",
        vector_name: "Execution Reality vs. Public Narrative",
        queries: [
          `${topic} independent analysis criticism limitations`,
          `${topic} official claims verification methodology`,
        ],
      },
      {
        vector: "historical_precedent",
        vector_name: "Historical Precedent & Origin",
        queries: [
          `${topic} historical precedent prior developments comparison`,
          `${topic} timeline origins background context`,
        ],
      },
      {
        vector: "tradeoffs_and_constraints",
        vector_name: "Operational & Technical Trade-offs",
        queries: [
          `${topic} trade-offs bottlenecks reliability constraints`,
          `${topic} independent benchmarks real-world impact`,
        ],
      },
      {
        vector: "regulatory_market_impact",
        vector_name: "Market, Competitive & Regulatory Impact",
        queries: [
          `${topic} market reaction competitive impact analysis`,
          `${topic} policy regulation compliance consequences`,
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

function buildEmptyRetrievalFallback(
  vectors: DiscoverySearchVector[],
  topic: string
) {
  return (vectors || []).map((sv) => ({
    vector: sv.vector,
    query: sv.queries?.[0] || topic,
    title: `${sv.vector_name} (No External Results)`,
    snippet: `No external search results were retrieved for "${topic}" under "${sv.vector_name}". Rely strictly on the primary source text and avoid fabricating external facts or statistics.`,
    source: "empty_retrieval_notice",
  }));
}

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
      parse_success = false;
      evidence = buildEmptyRetrievalFallback(state.search_vectors, state.topic);
    }
  } catch (err) {
    console.warn("[DialecticRetrievalNode] Retrieval error:", err);
    parse_success = false;
    if (evidence.length === 0) {
      evidence = buildEmptyRetrievalFallback(state.search_vectors || [], state.topic);
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

/**
 * Direct `withStructuredOutput` reasoning cascade:
 * - Thinking Gemini (`thinkingLevel: "high"`) MUST use `method: "functionCalling"` (`jsonSchema` concatenates `{ thought: true }` blocks).
 * - DeepSeek fallback uses non-thinking `deepSeekFlashT00ReasoningNone` because `functionCalling` forces named `tool_choice`,
 *   which DeepSeek rejects under thinking mode (thinking DeepSeek requires `method: "jsonMode"` instead).
 */
function createDiscoveryReasoningCascade<T extends z.ZodTypeAny>(schema: T, name: string) {
  return [
    withTimeout(
      googleGemini4HydrogenT00Key1.withStructuredOutput(schema, {
        name,
        method: "functionCalling",
      }),
      60000
    ),
    withTimeout(
      googleGemini4HydrogenT00Key2.withStructuredOutput(schema, {
        name,
        method: "functionCalling",
      }),
      60000
    ),
    withTimeout(
      googleGemini38FlashT00Key1.withStructuredOutput(schema, {
        name,
        method: "functionCalling",
      }),
      60000
    ),
    withTimeout(
      googleGemini38FlashT00Key2.withStructuredOutput(schema, {
        name,
        method: "functionCalling",
      }),
      60000
    ),
    withTimeout(
      googleGemini36FlashT00Key1.withStructuredOutput(schema, {
        name,
        method: "functionCalling",
      }),
      75000
    ),
    withTimeout(
      googleGemini36FlashT00Key2.withStructuredOutput(schema, {
        name,
        method: "functionCalling",
      }),
      75000
    ),
    withTimeout(
      deepSeekFlashT00ReasoningNone.withStructuredOutput(schema, {
        name,
        method: "functionCalling",
      }),
      60000
    ),
  ];
}

const tensionExtractionSchema = z.object({
  extracted_tensions: z.array(ExtractedTensionSchema).min(1),
});

export const tensionExtractionModels = createDiscoveryReasoningCascade(
  tensionExtractionSchema,
  "tension_extraction"
);

export const TensionExtractionNode = async (
  state: DiscoveryAgentStateType,
  config?: RunnableConfig
) => {
  let parse_success = true;
  let finalResult: z.infer<typeof tensionExtractionSchema> | undefined;

  try {
    const formattedEvidence = (state.retrieval_evidence || [])
      .map((e, idx) => `[Evidence ${idx + 1}] Vector: ${e.vector}\nSource: ${e.source || e.title || "Web"}\nSnippet: ${e.snippet}\n${e.full_text ? `Full Excerpt: ${e.full_text.slice(0, 600)}\n` : ""}`)
      .join("\n---\n");

    const userPrompt = `<TOPIC>\n${state.topic}\n</TOPIC>\n\n<FORENSIC_EVIDENCE>\n${formattedEvidence || "No external search evidence retrieved."}\n</FORENSIC_EVIDENCE>${state.guidance ? `\n\n<GUIDANCE>\n${state.guidance}\n</GUIDANCE>` : ""}`;

    const result = await invokeWithFallbacks(
      tensionExtractionModels,
      [
        { role: "system", content: TENSION_EXTRACTION_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { ...config, timeout: 75000 }
    );

    const rawData = (result && typeof result === "object" && "structuredResponse" in result)
      ? (result as Record<string, unknown>).structuredResponse
      : result;
    finalResult = rawData as z.infer<typeof tensionExtractionSchema> | undefined;

    if (!finalResult || !Array.isArray(finalResult.extracted_tensions) || finalResult.extracted_tensions.length === 0) {
      parse_success = false;
    }
  } catch (err) {
    console.warn("[TensionExtractionNode] Extraction error:", err);
    parse_success = false;
  }

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

export const angleFormulatorModels = createDiscoveryReasoningCascade(
  angleFormulatorSchema,
  "angle_formulator"
);

export const AngleFormulatorNode = async (
  state: DiscoveryAgentStateType,
  config?: RunnableConfig
) => {
  let parse_success = true;
  let finalResult: z.infer<typeof angleFormulatorSchema> | undefined;

  try {
    const tensionsContext = JSON.stringify(state.extracted_tensions, null, 2);
    const result = await invokeWithFallbacks(
      angleFormulatorModels,
      [
        { role: "system", content: ANGLE_FORMULATOR_PROMPT },
        {
          role: "user",
          content: `<TOPIC>\n${state.topic}\n</TOPIC>\n\n<EXTRACTED_TENSIONS>\n${tensionsContext}\n</EXTRACTED_TENSIONS>${state.guidance ? `\n\n<GUIDANCE>\n${state.guidance}\n</GUIDANCE>` : ""}`,
        },
      ],
      { ...config, timeout: 75000 }
    );

    const rawData = (result && typeof result === "object" && "structuredResponse" in result)
      ? (result as Record<string, unknown>).structuredResponse
      : result;
    finalResult = rawData as z.infer<typeof angleFormulatorSchema> | undefined;

    if (!finalResult || !Array.isArray(finalResult.discovery_angles) || finalResult.discovery_angles.length === 0) {
      parse_success = false;
    }
  } catch (err) {
    console.warn("[AngleFormulatorNode] Formulation error:", err);
    parse_success = false;
  }

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
