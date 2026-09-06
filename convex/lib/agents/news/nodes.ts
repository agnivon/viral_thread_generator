"use node";

import { interrupt } from "@langchain/langgraph";
import { providerStrategy } from "langchain";
import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import {
  googleGemini38FlashT00Key1, googleGemini38FlashT00Key2,
  googleGemini37FlashT00Key1, googleGemini37FlashT00Key2,
  googleGemini36FlashT00Key1, googleGemini36FlashT00Key2,
  googleGemini35FlashT00Key1, googleGemini35FlashT00Key2,
  openAiGpt54MiniT00, googleGemini3FlashPreviewT00Key1, googleGemini3FlashPreviewT00Key2,
  openAiGpt54MiniT08, openRouterFreeT08,
  googleGemini31FlashLiteT08Key1, googleGemini31FlashLiteT08Key2,
  openAiGpt54MiniT01,
  googleGemini31FlashLiteT01Key1, googleGemini31FlashLiteT01Key2,
  openAiGpt54T08Penalty04, googleGemini3FlashPreviewT08Key1, googleGemini3FlashPreviewT08Key2,
  googleGemini38FlashT08Key1, googleGemini38FlashT08Key2,
  googleGemini37FlashT08Key1, googleGemini37FlashT08Key2,
  googleGemini36FlashT08Key1, googleGemini36FlashT08Key2,
  googleGemini35FlashT08Key1, googleGemini35FlashT08Key2,
  deepSeekV4ProT085ReasoningNone, deepSeekV4ProT00ReasoningHigh,
  googleGemini31FlashLiteT02Key1, googleGemini31FlashLiteT02Key2, openAiGpt54MiniT02,
  googleGemini35FlashLiteT01Key1, googleGemini35FlashLiteT01Key2,
  googleGemini35FlashLiteT08Key1, googleGemini35FlashLiteT08Key2,
  googleGemini35FlashLiteT02Key1, googleGemini35FlashLiteT02Key2
} from "../models.js";
import {
  NEWS_HOOK_PROMPT,
  NEWS_SCRAPER_PROMPT,
  NEWS_WRITER_PROMPT,
  NEWS_CRITIC_PROMPT,
  NEWS_RESEARCHER_PROMPT
} from "./prompts.js";
import { NewsThreadFactoryStateType } from "./state.js";
import { BackgroundDossierTool, ContentAuthenticityCheckerTool, WebScraperTool, YoutubeScraperTool } from "./tools.js";
import { CharacterValidatorTool } from "../tools.js";
import { buildAgents, invokeWithFallbacks, withTimeout, normalizeResearchDossier } from "../utils.js";


const scraperModels = [
  googleGemini35FlashLiteT01Key1,
  googleGemini35FlashLiteT01Key2,
  googleGemini31FlashLiteT01Key1,
  googleGemini31FlashLiteT01Key2,
  openAiGpt54MiniT01
];

export const ScraperNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  const isYoutube = state.url.includes("youtube.com") || state.url.includes("youtu.be");
  const scraperResultStr = isYoutube
    ? await YoutubeScraperTool.invoke({ url: state.url }, { ...config, timeout: 60000 })
    : await WebScraperTool.invoke({ url: state.url }, { ...config, timeout: 60000 });
  let markdown = scraperResultStr;
  let images: string[] = [];
  try {
    const parsed = JSON.parse(scraperResultStr);
    markdown = parsed.markdown;
    images = parsed.images || [];
  } catch {
    // Fallback if the tool returned raw string
  }

  try {
    const summary = await invokeWithFallbacks(
      scraperModels,
      [
        { role: "system", content: NEWS_SCRAPER_PROMPT },
        { role: "user", content: markdown }
      ],
      { ...config, timeout: 60000 }
    );
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

const newsResearcherSchema = z.object({
  research_context: z.string().min(1, "Must generate research context")
});

const newsContextResearcherAgents = buildAgents(
  [
    googleGemini35FlashLiteT02Key1,
    googleGemini35FlashLiteT02Key2,
    googleGemini31FlashLiteT02Key1,
    googleGemini31FlashLiteT02Key2,
    openAiGpt54MiniT02
  ],
  {
    tools: [BackgroundDossierTool],
    systemPrompt: NEWS_RESEARCHER_PROMPT,
    responseFormat: providerStrategy(newsResearcherSchema)
  }
);

export const ContextResearcherNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  let result;
  let parse_success = false;

  try {
    result = await invokeWithFallbacks(newsContextResearcherAgents, {
      messages: [{ role: "user", content: `<SOURCE>\n${state.raw_markdown}\n</SOURCE>` }]
    }, { ...config, timeout: 60000 });
    parse_success = true;
  } catch (_e) {
    parse_success = false;
  }

  let research_context = "";

  if (parse_success && result) {
    const rawContext = result.structuredResponse?.research_context ?? result.structuredResponse;
    if (rawContext) {
      research_context = normalizeResearchDossier(rawContext);
    } else if (Array.isArray(result.messages) && result.messages.length > 0) {
      const lastMsg = result.messages[result.messages.length - 1];
      if (lastMsg?.content) {
        research_context = normalizeResearchDossier(lastMsg.content);
      }
    }
  }

  if (parse_success && research_context) {
    return {
      research_context,
      parse_success: true,
      retries: { ...(state.retries || {}), researcher: 0 }
    };
  } else {
    return {
      parse_success: false,
      retries: { ...(state.retries || {}), researcher: (state.retries?.researcher || 0) + 1 }
    };
  }
};

