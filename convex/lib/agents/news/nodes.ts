"use node";

import { interrupt } from "@langchain/langgraph";
import { providerStrategy } from "langchain";
import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import {
  googleGemini35FlashT00Key1,
  openAiGpt54MiniT00Timeout25k, googleGemini3FlashPreviewT00Key1, googleGemini3FlashPreviewT00Key2,
  openAiGpt54MiniT08Timeout20k, openRouterFreeT08,
  googleGemini31FlashLiteT08Key1, googleGemini31FlashLiteT08Key2,
  openAiGpt54MiniT01Max2kTimeout45k,
  googleGemini31FlashLiteT01Key1Max2k, googleGemini31FlashLiteT01Key2Max2k,
  openAiGpt54T08Penalty04Timeout30k, googleGemini3FlashPreviewT08Key1, googleGemini3FlashPreviewT08Key2,
  googleGemini35FlashT08Key1, deepSeekV4ProT085ReasoningNone, deepSeekV4ProT00ReasoningHigh,
} from "../models.js";
import {
  NEWS_HOOK_PROMPT,
  NEWS_SCRAPER_PROMPT,
  NEWS_WRITER_PROMPT,
  NEWS_CRITIC_PROMPT
} from "./prompts.js";
import { NewsThreadFactoryStateType } from "./state.js";
import { ContentAuthenticityCheckerTool, TopicContextExpanderTool, WebScraperTool } from "./tools.js";
import { CharacterValidatorTool } from "../tools.js";
import { buildAgents, invokeWithFallbacks } from "../utils.js";


export const ScraperNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  const scraperResultStr = await WebScraperTool.invoke({ url: state.url }, config);
  let markdown = scraperResultStr as string;
  let images: string[] = [];
  try {
    const parsed = JSON.parse(scraperResultStr as string);
    markdown = parsed.markdown;
    images = parsed.images || [];
  } catch (e) {
    // Fallback if the tool returned raw string
  }

  const llm = googleGemini31FlashLiteT01Key1Max2k.withFallbacks({ fallbacks: [googleGemini31FlashLiteT01Key2Max2k, openAiGpt54MiniT01Max2kTimeout45k] });

  try {
    const summary = await llm.invoke([
      { role: "system", content: NEWS_SCRAPER_PROMPT },
      { role: "user", content: markdown as string }
    ], config);
    return {
      raw_markdown: summary.content as string,
      images,
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

export const HookStrategistNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  const schema = z.object({
    core_hooks: z.array(z.string()).min(1, "Must generate at least one hook"),
    selected_hook: z.string().min(1, "Must select a hook")
  });

  const agents = buildAgents(
    [googleGemini31FlashLiteT08Key1, googleGemini31FlashLiteT08Key2, openAiGpt54MiniT08Timeout20k, openRouterFreeT08],
    {
      tools: [TopicContextExpanderTool],
      systemPrompt: NEWS_HOOK_PROMPT,
      responseFormat: providerStrategy(schema)
    }
  );

  let result;
  let parse_success = false;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    result = await invokeWithFallbacks(agents, {
      messages: [{ role: "user", content: `<SOURCE>\n${state.raw_markdown}\n</SOURCE>${guidanceContext}` }]
    }, config);
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

export const ThreadWriterNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  const schema = z.object({
    thread_draft: z.array(z.string()).min(1, "Must generate at least one post for the thread draft")
  });

  const structuredLlm = googleGemini35FlashT08Key1.withStructuredOutput(schema, { name: "thread_writer", method: "jsonSchema" }).withFallbacks({
    fallbacks: [
      deepSeekV4ProT085ReasoningNone.withStructuredOutput(schema, { name: "thread_writer", method: "jsonMode" }),
      openAiGpt54T08Penalty04Timeout30k.withStructuredOutput(schema, { name: "thread_writer", method: "jsonSchema" }),
      googleGemini3FlashPreviewT08Key1.withStructuredOutput(schema, { name: "thread_writer", method: "jsonSchema" }),
      googleGemini3FlashPreviewT08Key2.withStructuredOutput(schema, { name: "thread_writer", method: "jsonSchema" })
    ]
  });

  const previousDraftContext = state.thread_draft && state.thread_draft.length > 0
    ? `\n\n<PREVIOUS_THREAD_DRAFT>\n${JSON.stringify(state.thread_draft, null, 2)}\n</PREVIOUS_THREAD_DRAFT>`
    : "";
  const critiqueContext = state.critique ? `\n\n<CRITIQUE_TO_ADDRESS>\n${state.critique}\n</CRITIQUE_TO_ADDRESS>` : "";
  let postCritiquesContext = "";
  if (state.post_critiques && state.post_critiques.length > 0) {
    postCritiquesContext = "\n\n<POST_SPECIFIC_CRITIQUES>\n" +
      state.post_critiques.map(pc => `Post ${pc.post_index}: ${pc.critique}`).join("\n") +
      "\n</POST_SPECIFIC_CRITIQUES>";
  }
  const charCritiqueContext = state.character_critique ? `\n\n<CHARACTER_AND_FORMATTING_CONSTRAINTS_FAILED>\n${state.character_critique}\nFix the previous draft to respect these exact formatting constraints.\n</CHARACTER_AND_FORMATTING_CONSTRAINTS_FAILED>` : "";
  const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";

  let draft;
  let parse_success = true;
  try {
    draft = await structuredLlm.invoke([
      { role: "system", content: NEWS_WRITER_PROMPT },
      { role: "user", content: `<HOOK>\n${state.selected_hook}\n</HOOK>\n\n<SOURCE>\n${state.raw_markdown}\n</SOURCE>${previousDraftContext}${critiqueContext}${postCritiquesContext}${charCritiqueContext}${guidanceContext}` }
    ], { ...config, timeout: 300000 });
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

export const CharacterValidatorNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  const validationStr = await CharacterValidatorTool.invoke({ thread_draft: state.thread_draft }, config);
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

export const ViralityCriticNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  const schema = z.object({
    virality_score: z.number(),
    overall_critique: z.string(),
    post_critiques: z.array(z.object({
      post_index: z.number(),
      critique: z.string()
    }))
  });

  const agents = buildAgents(
    [
      googleGemini35FlashT00Key1,
      deepSeekV4ProT00ReasoningHigh,
      openAiGpt54MiniT00Timeout25k,
      googleGemini3FlashPreviewT00Key1, googleGemini3FlashPreviewT00Key2
    ],
    {
      tools: [ContentAuthenticityCheckerTool],
      systemPrompt: NEWS_CRITIC_PROMPT,
      responseFormat: providerStrategy(schema)
    }
  );

  let result;
  let parse_success = false;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    result = await invokeWithFallbacks(agents, {
      messages: [
        { role: "user", content: `<CURRENT_ITERATION_ATTEMPT>\n${state.iterations + 1}\n</CURRENT_ITERATION_ATTEMPT>\n\n<SOURCE_MATERIAL>\n${state.raw_markdown}\n</SOURCE_MATERIAL>\n\n<THREAD>\n${JSON.stringify(state.thread_draft, null, 2)}\n</THREAD>${guidanceContext}` }
      ]
    }, { ...config, timeout: 300000 });
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
    virality_score = result.structuredResponse.virality_score;
    finalApproval = typeof virality_score === 'number' && virality_score >= 85;
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

export const ManualHookSelectionNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  const selected_hook = interrupt({
    core_hooks: state.core_hooks,
    action: "Please select a hook to proceed."
  });
  return { selected_hook: selected_hook as string };
};
