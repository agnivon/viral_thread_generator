"use node";

import { StateGraph, START, END } from "@langchain/langgraph";
import { z } from "zod";
import {
  VectorHypothesizerNode,
  DialecticRetrievalNode,
  TensionExtractionNode,
  AngleFormulatorNode,
} from "./nodes.js";
import {
  DiscoveryAgentState,
  DiscoveryAgentStateType,
  DiscoveryAngleSchema,
} from "./state.js";

export const route_after_hypothesizer = (state: DiscoveryAgentStateType): string => {
  if (!state.parse_success) {
    if ((state.retries?.hypothesizer || 0) >= 3) {
      return "DialecticRetrievalNode";
    }
    return "VectorHypothesizerNode";
  }
  return "DialecticRetrievalNode";
};

export const route_after_retrieval = (state: DiscoveryAgentStateType): string => {
  if (!state.parse_success) {
    if ((state.retries?.retrieval || 0) >= 3) {
      return "TensionExtractionNode";
    }
    return "DialecticRetrievalNode";
  }
  return "TensionExtractionNode";
};

export const route_after_tension = (state: DiscoveryAgentStateType): string => {
  if (!state.parse_success) {
    if ((state.retries?.tension || 0) >= 3) {
      return "AngleFormulatorNode";
    }
    return "TensionExtractionNode";
  }

  // Cyclic loop-back if contradiction strength is weak and we haven't breached max iterations
  const maxScore = (state.extracted_tensions || []).reduce(
    (max, t) => Math.max(max, t.contradiction_score || 0),
    0
  );

  if (maxScore < 4 && (state.iterations || 0) < (state.max_iterations || 2)) {
    return "DialecticRetrievalNode";
  }

  return "AngleFormulatorNode";
};

export const route_after_formulator = (state: DiscoveryAgentStateType): string => {
  if (!state.parse_success) {
    if ((state.retries?.formulator || 0) >= 3) {
      return END;
    }
    return "AngleFormulatorNode";
  }
  return END;
};

export const DiscoveryAgentGraph = new StateGraph(DiscoveryAgentState)
  .setNodeDefaults({ timeout: { idleTimeout: 120_000 } })
  .addNode("VectorHypothesizerNode", VectorHypothesizerNode)
  .addNode("DialecticRetrievalNode", DialecticRetrievalNode)
  .addNode("TensionExtractionNode", TensionExtractionNode)
  .addNode("AngleFormulatorNode", AngleFormulatorNode)
  .addEdge(START, "VectorHypothesizerNode")
  .addConditionalEdges("VectorHypothesizerNode", route_after_hypothesizer, [
    "DialecticRetrievalNode",
    "VectorHypothesizerNode",
  ])
  .addConditionalEdges("DialecticRetrievalNode", route_after_retrieval, [
    "TensionExtractionNode",
    "DialecticRetrievalNode",
  ])
  .addConditionalEdges("TensionExtractionNode", route_after_tension, [
    "AngleFormulatorNode",
    "DialecticRetrievalNode",
    "TensionExtractionNode",
  ])
  .addConditionalEdges("AngleFormulatorNode", route_after_formulator, [
    END,
    "AngleFormulatorNode",
  ])
  .compile();

export interface DiscoverySubgraphResult {
  discovery_angles?: Array<z.infer<typeof DiscoveryAngleSchema>>;
  core_delta?: string;
  research_context?: string;
  research_dossier?: string;
  parse_success: boolean;
  retries: Record<string, number>;
}

/**
 * Shared runner for Deep Discovery subgraph invocations across URL and Topic pipelines.
 * Calls DiscoveryAgentGraph.invoke directly so test spies on DiscoveryAgentGraph continue to work.
 */
export async function runDiscoverySubgraph<TRetryKey extends string, TDossierField extends "research_context" | "research_dossier">(params: {
  nodeLabel: string;
  topic: string;
  rawMarkdown?: string;
  description?: string;
  guidance?: string;
  retries?: Record<string, number | undefined>;
  retryKey: TRetryKey;
  returnDossierField: TDossierField;
  signal?: AbortSignal;
}): Promise<DiscoverySubgraphResult> {
  const safeRetries: Record<string, number> = {};
  if (params.retries) {
    for (const [k, v] of Object.entries(params.retries)) {
      if (typeof v === "number") safeRetries[k] = v;
    }
  }

  try {
    console.log(`[${params.nodeLabel}] Running Deep Discovery Subgraph for topic: "${params.topic}"...`);

    const discoveryResult = await DiscoveryAgentGraph.invoke(
      {
        topic: params.topic,
        ...(params.rawMarkdown !== undefined ? { raw_markdown: params.rawMarkdown } : {}),
        ...(params.description !== undefined ? { description: params.description } : {}),
        guidance: params.guidance,
      },
      { signal: params.signal }
    );

    console.log(
      `[${params.nodeLabel}] Deep Discovery completed with ${discoveryResult.discovery_angles?.length || 0} angles.`
    );

    const dossierUpdate =
      params.returnDossierField === "research_dossier"
        ? { research_dossier: discoveryResult.research_dossier }
        : { research_context: discoveryResult.research_dossier };

    return {
      discovery_angles: discoveryResult.discovery_angles,
      core_delta: discoveryResult.core_delta,
      ...dossierUpdate,
      parse_success: true,
      retries: { ...safeRetries, [params.retryKey]: 0 },
    };
  } catch (err) {
    console.warn(`[${params.nodeLabel}] Discovery subgraph error:`, err);
    return {
      parse_success: false,
      retries: {
        ...safeRetries,
        [params.retryKey]: (safeRetries[params.retryKey] || 0) + 1,
      },
    };
  }
}
