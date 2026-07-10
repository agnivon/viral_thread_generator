/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_currentsNewsActions from "../actions/currentsNewsActions.js";
import type * as actions_newsdataActions from "../actions/newsdataActions.js";
import type * as actions_setupActions from "../actions/setupActions.js";
import type * as actions_threadsActions from "../actions/threadsActions.js";
import type * as actions_tokensActions from "../actions/tokensActions.js";
import type * as auth from "../auth.js";
import type * as clearAuth from "../clearAuth.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_agents_models from "../lib/agents/models.js";
import type * as lib_agents_news_graph from "../lib/agents/news/graph.js";
import type * as lib_agents_news_index from "../lib/agents/news/index.js";
import type * as lib_agents_news_nodes from "../lib/agents/news/nodes.js";
import type * as lib_agents_news_prompts from "../lib/agents/news/prompts.js";
import type * as lib_agents_news_state from "../lib/agents/news/state.js";
import type * as lib_agents_news_tools from "../lib/agents/news/tools.js";
import type * as lib_agents_social_media_graph from "../lib/agents/social_media/graph.js";
import type * as lib_agents_social_media_index from "../lib/agents/social_media/index.js";
import type * as lib_agents_social_media_nodes from "../lib/agents/social_media/nodes.js";
import type * as lib_agents_social_media_prompts from "../lib/agents/social_media/prompts.js";
import type * as lib_agents_social_media_state from "../lib/agents/social_media/state.js";
import type * as lib_agents_social_media_tools from "../lib/agents/social_media/tools.js";
import type * as lib_agents_utils from "../lib/agents/utils.js";
import type * as lib_currents_news_api from "../lib/currents_news/api.js";
import type * as lib_firebase_index from "../lib/firebase/index.js";
import type * as lib_jina_api from "../lib/jina/api.js";
import type * as lib_newsdata_api from "../lib/newsdata/api.js";
import type * as lib_threads_api from "../lib/threads/api.js";
import type * as lib_workpool_index from "../lib/workpool/index.js";
import type * as mutations_threadsMutations from "../mutations/threadsMutations.js";
import type * as mutations_tokensMutations from "../mutations/tokensMutations.js";
import type * as queries_threadsQueries from "../queries/threadsQueries.js";
import type * as queries_tokensQueries from "../queries/tokensQueries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/currentsNewsActions": typeof actions_currentsNewsActions;
  "actions/newsdataActions": typeof actions_newsdataActions;
  "actions/setupActions": typeof actions_setupActions;
  "actions/threadsActions": typeof actions_threadsActions;
  "actions/tokensActions": typeof actions_tokensActions;
  auth: typeof auth;
  clearAuth: typeof clearAuth;
  crons: typeof crons;
  http: typeof http;
  "lib/agents/models": typeof lib_agents_models;
  "lib/agents/news/graph": typeof lib_agents_news_graph;
  "lib/agents/news/index": typeof lib_agents_news_index;
  "lib/agents/news/nodes": typeof lib_agents_news_nodes;
  "lib/agents/news/prompts": typeof lib_agents_news_prompts;
  "lib/agents/news/state": typeof lib_agents_news_state;
  "lib/agents/news/tools": typeof lib_agents_news_tools;
  "lib/agents/social_media/graph": typeof lib_agents_social_media_graph;
  "lib/agents/social_media/index": typeof lib_agents_social_media_index;
  "lib/agents/social_media/nodes": typeof lib_agents_social_media_nodes;
  "lib/agents/social_media/prompts": typeof lib_agents_social_media_prompts;
  "lib/agents/social_media/state": typeof lib_agents_social_media_state;
  "lib/agents/social_media/tools": typeof lib_agents_social_media_tools;
  "lib/agents/utils": typeof lib_agents_utils;
  "lib/currents_news/api": typeof lib_currents_news_api;
  "lib/firebase/index": typeof lib_firebase_index;
  "lib/jina/api": typeof lib_jina_api;
  "lib/newsdata/api": typeof lib_newsdata_api;
  "lib/threads/api": typeof lib_threads_api;
  "lib/workpool/index": typeof lib_workpool_index;
  "mutations/threadsMutations": typeof mutations_threadsMutations;
  "mutations/tokensMutations": typeof mutations_tokensMutations;
  "queries/threadsQueries": typeof queries_threadsQueries;
  "queries/tokensQueries": typeof queries_tokensQueries;
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
};
