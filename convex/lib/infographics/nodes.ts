"use node";

import { providerStrategy } from "langchain";
import { RunnableConfig } from "@langchain/core/runnables";
import { InfographicSpecSchema, InfographicSpec } from "./schema.js";
import { INFOGRAPHIC_STRATEGIST_PROMPT } from "./prompts.js";
import {
  googleGemini35FlashLiteT02Key1,
  googleGemini35FlashLiteT02Key2,
  googleGemini31FlashLiteT02Key1,
  googleGemini31FlashLiteT02Key2,
  deepSeekFlashT02ReasoningNone,
} from "../agents/models.js";
import { buildAgents, invokeWithFallbacks } from "../agents/utils.js";

export const infographicStrategistAgents = buildAgents<InfographicSpec>(
  [
    googleGemini35FlashLiteT02Key1,
    googleGemini35FlashLiteT02Key2,
    googleGemini31FlashLiteT02Key1,
    googleGemini31FlashLiteT02Key2,
    deepSeekFlashT02ReasoningNone,
  ],
  {
    systemPrompt: INFOGRAPHIC_STRATEGIST_PROMPT,
    responseFormat: providerStrategy(InfographicSpecSchema),
  }
);

export interface InfographicNodeState {
  thread_draft?: string[];
  raw_markdown?: string;
  research_context?: string;
  research_dossier?: string;
  selected_hook?: string | null;
  [key: string]: unknown;
}

export const InfographicGeneratorNode = async (
  state: InfographicNodeState,
  config?: RunnableConfig
): Promise<{ infographic_spec?: InfographicSpec }> => {
  let result;
  let parse_success = false;

  const threadContent = Array.isArray(state.thread_draft) && state.thread_draft.length > 0
    ? state.thread_draft.join("\n\n")
    : state.selected_hook || "";

  const researchContext = (typeof state.research_context === "string" && state.research_context)
    || (typeof state.research_dossier === "string" && state.research_dossier)
    || "";

  const rawSource = typeof state.raw_markdown === "string"
    ? state.raw_markdown.slice(0, 3000)
    : "";

  const content = [
    `<THREAD_DRAFT>\n${threadContent}\n</THREAD_DRAFT>`,
    researchContext ? `<RESEARCH_CONTEXT>\n${researchContext}\n</RESEARCH_CONTEXT>` : "",
    rawSource ? `<SOURCE_SNIPPET>\n${rawSource}\n</SOURCE_SNIPPET>` : "",
  ].filter(Boolean).join("\n\n");

  try {
    result = await invokeWithFallbacks(
      infographicStrategistAgents,
      {
        messages: [{ role: "user", content }],
      },
      { ...config, timeout: 50000 }
    );
    parse_success = true;
  } catch (e) {
    console.warn("[InfographicGeneratorNode] LLM invocation failed:", e);
    parse_success = false;
  }

  if (parse_success && result?.structuredResponse) {
    const parsed = InfographicSpecSchema.safeParse(result.structuredResponse);
    if (parsed.success) {
      return {
        infographic_spec: parsed.data,
      };
    }
  }

  console.warn("[InfographicGeneratorNode] Output schema validation failed");
  return {
    infographic_spec: undefined,
  };
};