const newsHookSchema = z.object({
  core_hooks: z.array(z.string()).min(1, "Must generate at least one hook"),
  selected_hook: z.string().min(1, "Must select a hook")
});

const newsHookStrategistAgents = buildAgents(
  [
    googleGemini35FlashLiteT08Key1,
    googleGemini35FlashLiteT08Key2,
    googleGemini31FlashLiteT08Key1,
    googleGemini31FlashLiteT08Key2,
    openAiGpt54MiniT08,
    openRouterFreeT08
  ],
  {
    systemPrompt: NEWS_HOOK_PROMPT,
    responseFormat: providerStrategy(newsHookSchema)
  }
);

export const HookStrategistNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  let result;
  let parse_success = false;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    const researchContext = state.research_context ? `\n\n<RESEARCH_CONTEXT>\n${state.research_context}\n</RESEARCH_CONTEXT>` : "";
    result = await invokeWithFallbacks(newsHookStrategistAgents, {
      messages: [{ role: "user", content: `<SOURCE>\n${state.raw_markdown}\n</SOURCE>${researchContext}${guidanceContext}` }]
    }, { ...config, timeout: 45000 });
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

const newsWriterSchema = z.object({
  thread_draft: z.array(z.string()).min(1, "Must generate at least one post for the thread draft")
});

const newsThreadWriterModels = [
  googleGemini38FlashT08Key1.withStructuredOutput(newsWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini38FlashT08Key2.withStructuredOutput(newsWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000),
  googleGemini37FlashT08Key1.withStructuredOutput(newsWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini37FlashT08Key2.withStructuredOutput(newsWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000),
  googleGemini36FlashT08Key1.withStructuredOutput(newsWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini36FlashT08Key2.withStructuredOutput(newsWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000),
  googleGemini35FlashT08Key1.withStructuredOutput(newsWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini35FlashT08Key2.withStructuredOutput(newsWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000),
  deepSeekV4ProT085ReasoningNone.withStructuredOutput(newsWriterSchema, { name: "thread_writer", method: "jsonMode" }),
  openAiGpt54T08Penalty04.withStructuredOutput(newsWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  googleGemini3FlashPreviewT08Key1.withStructuredOutput(newsWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini3FlashPreviewT08Key2.withStructuredOutput(newsWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000)
];

export const ThreadWriterNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
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
  const researchContext = state.research_context ? `\n\n<RESEARCH_CONTEXT>\n${state.research_context}\n</RESEARCH_CONTEXT>` : "";

  let draft;
  let parse_success = true;
  try {
    draft = await invokeWithFallbacks(
      newsThreadWriterModels,
      [
        { role: "system", content: NEWS_WRITER_PROMPT },
        { role: "user", content: `<HOOK>\n${state.selected_hook}\n</HOOK>\n\n<SOURCE>\n${state.raw_markdown}\n</SOURCE>${researchContext}${previousDraftContext}${critiqueContext}${postCritiquesContext}${charCritiqueContext}${guidanceContext}` }
      ],
      { ...config, timeout: 180000 }
    );
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
  const validationStr = await CharacterValidatorTool.invoke({ thread_draft: state.thread_draft }, { ...config, timeout: 60000 });
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

const newsCriticSchema = z.object({
  virality_score: z.number(),
  overall_critique: z.string(),
  post_critiques: z.array(z.object({
    post_index: z.number(),
    critique: z.string()
  }))
});

const newsViralityCriticAgents = buildAgents(
  [
    googleGemini38FlashT00Key1,
    withTimeout(googleGemini38FlashT00Key2, 45000),
    googleGemini37FlashT00Key1,
    withTimeout(googleGemini37FlashT00Key2, 45000),
    googleGemini36FlashT00Key1,
    withTimeout(googleGemini36FlashT00Key2, 45000),
    googleGemini35FlashT00Key1,
    withTimeout(googleGemini35FlashT00Key2, 45000),
    deepSeekV4ProT00ReasoningHigh,
    openAiGpt54MiniT00,
    googleGemini3FlashPreviewT00Key1,
    withTimeout(googleGemini3FlashPreviewT00Key2, 45000)
  ],
  {
    tools: [ContentAuthenticityCheckerTool],
    systemPrompt: NEWS_CRITIC_PROMPT,
    responseFormat: providerStrategy(newsCriticSchema)
  }
);

export const ViralityCriticNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  let result;
  let parse_success = false;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    const researchContext = state.research_context ? `\n\n<RESEARCH_CONTEXT>\n${state.research_context}\n</RESEARCH_CONTEXT>` : "";
    result = await invokeWithFallbacks(newsViralityCriticAgents, {
      messages: [
        { role: "user", content: `<CURRENT_ITERATION_ATTEMPT>\n${state.iterations + 1}\n</CURRENT_ITERATION_ATTEMPT>\n\n<SOURCE_MATERIAL>\n${state.raw_markdown}\n</SOURCE_MATERIAL>${researchContext}\n\n<THREAD>\n${JSON.stringify(state.thread_draft, null, 2)}\n</THREAD>${guidanceContext}` }
      ]
    }, { ...config, timeout: 120000 });
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

export const ManualHookSelectionNode = async (state: NewsThreadFactoryStateType, _config?: RunnableConfig) => {
  const selected_hook = interrupt({
    core_hooks: state.core_hooks,
    action: "Please select a hook to proceed."
  });
  return { selected_hook: selected_hook as string };
};
