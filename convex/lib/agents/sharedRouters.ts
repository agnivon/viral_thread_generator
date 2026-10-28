"use node";

import { END } from "@langchain/langgraph";

export interface ValidatorState {
  is_character_valid: boolean;
  retries?: { validator?: number };
}

export interface WriterState {
  parse_success: boolean;
  retries?: { writer?: number };
}

export interface CriticState {
  parse_success: boolean;
  is_approved: boolean;
  iterations: number;
  max_iterations?: number;
  post_critiques?: Array<{ fix_directive?: string }>;
  search_query_generation?: boolean;
  retries?: { critic?: number };
}

export function createRouteAfterValidator(validatorNodeName = "CharacterValidatorNode") {
  return (state: ValidatorState): string => {
    if (!state.is_character_valid) {
      if ((state.retries?.validator || 0) >= 3) {
        throw new Error(`${validatorNodeName} failed after 3 retries`);
      }
      return "ThreadWriterNode";
    }
    return "ViralityCriticNode";
  };
}

export function createRouteAfterWriter(validatorNodeName = "CharacterValidatorNode") {
  return (state: WriterState): string => {
    if (!state.parse_success) {
      if ((state.retries?.writer || 0) >= 3) {
        throw new Error("ThreadWriterNode failed after 3 retries");
      }
      return "ThreadWriterNode";
    }
    return validatorNodeName;
  };
}

export function createRouteAfterCritic(criticNodeName = "ViralityCriticNode") {
  return (state: CriticState): string => {
    if (!state.parse_success) {
      if ((state.retries?.critic || 0) >= 3) {
        throw new Error(`${criticNodeName} failed after 3 retries`);
      }
      return criticNodeName;
    }
    const maxIterations = state.max_iterations ?? 3;
    if (state.is_approved === true || state.iterations >= maxIterations) {
      const hasFixDirectives = Boolean(
        state.post_critiques?.some((pc) => pc.fix_directive && pc.fix_directive.trim().length > 0)
      );
      if (state.iterations === 1 && hasFixDirectives && maxIterations > 1) {
        return "ThreadWriterNode";
      }
      return state.search_query_generation ? "VisualKeywordStrategistNode" : END;
    }
    return "ThreadWriterNode";
  };
}
