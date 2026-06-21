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
import type * as actions_threadsActions from "../actions/threadsActions.js";
import type * as actions_tokensActions from "../actions/tokensActions.js";
import type * as auth from "../auth.js";
import type * as clearAuth from "../clearAuth.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_agents_graph from "../lib/agents/graph.js";
import type * as lib_agents_index from "../lib/agents/index.js";
import type * as lib_agents_models from "../lib/agents/models.js";
import type * as lib_agents_nodes from "../lib/agents/nodes.js";
import type * as lib_agents_prompts from "../lib/agents/prompts.js";
import type * as lib_agents_state from "../lib/agents/state.js";
import type * as lib_agents_tools from "../lib/agents/tools.js";
import type * as lib_agents_utils from "../lib/agents/utils.js";
import type * as lib_currents_news_api from "../lib/currents_news/api.js";
import type * as lib_firebase_index from "../lib/firebase/index.js";
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
  "actions/threadsActions": typeof actions_threadsActions;
  "actions/tokensActions": typeof actions_tokensActions;
  auth: typeof auth;
  clearAuth: typeof clearAuth;
  crons: typeof crons;
  http: typeof http;
  "lib/agents/graph": typeof lib_agents_graph;
  "lib/agents/index": typeof lib_agents_index;
  "lib/agents/models": typeof lib_agents_models;
  "lib/agents/nodes": typeof lib_agents_nodes;
  "lib/agents/prompts": typeof lib_agents_prompts;
  "lib/agents/state": typeof lib_agents_state;
  "lib/agents/tools": typeof lib_agents_tools;
  "lib/agents/utils": typeof lib_agents_utils;
  "lib/currents_news/api": typeof lib_currents_news_api;
  "lib/firebase/index": typeof lib_firebase_index;
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
