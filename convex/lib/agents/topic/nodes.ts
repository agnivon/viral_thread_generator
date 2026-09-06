"use node";

import { z } from "zod";
import { interrupt } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { providerStrategy } from "langchain";
import {
  googleGemini38FlashT00Key1, googleGemini38FlashT00Key2,
  googleGemini37FlashT00Key1, googleGemini37FlashT00Key2,
  googleGemini36FlashT00Key1, googleGemini36FlashT00Key2,
  googleGemini35FlashT00Key1, googleGemini35FlashT00Key2,
  openAiGpt54MiniT00, googleGemini3FlashPreviewT00Key1, googleGemini3FlashPreviewT00Key2,
  googleGemini31FlashLiteT08Key1, googleGemini31FlashLiteT08Key2, openAiGpt54MiniT08,
  googleGemini31FlashLiteT01Key1, googleGemini31FlashLiteT01Key2, openAiGpt54MiniT01,
  googleGemini38FlashT08Key1, googleGemini38FlashT08Key2,
  googleGemini37FlashT08Key1, googleGemini37FlashT08Key2,
  googleGemini36FlashT08Key1, googleGemini36FlashT08Key2,
  googleGemini35FlashT08Key1, googleGemini35FlashT08Key2,
  deepSeekV4ProT085ReasoningNone, deepSeekV4ProT00ReasoningHigh, openAiGpt54T08Penalty04, googleGemini3FlashPreviewT08Key1, googleGemini3FlashPreviewT08Key2,
  googleGemini31FlashLiteT02Key1, googleGemini31FlashLiteT02Key2, openAiGpt54MiniT02,
  googleGemini35FlashLiteT01Key1, googleGemini35FlashLiteT01Key2,
  googleGemini35FlashLiteT08Key1, googleGemini35FlashLiteT08Key2,
  googleGemini35FlashLiteT02Key1, googleGemini35FlashLiteT02Key2
} from "../models.js";
import {
  TOPIC_RESEARCH_ORCHESTRATOR_PROMPT,
  TOPIC_DEEP_PAGE_SCRAPER_PROMPT,
  TOPIC_HOOK_STRATEGIST_PROMPT,
  TOPIC_THREAD_WRITER_PROMPT,
  TOPIC_VIRALITY_CRITIC_PROMPT
} from "./prompts.js";
import { TopicThreadFactoryStateType } from "./state.js";
import {
  TavilySearchTool,
  DuckDuckGoSearchTool,
  JinaReaderTool,
  FirecrawlScrapeTool,
  TopicCharacterValidatorTool
} from "./tools.js";
import { buildAgents, invokeWithFallbacks, withTimeout, normalizeResearchDossier } from "../utils.js";

const topicResearchOrchestratorSchema = z.object({
  research_dossier: z.string().min(1, "Must generate research dossier"),
  urls_to_scrape: z.array(z.string()).optional()
});

const topicResearchOrchestratorAgents = buildAgents(
  [
    googleGemini35FlashLiteT02Key1,
    googleGemini35FlashLiteT02Key2,
    googleGemini31FlashLiteT02Key1,
    googleGemini31FlashLiteT02Key2,
    openAiGpt54MiniT02
  ],
  {
    tools: [DuckDuckGoSearchTool, TavilySearchTool],
    systemPrompt: TOPIC_RESEARCH_ORCHESTRATOR_PROMPT,
    responseFormat: providerStrategy(topicResearchOrchestratorSchema)
  }
);

