"use node";

import { StateGraph, START, END } from "@langchain/langgraph";
import { VisualKeywordStrategistNode } from "../nodes.js";
import { checkpointSaver } from "../news/graph.js"; // Reuse the postgres saver
import { TopicThreadFactoryState, TopicThreadFactoryStateType } from "./state.js";
import { 
  ResearchOrchestratorNode,
  DeepPageScraperNode,
  HookStrategistNode,
  ThreadWriterNode,
  ViralityCriticNode,
  TopicCharacterValidatorNode
} from "./nodes.js";

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
  return "ThreadWriterNode";
};

const route_after_writer = (state: TopicThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.writer || 0) >= 3) throw new Error("ThreadWriterNode failed after 3 retries");
    return "ThreadWriterNode";
  }
  return "TopicCharacterValidatorNode";
};

const route_after_validator = (state: TopicThreadFactoryStateType) => {
  if (state.is_character_valid === false) {
    if ((state.retries?.validator || 0) >= 3) {
      // If we keep failing validation, just send it to the critic and let it fail or rewrite
      return "ViralityCriticNode";
    }
    return "ThreadWriterNode";
  }
  return "ViralityCriticNode";
};

const route_after_critic = (state: TopicThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.critic || 0) >= 3) throw new Error("ViralityCriticNode failed after 3 retries");
    return "ViralityCriticNode";
  }
  if (state.is_approved === true || state.iterations >= 3) {
    return state.search_query_generation ? "VisualKeywordStrategistNode" : END;
  }
  return "ThreadWriterNode";
};

export const TopicThreadFactoryGraph = new StateGraph(TopicThreadFactoryState)
  .setNodeDefaults({ timeout: { runTimeout: 3_00_000, idleTimeout: 2_00_000 } })
  .addNode("ResearchOrchestratorNode", ResearchOrchestratorNode)
  .addNode("DeepPageScraperNode", DeepPageScraperNode)
  .addNode("HookStrategistNode", HookStrategistNode)
  .addNode("ThreadWriterNode", ThreadWriterNode)
  .addNode("TopicCharacterValidatorNode", TopicCharacterValidatorNode)
  .addNode("ViralityCriticNode", ViralityCriticNode)
  .addNode("VisualKeywordStrategistNode", VisualKeywordStrategistNode)
  .addEdge(START, "ResearchOrchestratorNode")
  .addConditionalEdges("ResearchOrchestratorNode", route_after_orchestrator, ["DeepPageScraperNode", "HookStrategistNode", "ResearchOrchestratorNode"])
  .addConditionalEdges("DeepPageScraperNode", route_after_scraper, ["HookStrategistNode", "DeepPageScraperNode"])
  .addConditionalEdges("HookStrategistNode", route_after_hook, ["ThreadWriterNode", "HookStrategistNode"])
  .addConditionalEdges("ThreadWriterNode", route_after_writer, ["TopicCharacterValidatorNode", "ThreadWriterNode"])
  .addConditionalEdges("TopicCharacterValidatorNode", route_after_validator, ["ViralityCriticNode", "ThreadWriterNode", "VisualKeywordStrategistNode"])
  .addConditionalEdges("ViralityCriticNode", route_after_critic, [END, "ThreadWriterNode", "ViralityCriticNode", "VisualKeywordStrategistNode"])
  .addEdge("VisualKeywordStrategistNode", END)
  .compile({ checkpointer: checkpointSaver });
