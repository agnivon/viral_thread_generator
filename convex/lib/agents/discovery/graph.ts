"use node";

import { StateGraph, START, END } from "@langchain/langgraph";
import {
  VectorHypothesizerNode,
  DialecticRetrievalNode,
  TensionExtractionNode,
  AngleFormulatorNode,
} from "./nodes.js";
import { DiscoveryAgentState, DiscoveryAgentStateType } from "./state.js";

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