export const ResearchOrchestratorNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  let result;
  let parse_success = false;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    const descriptionContext = state.description ? `\n\n<DESCRIPTION>\n${state.description}\n</DESCRIPTION>` : "";

    result = await invokeWithFallbacks(topicResearchOrchestratorAgents, {
      messages: [{ role: "user", content: `<TOPIC>\n${state.topic}\n</TOPIC>${descriptionContext}${guidanceContext}` }]
    }, { ...config, timeout: 60000 });
    parse_success = true;
  } catch (_e) {
    parse_success = false;
  }

  let research_dossier = "";
  let urls_to_scrape: string[] = [];

  if (parse_success && result) {
    const rawDossier = result.structuredResponse?.research_dossier ?? result.structuredResponse;
    if (rawDossier) {
      research_dossier = normalizeResearchDossier(rawDossier);
    } else if (Array.isArray(result.messages) && result.messages.length > 0) {
      const lastMsg = result.messages[result.messages.length - 1];
      if (lastMsg?.content) {
        research_dossier = normalizeResearchDossier(lastMsg.content);
      }
    }
    urls_to_scrape = result.structuredResponse?.urls_to_scrape || [];
  } else {
    parse_success = false;
  }

  if (parse_success && research_dossier) {
    return {
      research_dossier,
      urls_to_scrape,
      parse_success: true,
      retries: { ...(state.retries || {}), orchestrator: 0 }
    };
  } else {
    return {
      research_dossier: state.research_dossier || "",
      urls_to_scrape: [],
      parse_success: false,
      retries: { ...(state.retries || {}), orchestrator: (state.retries?.orchestrator || 0) + 1 }
    };
  }
};

const topicDeepScraperSchema = z.object({
  research_dossier: z.string().min(1, "Must append to dossier")
});

const topicDeepScraperModels = [
  googleGemini35FlashLiteT01Key1.withStructuredOutput(topicDeepScraperSchema, { name: "deep_scraper", method: "jsonSchema" }),
  googleGemini35FlashLiteT01Key2.withStructuredOutput(topicDeepScraperSchema, { name: "deep_scraper", method: "jsonSchema" }),
  googleGemini31FlashLiteT01Key1.withStructuredOutput(topicDeepScraperSchema, { name: "deep_scraper", method: "jsonSchema" }),
  googleGemini31FlashLiteT01Key2.withStructuredOutput(topicDeepScraperSchema, { name: "deep_scraper", method: "jsonSchema" }),
  openAiGpt54MiniT01.withStructuredOutput(topicDeepScraperSchema, { name: "deep_scraper", method: "jsonSchema" })
];

export const DeepPageScraperNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  if (!state.urls_to_scrape || state.urls_to_scrape.length === 0) {
    return { parse_success: true };
  }

  let scrapeResult = "";

  const scrapePromises = state.urls_to_scrape.map(async (url) => {
    try {
      const jinaResultStr = await JinaReaderTool.invoke({ url }, { ...config, timeout: 60000 });
      const parsedJina = JSON.parse(jinaResultStr);

      if (parsedJina.error || !parsedJina.markdown || parsedJina.markdown.includes("Enable JavaScript")) {
        const firecrawlResultStr = await FirecrawlScrapeTool.invoke({ url }, { ...config, timeout: 60000 });
        const parsedFirecrawl = JSON.parse(firecrawlResultStr);
        return { text: `URL: ${url}\nContent:\n${parsedFirecrawl.markdown || ""}\n\n`, images: parsedFirecrawl.images || [] };
      } else {
        return { text: `URL: ${url}\nContent:\n${parsedJina.markdown || ""}\n\n`, images: parsedJina.images || [] };
      }
    } catch {
      return { text: `URL: ${url}\nContent:\n(Failed to scrape)\n\n`, images: [] };
    }
  });

  const results = await Promise.all(scrapePromises);
  scrapeResult = results.map(r => r.text).join("---\n");
  const allImages = results.flatMap(r => r.images).filter(Boolean);

  let result;
  let parse_success = true;

  try {
    result = await invokeWithFallbacks(
      topicDeepScraperModels,
      [
        { role: "system", content: TOPIC_DEEP_PAGE_SCRAPER_PROMPT },
        { role: "user", content: `<CURRENT_DOSSIER>\n${state.research_dossier}\n</CURRENT_DOSSIER>\n\n<SCRAPED_CONTENT>\n${scrapeResult}\n</SCRAPED_CONTENT>` }
      ],
      { ...config, timeout: 60000 }
    );
    if (!result || !result.research_dossier) parse_success = false;
  } catch (_e) {
    parse_success = false;
  }

  return {
    research_dossier: parse_success && result?.research_dossier ? normalizeResearchDossier(result.research_dossier) : state.research_dossier,
    images: [...(state.images || []), ...allImages],
    parse_success,
    retries: { ...(state.retries || {}), scraper: (state.retries?.scraper || 0) + 1 }
  };
};

