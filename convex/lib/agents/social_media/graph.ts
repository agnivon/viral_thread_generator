"use node";

import { StateGraph, START, END } from "@langchain/langgraph";
import { VisualKeywordStrategistNode } from "../nodes.js";
import { checkpointSaver } from "../news/graph.js"; // Reuse the postgres saver
import { SocialMediaThreadFactoryState, SocialMediaThreadFactoryStateType } from "./state.js";
import { 
  PostScraperNode, 
  ContextResearcherNode,
  HookStrategistNode, 
  ThreadWriterNode, 
  CharacterValidatorNode, 
  ViralityCriticNode, 
  ManualHookSelectionNode
} from "./nodes.js";

const route_after_scraper = (state: SocialMediaThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.scraper || 0) >= 3) throw new Error("PostScraperNode failed after 3 retries");
    return "PostScraperNode";
  }
  return "ContextResearcherNode";
};

const route_after_researcher = (state: SocialMediaThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.researcher || 0) >= 3) throw new Error("ContextResearcherNode failed after 3 retries");
    return "ContextResearcherNode";
  }
  return "HookStrategistNode";
};

const route_after_hook = (state: SocialMediaThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.hook || 0) >= 3) throw new Error("HookStrategistNode failed after 3 retries");
    return "HookStrategistNode";
  }
  if (state.manual_hook_selection) {
    return "ManualHookSelectionNode";
  }
  return "ThreadWriterNode";
};

import { createRouteAfterValidator, createRouteAfterWriter } from "../sharedRouters.js";

const route_after_writer = createRouteAfterWriter("CharacterValidatorNode");
export const route_after_validator = createRouteAfterValidator("CharacterValidatorNode");

export const route_after_critic = (state: SocialMediaThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.critic || 0) >= 3) throw new Error("ViralityCriticNode failed after 3 retries");
    return "ViralityCriticNode";
  }
  const maxIterations = state.max_iterations ?? 3;
  if (state.is_approved === true || state.iterations >= maxIterations) {
    const hasFixDirectives = Boolean(
      state.post_critiques?.some((pc) => pc.fix_directive && pc.fix_directive.trim().length > 0)
    );
    if (state.iterations === 1 && hasFixDirectives && maxIterations > 1) {
      return "ThreadWriterNode";
    }
    return state.search_query_generation ? "VisualKeywordStrategistNode" : END;
  }
  return "ThreadWriterNode";
};

export const SocialMediaThreadFactoryGraph = new StateGraph(SocialMediaThreadFactoryState)
  .setNodeDefaults({ timeout: { idleTimeout: 2_00_000 } })
  .addNode("PostScraperNode", PostScraperNode)
  .addNode("ContextResearcherNode", ContextResearcherNode)
  .addNode("HookStrategistNode", HookStrategistNode)
  .addNode("ManualHookSelectionNode", ManualHookSelectionNode)
  .addNode("ThreadWriterNode", ThreadWriterNode)
  .addNode("CharacterValidatorNode", CharacterValidatorNode)
  .addNode("ViralityCriticNode", ViralityCriticNode)
  .addNode("VisualKeywordStrategistNode", VisualKeywordStrategistNode)
  .addEdge(START, "PostScraperNode")
  .addConditionalEdges("PostScraperNode", route_after_scraper, ["ContextResearcherNode", "PostScraperNode"])
  .addConditionalEdges("ContextResearcherNode", route_after_researcher, ["HookStrategistNode", "ContextResearcherNode"])
  .addConditionalEdges("HookStrategistNode", route_after_hook, ["ThreadWriterNode", "HookStrategistNode", "ManualHookSelectionNode"])
  .addEdge("ManualHookSelectionNode", "ThreadWriterNode")
  .addConditionalEdges("ThreadWriterNode", route_after_writer, ["CharacterValidatorNode", "ThreadWriterNode"])
  .addConditionalEdges("CharacterValidatorNode", route_after_validator, ["ViralityCriticNode", "ThreadWriterNode"])
  .addConditionalEdges("ViralityCriticNode", route_after_critic, [END, "ThreadWriterNode", "ViralityCriticNode", "VisualKeywordStrategistNode"])
  .addEdge("VisualKeywordStrategistNode", END)
  .compile({ checkpointer: checkpointSaver });
