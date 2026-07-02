"use node";

import { StateGraph, START, END } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import pg from "pg";
import { ThreadFactoryState, ThreadFactoryStateType } from "./state.js";
import { ScraperNode, HookStrategistNode, ThreadWriterNode, CharacterValidatorNode, ViralityCriticNode, ManualHookSelectionNode } from "./nodes.js";

const { Pool } = pg;

// Aiven URLs often contain ?sslmode=require which overrides custom SSL objects in the pg driver.
// We parse the URL and remove sslmode so our explicit sslConfig takes precedence.
let connectionString = process.env.POSTGRES_URL;
if (connectionString) {
  try {
    const dbUrl = new URL(connectionString);
    dbUrl.searchParams.delete("sslmode");
    connectionString = dbUrl.toString();
  } catch (e) {
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
  if (state.manual_hook_selection) {
    return "ManualHookSelectionNode";
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
  .setNodeDefaults({ timeout: { runTimeout: 3_00_000, idleTimeout: 2_00_000 } })
  .addNode("ScraperNode", ScraperNode)
  .addNode("HookStrategistNode", HookStrategistNode)
  .addNode("ManualHookSelectionNode", ManualHookSelectionNode)
  .addNode("ThreadWriterNode", ThreadWriterNode)
  .addNode("CharacterValidatorNode", CharacterValidatorNode)
  .addNode("ViralityCriticNode", ViralityCriticNode)
  .addEdge(START, "ScraperNode")
  .addConditionalEdges("ScraperNode", route_after_scraper, ["HookStrategistNode", "ScraperNode"])
  .addConditionalEdges("HookStrategistNode", route_after_hook, ["ThreadWriterNode", "HookStrategistNode", "ManualHookSelectionNode"])
  .addEdge("ManualHookSelectionNode", "ThreadWriterNode")
  .addConditionalEdges("ThreadWriterNode", route_after_writer, ["CharacterValidatorNode", "ThreadWriterNode"])
  .addConditionalEdges("CharacterValidatorNode", route_after_validator, [END, "ViralityCriticNode", "ThreadWriterNode"])
  .addConditionalEdges("ViralityCriticNode", route_after_critic, [END, "ThreadWriterNode", "ViralityCriticNode"])
  .compile({ checkpointer: checkpointSaver });
