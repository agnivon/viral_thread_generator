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
  scraperPrimaryLlm, scraperPrimaryLlmBackup, scraperFallbackLlm,
  hookPrimaryLlm, hookPrimaryLlmBackup, hookFallbackLlm1, hookFallbackLlm2,
  writerPrimaryLlm, writerPrimaryLlmBackup, writerFallbackLlm1, writerFallbackLlm2, writerFallbackLlm2Backup,
  criticPrimaryLlm, criticPrimaryLlmBackup, criticFallbackLlm
} from "./models.js";

export const ScraperNode = async (state: ThreadFactoryStateType) => {
  const markdown = await WebScraperTool.invoke({ url: state.url });

  const llm = scraperPrimaryLlm.withFallbacks({ fallbacks: [scraperPrimaryLlmBackup, scraperFallbackLlm] });

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
    [hookPrimaryLlm, hookPrimaryLlmBackup, hookFallbackLlm1, hookFallbackLlm2],
    {
      tools: [TopicContextExpanderTool],
      systemPrompt: HOOK_STRATEGIST_NODE_PROMPT,
      responseFormat: schema
    }
  );

  let result;
  let parse_success = false;

  try {
    const guidanceContext = state.guidance ? `\n\nADDITIONAL GUIDANCE:\n${state.guidance}` : "";
    result = await invokeWithFallbacks(agents, {
      messages: [{ role: "user", content: `${state.raw_markdown}${guidanceContext}` }]
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
      writerPrimaryLlmBackup.withStructuredOutput(schema, { name: "thread_writer", method: "jsonSchema" }),
      writerFallbackLlm1.withStructuredOutput(schema, { name: "thread_writer" }),
      writerFallbackLlm2.withStructuredOutput(schema, { name: "thread_writer" }),
      writerFallbackLlm2Backup.withStructuredOutput(schema, { name: "thread_writer" })
    ]
  });

  const previousDraftContext = state.thread_draft && state.thread_draft.length > 0
    ? `\n\nPREVIOUS THREAD DRAFT:\n${JSON.stringify(state.thread_draft, null, 2)}`
    : "";
  const critiqueContext = state.critique ? `\n\nCRITIQUE TO ADDRESS:\n${state.critique}` : "";
  let postCritiquesContext = "";
  if (state.post_critiques && state.post_critiques.length > 0) {
    postCritiquesContext = "\n\nPOST-SPECIFIC CRITIQUES:\n" + 
      state.post_critiques.map(pc => `Post ${pc.post_index}: ${pc.critique}`).join("\n");
  }
  const charCritiqueContext = state.character_critique ? `\n\nCHARACTER & FORMATTING CONSTRAINTS FAILED:\n${state.character_critique}\nFix the previous draft to respect these exact formatting constraints.` : "";
  const guidanceContext = state.guidance ? `\n\nADDITIONAL GUIDANCE:\n${state.guidance}` : "";

  let draft;
  let parse_success = true;
  try {
    draft = await structuredLlm.invoke([
      { role: "system", content: THREAD_WRITER_NODE_PROMPT },
      { role: "user", content: `HOOK:\n${state.selected_hook}\n\nSOURCE:\n${state.raw_markdown}${previousDraftContext}${critiqueContext}${postCritiquesContext}${charCritiqueContext}${guidanceContext}` }
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
      character_critique: `FORMATTING ERRORS REQUIRED TO FIX:\n${validation.errors.join("\n")}`,
      retries: { ...(state.retries || {}), validator: (state.retries?.validator || 0) + 1 }
    };
  }

  return {
    is_character_valid: true,
    character_critique: ""
  };
};

export const ViralityCriticNode = async (state: ThreadFactoryStateType) => {
  const schema = z.object({
    is_approved: z.boolean(),
    virality_score: z.number(),
    overall_critique: z.string(),
    post_critiques: z.array(z.object({
      post_index: z.number(),
      critique: z.string()
    }))
  });

  const agents = buildAgents(
    [criticPrimaryLlm, criticPrimaryLlmBackup, criticFallbackLlm],
    {
      tools: [ContentAuthenticityCheckerTool],
      systemPrompt: VIRALITY_CRITIC_NODE_PROMPT,
      responseFormat: schema
    }
  );

  let result;
  let parse_success = false;

  try {
    const guidanceContext = state.guidance ? `\n\nADDITIONAL GUIDANCE:\n${state.guidance}` : "";
    result = await invokeWithFallbacks(agents, {
      messages: [
        { role: "user", content: `SOURCE MATERIAL:\n${state.raw_markdown}\n\nTHREAD:\n${JSON.stringify(state.thread_draft, null, 2)}${guidanceContext}` }
      ]
    }, { timeout: 300000 });
    parse_success = true;
  } catch (_e) {
    parse_success = false;
  }

  let finalCritique = "";
  let finalApproval = false;
  let virality_score;
  let post_critiques: { post_index: number; critique: string }[] = [];

  if (parse_success && result?.structuredResponse) {
    finalCritique = result.structuredResponse.overall_critique || "";
    finalApproval = result.structuredResponse.is_approved || false;
    virality_score = result.structuredResponse.virality_score;
    post_critiques = result.structuredResponse.post_critiques || [];
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
    virality_score,
    post_critiques,
    iterations: state.iterations + 1,
    retries: { ...(state.retries || {}), critic: (state.retries?.critic || 0) + 1, validator: 0 },
    parse_success: true
  };
};
