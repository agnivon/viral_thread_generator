"use node";

import { StateGraph, START, END } from "@langchain/langgraph";
import { VisualKeywordStrategistNode } from "../nodes.js";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import pg from "pg";
import { NewsThreadFactoryState, NewsThreadFactoryStateType } from "./state.js";
import { ScraperNode, ContextResearcherNode, HookStrategistNode, ThreadWriterNode, CharacterValidatorNode, ViralityCriticNode, ManualHookSelectionNode } from "./nodes.js";

const { Pool } = pg;

// Aiven URLs often contain ?sslmode=require which overrides custom SSL objects in the pg driver.
// We parse the URL and remove sslmode so our explicit sslConfig takes precedence.
let connectionString = process.env.POSTGRES_URL;
if (connectionString) {
  try {
    const dbUrl = new URL(connectionString);
    dbUrl.searchParams.delete("sslmode");
    connectionString = dbUrl.toString();
  } catch {
    // Ignore URL parse error in tests
  }
}

const sslConfig = process.env.POSTGRES_CA_CERT
  ? { ca: process.env.POSTGRES_CA_CERT.replace(/\\n/g, '\n'), rejectUnauthorized: true }
  : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: 1, // Limit connections per isolate to prevent exhaustion in serverless environments
  idleTimeoutMillis: 10000,
});

export const checkpointSaver = new PostgresSaver(pool);

const route_after_scraper = (state: NewsThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.scraper || 0) >= 3) throw new Error("ScraperNode failed after 3 retries");
    return "ScraperNode";
  }
  return "ContextResearcherNode";
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

const route_after_writer = (state: NewsThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.writer || 0) >= 3) throw new Error("ThreadWriterNode failed after 3 retries");
    return "ThreadWriterNode";
  }
  return "CharacterValidatorNode";
};

const route_after_validator = (state: NewsThreadFactoryStateType) => {
  if (!state.is_character_valid) {
    if ((state.retries?.validator || 0) >= 3) {
      if (!state.character_critique.includes("characters long")) {
        console.log("[route_after_validator] Max character validation retries reached, but only line break errors remain. Proceeding.");
        return "ViralityCriticNode";
      }
      console.log("[route_after_validator] Max character validation retries reached, aborting character fixes");
      return state.search_query_generation ? "VisualKeywordStrategistNode" : END;
    }
    return "ThreadWriterNode";
  }
  return "ViralityCriticNode";
};

const route_after_critic = (state: NewsThreadFactoryStateType) => {
  if (!state.parse_success) {
    if ((state.retries?.critic || 0) >= 3) throw new Error("ViralityCriticNode failed after 3 retries");
    return "ViralityCriticNode";
  }
  if (state.is_approved === true || state.iterations >= 3) {
    if (state.iterations === 1 && state.post_critiques && state.post_critiques.length > 0) {
      return "ThreadWriterNode";
    }
    return state.search_query_generation ? "VisualKeywordStrategistNode" : END;
  }
  return "ThreadWriterNode";
};


export const NewsThreadFactoryGraph = new StateGraph(NewsThreadFactoryState)
  .setNodeDefaults({ timeout: { runTimeout: 3_00_000, idleTimeout: 2_00_000 } })
  .addNode("ScraperNode", ScraperNode)
  .addNode("ContextResearcherNode", ContextResearcherNode)
  .addNode("HookStrategistNode", HookStrategistNode)
  .addNode("ManualHookSelectionNode", ManualHookSelectionNode)
  .addNode("ThreadWriterNode", ThreadWriterNode)
  .addNode("CharacterValidatorNode", CharacterValidatorNode)
  .addNode("ViralityCriticNode", ViralityCriticNode)
  .addNode("VisualKeywordStrategistNode", VisualKeywordStrategistNode)
  .addEdge(START, "ScraperNode")
  .addConditionalEdges("ScraperNode", route_after_scraper, ["ContextResearcherNode", "ScraperNode"])
  .addConditionalEdges("ContextResearcherNode", route_after_researcher, ["HookStrategistNode", "ContextResearcherNode"])
  .addConditionalEdges("HookStrategistNode", route_after_hook, ["ThreadWriterNode", "HookStrategistNode", "ManualHookSelectionNode"])
  .addEdge("ManualHookSelectionNode", "ThreadWriterNode")
  .addConditionalEdges("ThreadWriterNode", route_after_writer, ["CharacterValidatorNode", "ThreadWriterNode"])
  .addConditionalEdges("CharacterValidatorNode", route_after_validator, [END, "ViralityCriticNode", "ThreadWriterNode", "VisualKeywordStrategistNode"])
  .addConditionalEdges("ViralityCriticNode", route_after_critic, [END, "ThreadWriterNode", "ViralityCriticNode", "VisualKeywordStrategistNode"])
  .addEdge("VisualKeywordStrategistNode", END)
  .compile({ checkpointer: checkpointSaver });
