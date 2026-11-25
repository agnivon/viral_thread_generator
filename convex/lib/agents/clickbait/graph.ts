"use node";

import { StateGraph, START, END } from "@langchain/langgraph";
import { InfographicGeneratorNode } from "../../infographics/nodes.js";
import { checkpointSaver } from "../checkpointer.js";
import { ClickbaitThreadFactoryState, ClickbaitThreadFactoryStateType } from "./state.js";
import {
  ClickbaitScraperNode,
  ClickbaitDiscoveryNode,
  ClickbaitAngleStrategistNode,
  ClickbaitHookStrategistNode,
  ManualHookSelectionNode,
  CliffhangerThreadWriterNode,
  CharacterValidatorNode,
  ClickbaitViralityCriticNode,
} from "./nodes.js";
import {
  createRouteAfterValidator,
  createRouteAfterWriter,
  createRouteAfterCritic,
} from "../sharedRouters.js";

const route_after_scraper = (state: ClickbaitThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.scraper || 0) >= 3) {
      throw new Error("ClickbaitScraperNode failed after 3 retries");
    }
    return "ClickbaitScraperNode";
  }
  if (state.discovery_agent) {
    return "ClickbaitDiscoveryNode";
  }
  return "ClickbaitAngleStrategistNode";
};

const route_after_discovery = (state: ClickbaitThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.researcher || 0) >= 3) return "ClickbaitAngleStrategistNode";
    return "ClickbaitDiscoveryNode";
  }
  return "ClickbaitAngleStrategistNode";
};

const route_after_angle = (state: ClickbaitThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.researcher || 0) >= 3) return "HookStrategistNode";
    return "ClickbaitAngleStrategistNode";
  }
  return "HookStrategistNode";
};

const route_after_hook = (state: ClickbaitThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.hook || 0) >= 3) {
      throw new Error("HookStrategistNode failed after 3 retries");
    }
    return "HookStrategistNode";
  }
  if (state.manual_hook_selection) {
    return "ManualHookSelectionNode";
  }
  return "ThreadWriterNode";
};

const route_after_writer = createRouteAfterWriter("CharacterValidatorNode");
export const route_after_validator = createRouteAfterValidator("CharacterValidatorNode");
export const route_after_critic = createRouteAfterCritic("ViralityCriticNode");

export const ClickbaitThreadFactoryGraph = new StateGraph(ClickbaitThreadFactoryState)
  .setNodeDefaults({ timeout: { idleTimeout: 200_000 } })
  .addNode("ClickbaitScraperNode", ClickbaitScraperNode)
  .addNode("ClickbaitDiscoveryNode", ClickbaitDiscoveryNode)
  .addNode("ClickbaitAngleStrategistNode", ClickbaitAngleStrategistNode)
  .addNode("HookStrategistNode", ClickbaitHookStrategistNode)
  .addNode("ManualHookSelectionNode", ManualHookSelectionNode)
  .addNode("ThreadWriterNode", CliffhangerThreadWriterNode)
  .addNode("CharacterValidatorNode", CharacterValidatorNode)
  .addNode("ViralityCriticNode", ClickbaitViralityCriticNode)
  .addNode("InfographicGeneratorNode", InfographicGeneratorNode)
  .addEdge(START, "ClickbaitScraperNode")
  .addConditionalEdges("ClickbaitScraperNode", route_after_scraper, [
    "ClickbaitDiscoveryNode",
    "ClickbaitAngleStrategistNode",
    "ClickbaitScraperNode",
  ])
  .addConditionalEdges("ClickbaitDiscoveryNode", route_after_discovery, [
    "ClickbaitAngleStrategistNode",
    "ClickbaitDiscoveryNode",
  ])
  .addConditionalEdges("ClickbaitAngleStrategistNode", route_after_angle, [
    "HookStrategistNode",
    "ClickbaitAngleStrategistNode",
  ])
  .addConditionalEdges("HookStrategistNode", route_after_hook, [
    "ThreadWriterNode",
    "HookStrategistNode",
    "ManualHookSelectionNode",
  ])
  .addEdge("ManualHookSelectionNode", "ThreadWriterNode")
  .addConditionalEdges("ThreadWriterNode", route_after_writer, [
    "CharacterValidatorNode",
    "ThreadWriterNode",
  ])
  .addConditionalEdges("CharacterValidatorNode", route_after_validator, [
    "ViralityCriticNode",
    "ThreadWriterNode",
  ])
  .addConditionalEdges("ViralityCriticNode", route_after_critic, [
    END,
    "ThreadWriterNode",
    "ViralityCriticNode",
    "InfographicGeneratorNode",
  ])
  .addEdge("InfographicGeneratorNode", END)
  .compile({ checkpointer: checkpointSaver });
