"use node";

import { StateGraph, START, END } from "@langchain/langgraph";
import { ThreadFactoryState, ThreadFactoryStateType } from "./state.js";
import { ScraperNode, HookStrategistNode, ThreadWriterNode, CharacterValidatorNode, ViralityCriticNode } from "./nodes.js";

const route_after_scraper = (state: ThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.scraper || 0) >= 3) throw new Error("ScraperNode failed after 3 retries");
    return "ScraperNode";
  }
  return "HookStrategistNode";
};

const route_after_hook = (state: ThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.hook || 0) >= 3) throw new Error("HookStrategistNode failed after 3 retries");
    return "HookStrategistNode";
  }
  return "ThreadWriterNode";
};

const route_after_writer = (state: ThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.writer || 0) >= 3) throw new Error("ThreadWriterNode failed after 3 retries");
    return "ThreadWriterNode";
  }
  return "CharacterValidatorNode";
};

const route_after_validator = (state: ThreadFactoryStateType) => {
  if (!state.is_character_valid) {
    if ((state.retries?.validator || 0) >= 3) {
      if (!state.character_critique.includes("characters long")) {
        console.log("[route_after_validator] Max character validation retries reached, but only line break errors remain. Proceeding.");
        return "ViralityCriticNode";
      }
      console.log("[route_after_validator] Max character validation retries reached, aborting character fixes");
      return END;
    }
    return "ThreadWriterNode";
  }
  return "ViralityCriticNode";
};

const route_after_critic = (state: ThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.critic || 0) >= 3) throw new Error("ViralityCriticNode failed after 3 retries");
    return "ViralityCriticNode";
  }
  if (state.is_approved === true || state.iterations >= 3) {
    return END;
  }
  return "ThreadWriterNode";
};

export const NewsThreadFactoryGraph = new StateGraph(ThreadFactoryState)
  .addNode("ScraperNode", ScraperNode)
  .addNode("HookStrategistNode", HookStrategistNode)
  .addNode("ThreadWriterNode", ThreadWriterNode)
  .addNode("CharacterValidatorNode", CharacterValidatorNode)
  .addNode("ViralityCriticNode", ViralityCriticNode)
  .addEdge(START, "ScraperNode")
  .addConditionalEdges("ScraperNode", route_after_scraper, ["HookStrategistNode", "ScraperNode"])
  .addConditionalEdges("HookStrategistNode", route_after_hook, ["ThreadWriterNode", "HookStrategistNode"])
  .addConditionalEdges("ThreadWriterNode", route_after_writer, ["CharacterValidatorNode", "ThreadWriterNode"])
  .addConditionalEdges("CharacterValidatorNode", route_after_validator, [END, "ViralityCriticNode", "ThreadWriterNode"])
  .addConditionalEdges("ViralityCriticNode", route_after_critic, [END, "ThreadWriterNode", "ViralityCriticNode"])
  .compile();
