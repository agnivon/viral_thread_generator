"use node";

export interface ValidatorState {
  is_character_valid: boolean;
  retries?: { validator?: number };
}

export interface WriterState {
  parse_success: boolean;
  retries?: { writer?: number };
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
