"use node";

import { z } from "zod";
import { buildAgents, invokeWithFallbacks } from "./utils.js";
import {
  HOOK_STRATEGIST_NODE_PROMPT,
  SCRAPER_NODE_PROMPT,
  THREAD_WRITER_NODE_PROMPT,
  VIRALITY_CRITIC_NODE_PROMPT
} from "./prompts.js";
import { ThreadFactoryStateType } from "./state.js";
import { CharacterValidatorTool, TopicContextExpanderTool, WebScraperTool, ContentAuthenticityCheckerTool } from "./tools.js";
import {
  scraperPrimaryLlm, scraperFallbackLlm,
  hookPrimaryLlm, hookFallbackLlm1, hookFallbackLlm2,
  writerPrimaryLlm, writerFallbackLlm1, writerFallbackLlm2,
  criticPrimaryLlm, criticFallbackLlm
} from "./models.js";

export const ScraperNode = async (state: ThreadFactoryStateType) => {
  const markdown = await WebScraperTool.invoke({ url: state.url });

  const llm = scraperPrimaryLlm.withFallbacks({ fallbacks: [scraperFallbackLlm] });

  try {
    const summary = await llm.invoke([
      { role: "system", content: SCRAPER_NODE_PROMPT },
      { role: "user", content: markdown as string }
    ]);
    return {
      raw_markdown: summary.content as string,
      parse_success: true,
      retries: { ...(state.retries || {}), scraper: (state.retries?.scraper || 0) + 1 }
    };
  } catch (_e) {
    console.warn("ScraperNode output failed");
    return {
      parse_success: false,
      retries: { ...(state.retries || {}), scraper: (state.retries?.scraper || 0) + 1 }
    };
  }
};

export const HookStrategistNode = async (state: ThreadFactoryStateType) => {
  const schema = z.object({
    core_hooks: z.array(z.string()).min(1, "Must generate at least one hook"),
    selected_hook: z.string().min(1, "Must select a hook")
  });

  const agents = buildAgents(
    [hookPrimaryLlm, hookFallbackLlm1, hookFallbackLlm2],
    {
      tools: [TopicContextExpanderTool],
      systemPrompt: HOOK_STRATEGIST_NODE_PROMPT,
      responseFormat: schema
    }
  );

  let result;
  let parse_success = false;

  try {
    result = await invokeWithFallbacks(agents, {
      messages: [{ role: "user", content: state.raw_markdown }]
    });
    parse_success = true;
  } catch (_e) {
    parse_success = false;
  }

  let core_hooks: string[] = [];
  let selected_hook = "";

  if (parse_success && result?.structuredResponse) {
    core_hooks = result.structuredResponse.core_hooks || [];
    selected_hook = result.structuredResponse.selected_hook || "";
  } else {
    parse_success = false;
  }

  return {
    core_hooks,
    selected_hook,
    parse_success,
    retries: { ...(state.retries || {}), hook: (state.retries?.hook || 0) + 1 }
  };
};

export const ThreadWriterNode = async (state: ThreadFactoryStateType) => {
  const schema = z.object({
    thread_draft: z.array(z.string()).min(1, "Must generate at least one post for the thread draft")
  });

  const structuredLlm = writerPrimaryLlm.withStructuredOutput(schema, { name: "thread_writer", method: "jsonSchema" }).withFallbacks({
    fallbacks: [
      writerFallbackLlm1.withStructuredOutput(schema, { name: "thread_writer" }),
      writerFallbackLlm2.withStructuredOutput(schema, { name: "thread_writer" })
    ]
  });

  const previousDraftContext = state.thread_draft && state.thread_draft.length > 0 
    ? `\n\nPREVIOUS THREAD DRAFT:\n${JSON.stringify(state.thread_draft, null, 2)}` 
    : "";
  const critiqueContext = state.critique ? `\n\nCRITIQUE TO ADDRESS:\n${state.critique}` : "";

  let draft;
  let parse_success = true;
  try {
    draft = await structuredLlm.invoke([
      { role: "system", content: THREAD_WRITER_NODE_PROMPT },
      { role: "user", content: `HOOK:\n${state.selected_hook}\n\nSOURCE:\n${state.raw_markdown}${previousDraftContext}${critiqueContext}` }
    ], { timeout: 300000 });
    if (!draft || !draft.thread_draft) parse_success = false;
  } catch (_e) {
    parse_success = false;
  }

  return {
    thread_draft: draft?.thread_draft || [],
    parse_success,
    retries: { ...(state.retries || {}), writer: (state.retries?.writer || 0) + 1 }
  };
};

export const CharacterValidatorNode = async (state: ThreadFactoryStateType) => {
  const validationStr = await CharacterValidatorTool.invoke({ thread_draft: state.thread_draft });
  const validation = JSON.parse(validationStr);

  if (!validation.isValid) {
    return {
      is_character_valid: false,
      critique: `FIX REQUIRED: Posts at indices ${validation.offendingIndices.join(", ")} exceed 500 characters. You must rewrite these to be shorter.`,
      iterations: state.iterations + 1
    };
  }

  return {
    is_character_valid: true
  };
};

export const ViralityCriticNode = async (state: ThreadFactoryStateType) => {
  const schema = z.object({
    is_approved: z.boolean(),
    critique: z.string()
  });

  const agents = buildAgents(
    [criticPrimaryLlm, criticFallbackLlm],
    {
      tools: [ContentAuthenticityCheckerTool],
      systemPrompt: VIRALITY_CRITIC_NODE_PROMPT,
      responseFormat: schema
    }
  );

  let result;
  let parse_success = false;

  try {
    result = await invokeWithFallbacks(agents, {
      messages: [
        { role: "user", content: `SOURCE MATERIAL:\n${state.raw_markdown}\n\nTHREAD:\n${JSON.stringify(state.thread_draft, null, 2)}` }
      ]
    });
    parse_success = true;
  } catch (_e) {
    parse_success = false;
  }

  let finalCritique = "";
  let finalApproval = false;

  if (parse_success && result?.structuredResponse) {
    finalCritique = result.structuredResponse.critique || "";
    finalApproval = result.structuredResponse.is_approved || false;
  } else {
    parse_success = false;
  }

  if (!parse_success) {
    return {
      retries: { ...(state.retries || {}), critic: (state.retries?.critic || 0) + 1 },
      parse_success: false
    };
  }

  return {
    is_approved: finalApproval,
    critique: finalCritique,
    iterations: state.iterations + 1,
    retries: { ...(state.retries || {}), critic: (state.retries?.critic || 0) + 1 },
    parse_success: true
  };
};
