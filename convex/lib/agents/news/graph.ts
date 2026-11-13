"use node";

import { StateGraph, START, END } from "@langchain/langgraph";
import { VisualKeywordStrategistNode } from "../nodes.js";
import { InfographicGeneratorNode } from "../../infographics/nodes.js";
import { pool, checkpointSaver } from "../checkpointer.js";
import { NewsThreadFactoryState, NewsThreadFactoryStateType } from "./state.js";
import { 
  ScraperNode, 
  NewsDiscoveryNode,
  ContextResearcherNode, 
  HookStrategistNode, 
  ThreadWriterNode, 
  CharacterValidatorNode, 
  ViralityCriticNode, 
  ManualHookSelectionNode 
} from "./nodes.js";

export { pool, checkpointSaver };

const route_after_scraper = (state: NewsThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.scraper || 0) >= 3) throw new Error("ScraperNode failed after 3 retries");
    return "ScraperNode";
  }
  if (state.discovery_agent) {
    return "NewsDiscoveryNode";
  }
  return "ContextResearcherNode";
};

const route_after_discovery = (state: NewsThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.researcher || 0) >= 3) return "HookStrategistNode";
    return "NewsDiscoveryNode";
  }
  return "HookStrategistNode";
};

const route_after_researcher = (state: NewsThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.researcher || 0) >= 3) throw new Error("ContextResearcherNode failed after 3 retries");
    return "ContextResearcherNode";
  }
  return "HookStrategistNode";
};

const route_after_hook = (state: NewsThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.hook || 0) >= 3) throw new Error("HookStrategistNode failed after 3 retries");
    return "HookStrategistNode";
  }
  if (state.manual_hook_selection) {
    return "ManualHookSelectionNode";
  }
  return "ThreadWriterNode";
};

import { createRouteAfterValidator, createRouteAfterWriter, createRouteAfterCritic } from "../sharedRouters.js";

const route_after_writer = createRouteAfterWriter("CharacterValidatorNode");
export const route_after_validator = createRouteAfterValidator("CharacterValidatorNode");
export const route_after_critic = createRouteAfterCritic("ViralityCriticNode");


export const NewsThreadFactoryGraph = new StateGraph(NewsThreadFactoryState)
  .setNodeDefaults({ timeout: { idleTimeout: 2_00_000 } })
  .addNode("ScraperNode", ScraperNode)
  .addNode("NewsDiscoveryNode", NewsDiscoveryNode)
  .addNode("ContextResearcherNode", ContextResearcherNode)
  .addNode("HookStrategistNode", HookStrategistNode)
  .addNode("ManualHookSelectionNode", ManualHookSelectionNode)
  .addNode("ThreadWriterNode", ThreadWriterNode)
  .addNode("CharacterValidatorNode", CharacterValidatorNode)
  .addNode("ViralityCriticNode", ViralityCriticNode)
  .addNode("VisualKeywordStrategistNode", VisualKeywordStrategistNode)
  .addNode("InfographicGeneratorNode", InfographicGeneratorNode)
  .addEdge(START, "ScraperNode")
  .addConditionalEdges("ScraperNode", route_after_scraper, ["ContextResearcherNode", "NewsDiscoveryNode", "ScraperNode"])
  .addConditionalEdges("NewsDiscoveryNode", route_after_discovery, ["HookStrategistNode", "NewsDiscoveryNode"])
  .addConditionalEdges("ContextResearcherNode", route_after_researcher, ["HookStrategistNode", "ContextResearcherNode"])
  .addConditionalEdges("HookStrategistNode", route_after_hook, ["ThreadWriterNode", "HookStrategistNode", "ManualHookSelectionNode"])
  .addEdge("ManualHookSelectionNode", "ThreadWriterNode")
  .addConditionalEdges("ThreadWriterNode", route_after_writer, ["CharacterValidatorNode", "ThreadWriterNode"])
  .addConditionalEdges("CharacterValidatorNode", route_after_validator, ["ViralityCriticNode", "ThreadWriterNode"])
  .addConditionalEdges("ViralityCriticNode", route_after_critic, [END, "ThreadWriterNode", "ViralityCriticNode", "VisualKeywordStrategistNode", "InfographicGeneratorNode"])
  .addEdge("VisualKeywordStrategistNode", END)
  .addEdge("InfographicGeneratorNode", END)
  .compile({ checkpointer: checkpointSaver });
