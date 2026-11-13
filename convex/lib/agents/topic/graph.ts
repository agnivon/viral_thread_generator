"use node";

import { StateGraph, START, END } from "@langchain/langgraph";
import { VisualKeywordStrategistNode } from "../nodes.js";
import { InfographicGeneratorNode } from "../../infographics/nodes.js";
import { checkpointSaver } from "../checkpointer.js";
import { TopicThreadFactoryState, TopicThreadFactoryStateType } from "./state.js";
import { 
  TopicDiscoveryNode,
  ResearchOrchestratorNode,
  DeepPageScraperNode,
  HookStrategistNode,
  ThreadWriterNode,
  ViralityCriticNode,
  TopicCharacterValidatorNode,
  ManualHookSelectionNode
} from "./nodes.js";

const route_initial_topic_step = (state: TopicThreadFactoryStateType) => {
  if (state.discovery_agent) {
    return "TopicDiscoveryNode";
  }
  return "ResearchOrchestratorNode";
};

const route_after_topic_discovery = (state: TopicThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.orchestrator || 0) >= 3) {
      return "HookStrategistNode";
    }
    return "TopicDiscoveryNode";
  }
  return "HookStrategistNode";
};

const route_after_orchestrator = (state: TopicThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.orchestrator || 0) >= 3) throw new Error("ResearchOrchestratorNode failed after 3 retries");
    return "ResearchOrchestratorNode";
  }
  if (state.urls_to_scrape && state.urls_to_scrape.length > 0) {
    return "DeepPageScraperNode";
  }
  return "HookStrategistNode";
};

const route_after_scraper = (state: TopicThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.scraper || 0) >= 3) throw new Error("DeepPageScraperNode failed after 3 retries");
    return "DeepPageScraperNode";
  }
  return "HookStrategistNode";
};

const route_after_hook = (state: TopicThreadFactoryStateType) => {
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

const route_after_writer = createRouteAfterWriter("TopicCharacterValidatorNode");
export const route_after_validator = createRouteAfterValidator("TopicCharacterValidatorNode");
export const route_after_critic = createRouteAfterCritic("ViralityCriticNode");

export const TopicThreadFactoryGraph = new StateGraph(TopicThreadFactoryState)
  .setNodeDefaults({ timeout: { idleTimeout: 2_00_000 } })
  .addNode("TopicDiscoveryNode", TopicDiscoveryNode)
  .addNode("ResearchOrchestratorNode", ResearchOrchestratorNode)
  .addNode("DeepPageScraperNode", DeepPageScraperNode)
  .addNode("HookStrategistNode", HookStrategistNode)
  .addNode("ManualHookSelectionNode", ManualHookSelectionNode)
  .addNode("ThreadWriterNode", ThreadWriterNode)
  .addNode("TopicCharacterValidatorNode", TopicCharacterValidatorNode)
  .addNode("ViralityCriticNode", ViralityCriticNode)
  .addNode("VisualKeywordStrategistNode", VisualKeywordStrategistNode)
  .addNode("InfographicGeneratorNode", InfographicGeneratorNode)
  .addConditionalEdges(START, route_initial_topic_step, ["TopicDiscoveryNode", "ResearchOrchestratorNode"])
  .addConditionalEdges("TopicDiscoveryNode", route_after_topic_discovery, ["HookStrategistNode", "TopicDiscoveryNode"])
  .addConditionalEdges("ResearchOrchestratorNode", route_after_orchestrator, ["DeepPageScraperNode", "HookStrategistNode", "ResearchOrchestratorNode"])
  .addConditionalEdges("DeepPageScraperNode", route_after_scraper, ["HookStrategistNode", "DeepPageScraperNode"])
  .addConditionalEdges("HookStrategistNode", route_after_hook, ["ThreadWriterNode", "HookStrategistNode", "ManualHookSelectionNode"])
  .addEdge("ManualHookSelectionNode", "ThreadWriterNode")
  .addConditionalEdges("ThreadWriterNode", route_after_writer, ["TopicCharacterValidatorNode", "ThreadWriterNode"])
  .addConditionalEdges("TopicCharacterValidatorNode", route_after_validator, ["ViralityCriticNode", "ThreadWriterNode"])
  .addConditionalEdges("ViralityCriticNode", route_after_critic, [END, "ThreadWriterNode", "ViralityCriticNode", "VisualKeywordStrategistNode", "InfographicGeneratorNode"])
  .addEdge("VisualKeywordStrategistNode", END)
  .addEdge("InfographicGeneratorNode", END)
  .compile({ checkpointer: checkpointSaver });