const topicHookStrategistSchema = z.object({
  core_hooks: z.array(z.string()),
  selected_hook: z.string()
});

const topicHookStrategistModels = [
  googleGemini35FlashLiteT08Key1.withStructuredOutput(topicHookStrategistSchema, { name: "hook_strategist", method: "jsonSchema" }),
  googleGemini35FlashLiteT08Key2.withStructuredOutput(topicHookStrategistSchema, { name: "hook_strategist", method: "jsonSchema" }),
  googleGemini31FlashLiteT08Key1.withStructuredOutput(topicHookStrategistSchema, { name: "hook_strategist", method: "jsonSchema" }),
  googleGemini31FlashLiteT08Key2.withStructuredOutput(topicHookStrategistSchema, { name: "hook_strategist", method: "jsonSchema" }),
  openAiGpt54MiniT08.withStructuredOutput(topicHookStrategistSchema, { name: "hook_strategist", method: "jsonSchema" })
];

export const HookStrategistNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  let result;
  let parse_success = true;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    result = await invokeWithFallbacks(
      topicHookStrategistModels,
      [
        { role: "system", content: TOPIC_HOOK_STRATEGIST_PROMPT },
        { role: "user", content: `<DOSSIER>\n${state.research_dossier}\n</DOSSIER>${guidanceContext}` }
      ],
      { ...config, timeout: 45000 }
    );
    if (!result) parse_success = false;
  } catch (_e) {
    parse_success = false;
  }

  return {
    core_hooks: parse_success && result ? result.core_hooks : ["Placeholder Hook 1", "Placeholder Hook 2"],
    selected_hook: parse_success && result ? result.selected_hook : "Placeholder Hook",
    parse_success,
    retries: { ...(state.retries || {}), hook: (state.retries?.hook || 0) + 1 }
  };
};

const topicThreadWriterSchema = z.object({
  thread_draft: z.array(z.string())
});

const topicThreadWriterModels = [
  googleGemini38FlashT08Key1.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini38FlashT08Key2.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000),
  googleGemini37FlashT08Key1.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini37FlashT08Key2.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000),
  googleGemini36FlashT08Key1.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini36FlashT08Key2.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000),
  googleGemini35FlashT08Key1.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini35FlashT08Key2.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000),
  deepSeekV4ProT085ReasoningNone.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonMode" }),
  openAiGpt54T08Penalty04.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  googleGemini3FlashPreviewT08Key1.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini3FlashPreviewT08Key2.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000)
];

export const ThreadWriterNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  let result;
  let parse_success = true;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    let critiqueContext = "";
    if ((state.post_critiques && state.post_critiques.length > 0) || state.character_critique) {
      let critiqueStr = "";
      if (state.post_critiques && state.post_critiques.length > 0) {
        critiqueStr += state.post_critiques.map(pc => `Post ${pc.post_index}: ${pc.critique}${pc.fix_directive ? `\nFix Directive: ${pc.fix_directive}` : ''}`).join("\n\n");
      }
      if (state.character_critique) {
        critiqueStr += (critiqueStr ? "\n\n" : "") + state.character_critique;
      }
      critiqueContext = `\n\n<CURRENT_DRAFT>\n${JSON.stringify(state.thread_draft, null, 2)}\n</CURRENT_DRAFT>\n\n<CRITIQUES>\n${critiqueStr}\n</CRITIQUES>`;
    }

    result = await invokeWithFallbacks(
      topicThreadWriterModels,
      [
        { role: "system", content: TOPIC_THREAD_WRITER_PROMPT },
        { role: "user", content: `<HOOK>\n${state.selected_hook}\n</HOOK>\n<DOSSIER>\n${state.research_dossier}\n</DOSSIER>${guidanceContext}${critiqueContext}` }
      ],
      { ...config, timeout: 180000 }
    );
    if (!result) parse_success = false;
  } catch (_e) {
    parse_success = false;
  }

  return {
    thread_draft: parse_success && result ? result.thread_draft : ["Placeholder Post 1", "Placeholder Post 2"],
    parse_success,
    retries: { ...(state.retries || {}), writer: (state.retries?.writer || 0) + 1 }
  };
};

