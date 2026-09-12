/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_currentsNews from "../actions/currentsNews.js";
import type * as actions_googleTrends from "../actions/googleTrends.js";
import type * as actions_newsdata from "../actions/newsdata.js";
import type * as actions_setup from "../actions/setup.js";
import type * as actions_threads from "../actions/threads.js";
import type * as actions_tokens from "../actions/tokens.js";
import type * as actions_trendAlerts from "../actions/trendAlerts.js";
import type * as auth from "../auth.js";
import type * as circuitBreaker from "../circuitBreaker.js";
import type * as clearAuth from "../clearAuth.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_agents_circuitBreaker from "../lib/agents/circuitBreaker.js";
import type * as lib_agents_models from "../lib/agents/models.js";
import type * as lib_agents_news_graph from "../lib/agents/news/graph.js";
import type * as lib_agents_news_index from "../lib/agents/news/index.js";
import type * as lib_agents_news_nodes from "../lib/agents/news/nodes.js";
import type * as lib_agents_news_prompts from "../lib/agents/news/prompts.js";
import type * as lib_agents_news_state from "../lib/agents/news/state.js";
import type * as lib_agents_news_tools from "../lib/agents/news/tools.js";
import type * as lib_agents_nodes from "../lib/agents/nodes.js";
import type * as lib_agents_prompts from "../lib/agents/prompts.js";
import type * as lib_agents_social_media_graph from "../lib/agents/social_media/graph.js";
import type * as lib_agents_social_media_index from "../lib/agents/social_media/index.js";
import type * as lib_agents_social_media_nodes from "../lib/agents/social_media/nodes.js";
import type * as lib_agents_social_media_prompts from "../lib/agents/social_media/prompts.js";
import type * as lib_agents_social_media_state from "../lib/agents/social_media/state.js";
import type * as lib_agents_social_media_tools from "../lib/agents/social_media/tools.js";
import type * as lib_agents_tools from "../lib/agents/tools.js";
import type * as lib_agents_topic_graph from "../lib/agents/topic/graph.js";
import type * as lib_agents_topic_index from "../lib/agents/topic/index.js";
import type * as lib_agents_topic_nodes from "../lib/agents/topic/nodes.js";
import type * as lib_agents_topic_prompts from "../lib/agents/topic/prompts.js";
import type * as lib_agents_topic_state from "../lib/agents/topic/state.js";
import type * as lib_agents_topic_tools from "../lib/agents/topic/tools.js";
import type * as lib_agents_utils from "../lib/agents/utils.js";
import type * as lib_clients_brave from "../lib/clients/brave.js";
import type * as lib_clients_currents from "../lib/clients/currents.js";
import type * as lib_clients_firebase from "../lib/clients/firebase.js";
import type * as lib_clients_jina from "../lib/clients/jina.js";
import type * as lib_clients_newsdata from "../lib/clients/newsdata.js";
import type * as lib_clients_threads from "../lib/clients/threads.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_nicheClassifier from "../lib/nicheClassifier.js";
import type * as lib_trends_index from "../lib/trends/index.js";
import type * as lib_trends_nicheClassifier from "../lib/trends/nicheClassifier.js";
import type * as lib_workpool from "../lib/workpool.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as notifications_client from "../notifications/client.js";
import type * as notifications_onComplete from "../notifications/onComplete.js";
import type * as threads from "../threads.js";
import type * as tokens from "../tokens.js";
import type * as trendAlerts from "../trendAlerts.js";
import type * as trendFilterSettings from "../trendFilterSettings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/currentsNews": typeof actions_currentsNews;
  "actions/googleTrends": typeof actions_googleTrends;
  "actions/newsdata": typeof actions_newsdata;
  "actions/setup": typeof actions_setup;
  "actions/threads": typeof actions_threads;
  "actions/tokens": typeof actions_tokens;
  "actions/trendAlerts": typeof actions_trendAlerts;
  auth: typeof auth;
  circuitBreaker: typeof circuitBreaker;
  clearAuth: typeof clearAuth;
  crons: typeof crons;
  http: typeof http;
  "lib/agents/circuitBreaker": typeof lib_agents_circuitBreaker;
  "lib/agents/models": typeof lib_agents_models;
  "lib/agents/news/graph": typeof lib_agents_news_graph;
  "lib/agents/news/index": typeof lib_agents_news_index;
  "lib/agents/news/nodes": typeof lib_agents_news_nodes;
  "lib/agents/news/prompts": typeof lib_agents_news_prompts;
  "lib/agents/news/state": typeof lib_agents_news_state;
  "lib/agents/news/tools": typeof lib_agents_news_tools;
  "lib/agents/nodes": typeof lib_agents_nodes;
  "lib/agents/prompts": typeof lib_agents_prompts;
  "lib/agents/social_media/graph": typeof lib_agents_social_media_graph;
  "lib/agents/social_media/index": typeof lib_agents_social_media_index;
  "lib/agents/social_media/nodes": typeof lib_agents_social_media_nodes;
  "lib/agents/social_media/prompts": typeof lib_agents_social_media_prompts;
  "lib/agents/social_media/state": typeof lib_agents_social_media_state;
  "lib/agents/social_media/tools": typeof lib_agents_social_media_tools;
  "lib/agents/tools": typeof lib_agents_tools;
  "lib/agents/topic/graph": typeof lib_agents_topic_graph;
  "lib/agents/topic/index": typeof lib_agents_topic_index;
  "lib/agents/topic/nodes": typeof lib_agents_topic_nodes;
  "lib/agents/topic/prompts": typeof lib_agents_topic_prompts;
  "lib/agents/topic/state": typeof lib_agents_topic_state;
  "lib/agents/topic/tools": typeof lib_agents_topic_tools;
  "lib/agents/utils": typeof lib_agents_utils;
  "lib/clients/brave": typeof lib_clients_brave;
  "lib/clients/currents": typeof lib_clients_currents;
  "lib/clients/firebase": typeof lib_clients_firebase;
  "lib/clients/jina": typeof lib_clients_jina;
  "lib/clients/newsdata": typeof lib_clients_newsdata;
  "lib/clients/threads": typeof lib_clients_threads;
  "lib/env": typeof lib_env;
  "lib/nicheClassifier": typeof lib_nicheClassifier;
  "lib/trends/index": typeof lib_trends_index;
  "lib/trends/nicheClassifier": typeof lib_trends_nicheClassifier;
  "lib/workpool": typeof lib_workpool;
  migrations: typeof migrations;
  notifications: typeof notifications;
  "notifications/client": typeof notifications_client;
  "notifications/onComplete": typeof notifications_onComplete;
  threads: typeof threads;
  tokens: typeof tokens;
  trendAlerts: typeof trendAlerts;
  trendFilterSettings: typeof trendFilterSettings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  generationPool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"generationPool">;
  publicationPool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"publicationPool">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};