const topicViralityCriticSchema = z.object({
  virality_score: z.number(),
  critique: z.string().optional(),
  post_critiques: z.array(z.object({
    post_index: z.number(),
    critique: z.string(),
    fix_directive: z.string().optional()
  }))
});

const topicViralityCriticModels = [
  googleGemini38FlashT00Key1.withStructuredOutput(topicViralityCriticSchema, { name: "virality_critic", method: "jsonSchema" }),
  withTimeout(googleGemini38FlashT00Key2.withStructuredOutput(topicViralityCriticSchema, { name: "virality_critic", method: "jsonSchema" }), 45000),
  googleGemini37FlashT00Key1.withStructuredOutput(topicViralityCriticSchema, { name: "virality_critic", method: "jsonSchema" }),
  withTimeout(googleGemini37FlashT00Key2.withStructuredOutput(topicViralityCriticSchema, { name: "virality_critic", method: "jsonSchema" }), 45000),
  googleGemini36FlashT00Key1.withStructuredOutput(topicViralityCriticSchema, { name: "virality_critic", method: "jsonSchema" }),
  withTimeout(googleGemini36FlashT00Key2.withStructuredOutput(topicViralityCriticSchema, { name: "virality_critic", method: "jsonSchema" }), 45000),
  googleGemini35FlashT00Key1.withStructuredOutput(topicViralityCriticSchema, { name: "virality_critic", method: "jsonSchema" }),
  withTimeout(googleGemini35FlashT00Key2.withStructuredOutput(topicViralityCriticSchema, { name: "virality_critic", method: "jsonSchema" }), 45000),
  deepSeekV4ProT00ReasoningHigh.withStructuredOutput(topicViralityCriticSchema, { name: "virality_critic", method: "jsonMode" }),
  openAiGpt54MiniT00.withStructuredOutput(topicViralityCriticSchema, { name: "virality_critic", method: "jsonSchema" }),
  googleGemini3FlashPreviewT00Key1.withStructuredOutput(topicViralityCriticSchema, { name: "virality_critic", method: "jsonSchema" }),
  withTimeout(googleGemini3FlashPreviewT00Key2.withStructuredOutput(topicViralityCriticSchema, { name: "virality_critic", method: "jsonSchema" }), 45000)
];

export const ViralityCriticNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  let result;
  let parse_success = true;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    result = await invokeWithFallbacks(
      topicViralityCriticModels,
      [
        { role: "system", content: TOPIC_VIRALITY_CRITIC_PROMPT },
        { role: "user", content: `<THREAD>\n${JSON.stringify(state.thread_draft, null, 2)}\n</THREAD>${guidanceContext}` }
      ],
      { ...config, timeout: 120000 }
    );
    if (!result) parse_success = false;
  } catch (_e) {
    parse_success = false;
  }

  return {
    virality_score: parse_success && result ? result.virality_score : 85,
    critique: parse_success && result ? result.critique : undefined,
    post_critiques: parse_success && result ? result.post_critiques : [],
    is_approved: parse_success && result && result.virality_score >= 85 ? true : false,
    iterations: state.iterations + 1,
    parse_success,
    retries: { ...(state.retries || {}), critic: (state.retries?.critic || 0) + 1 }
  };
};

export const TopicCharacterValidatorNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  const validationStr = await TopicCharacterValidatorTool.invoke({ thread_draft: state.thread_draft }, { ...config, timeout: 60000 });
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

export const ManualHookSelectionNode = async (state: TopicThreadFactoryStateType, _config?: RunnableConfig) => {
  const selected_hook = interrupt({
    core_hooks: state.core_hooks,
    action: "Please select a hook to proceed."
  });
  return { selected_hook: selected_hook as string };
};
