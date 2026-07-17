"use node";

import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import { providerStrategy } from "langchain";
import {
  criticPrimaryLlm, criticPrimaryLlmBackup, criticFallbackLlm1, criticFallbackLlm3, criticFallbackLlm3Backup,
  hookPrimaryLlm, hookPrimaryLlmBackup, hookFallbackLlm1, hookFallbackLlm2,
  scraperPrimaryLlm, scraperPrimaryLlmBackup, scraperFallbackLlm,
  writerPrimaryLlm, writerPrimaryLlmBackup, writerFallbackLlm1, writerFallbackLlm3, writerFallbackLlm3Backup,
  researcherPrimaryLlm, researcherPrimaryLlmBackup, researcherFallbackLlm
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
  FirecrawlScrapeTool
} from "./tools.js";
import { buildAgents, invokeWithFallbacks } from "../utils.js";

export const ResearchOrchestratorNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  const schema = z.object({
    research_dossier: z.string().min(1, "Must generate research dossier"),
    needs_deep_scrape: z.boolean(),
    urls_to_scrape: z.array(z.string()).optional()
  });

  const agents = buildAgents(
    [researcherPrimaryLlm, researcherPrimaryLlmBackup, researcherFallbackLlm],
    {
      tools: [DuckDuckGoSearchTool, TavilySearchTool],
      systemPrompt: TOPIC_RESEARCH_ORCHESTRATOR_PROMPT,
      responseFormat: providerStrategy(schema)
    }
  );

  let result;
  let parse_success = false;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    const descriptionContext = state.description ? `\n\n<DESCRIPTION>\n${state.description}\n</DESCRIPTION>` : "";
    
    result = await invokeWithFallbacks(agents, {
      messages: [{ role: "user", content: `<TOPIC>\n${state.topic}\n</TOPIC>${descriptionContext}${guidanceContext}` }]
    }, config);
    parse_success = true;
  } catch (_e) {
    parse_success = false;
  }

  let research_dossier = "";
  let needs_deep_scrape = false;
  let urls_to_scrape: string[] = [];

  if (parse_success && result?.structuredResponse) {
    research_dossier = result.structuredResponse.research_dossier || "";
    needs_deep_scrape = result.structuredResponse.needs_deep_scrape || false;
    urls_to_scrape = result.structuredResponse.urls_to_scrape || [];
  } else {
    parse_success = false;
  }

  return {
    research_dossier,
    needs_deep_scrape,
    urls_to_scrape,
    parse_success,
    retries: { ...(state.retries || {}), orchestrator: (state.retries?.orchestrator || 0) + 1 }
  };
};

export const DeepPageScraperNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  if (!state.urls_to_scrape || state.urls_to_scrape.length === 0) {
    return { parse_success: true };
  }

  let scrapeResult = "";
  
  const scrapePromises = state.urls_to_scrape.map(async (url) => {
    try {
      const jinaResultStr = await JinaReaderTool.invoke({ url }, config);
      const parsedJina = JSON.parse(jinaResultStr as string);
      
      if (parsedJina.error || !parsedJina.markdown || parsedJina.markdown.includes("Enable JavaScript")) {
        const firecrawlResultStr = await FirecrawlScrapeTool.invoke({ url }, config);
        const parsedFirecrawl = JSON.parse(firecrawlResultStr as string);
        return `URL: ${url}\nContent:\n${parsedFirecrawl.markdown || ""}\n\n`;
      } else {
        return `URL: ${url}\nContent:\n${parsedJina.markdown || ""}\n\n`;
      }
    } catch (e) {
      return `URL: ${url}\nContent:\n(Failed to scrape)\n\n`;
    }
  });

  const results = await Promise.all(scrapePromises);
  scrapeResult = results.join("---\n");

  const schema = z.object({
    research_dossier: z.string().min(1, "Must append to dossier")
  });

  const structuredLlm = scraperPrimaryLlm.withStructuredOutput(schema, { name: "deep_scraper", method: "jsonSchema" }).withFallbacks({
    fallbacks: [
      scraperPrimaryLlmBackup.withStructuredOutput(schema, { name: "deep_scraper", method: "jsonSchema" }),
      scraperFallbackLlm.withStructuredOutput(schema, { name: "deep_scraper", method: "jsonSchema" })
    ]
  });

  let result;
  let parse_success = true;

  try {
    result = await structuredLlm.invoke([
      { role: "system", content: TOPIC_DEEP_PAGE_SCRAPER_PROMPT },
      { role: "user", content: `<CURRENT_DOSSIER>\n${state.research_dossier}\n</CURRENT_DOSSIER>\n\n<SCRAPED_CONTENT>\n${scrapeResult}\n</SCRAPED_CONTENT>` }
    ], { ...config, timeout: 300000 });
    if (!result || !result.research_dossier) parse_success = false;
  } catch (_e) {
    parse_success = false;
  }

  return {
    research_dossier: parse_success && result ? result.research_dossier : state.research_dossier,
    parse_success,
    retries: { ...(state.retries || {}), scraper: (state.retries?.scraper || 0) + 1 }
  };
};

export const HookStrategistNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  const schema = z.object({
    core_hooks: z.array(z.string()),
    selected_hook: z.string()
  });

  const structuredLlm = hookPrimaryLlm.withStructuredOutput(schema, { name: "hook_strategist", method: "jsonSchema" }).withFallbacks({
    fallbacks: [
      hookPrimaryLlmBackup.withStructuredOutput(schema, { name: "hook_strategist", method: "jsonSchema" }),
      hookFallbackLlm1.withStructuredOutput(schema, { name: "hook_strategist", method: "jsonSchema" })
    ]
  });

  let result;
  let parse_success = true;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    result = await structuredLlm.invoke([
      { role: "system", content: TOPIC_HOOK_STRATEGIST_PROMPT },
      { role: "user", content: `<DOSSIER>\n${state.research_dossier}\n</DOSSIER>${guidanceContext}` }
    ], { ...config, timeout: 300000 });
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

export const ThreadWriterNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  const schema = z.object({
    thread_draft: z.array(z.string())
  });

  const structuredLlm = writerPrimaryLlm.withStructuredOutput(schema, { name: "thread_writer", method: "jsonSchema" }).withFallbacks({
    fallbacks: [
      writerPrimaryLlmBackup.withStructuredOutput(schema, { name: "thread_writer", method: "jsonSchema" }),
      writerFallbackLlm1.withStructuredOutput(schema, { name: "thread_writer", method: "jsonSchema" }),
      writerFallbackLlm3.withStructuredOutput(schema, { name: "thread_writer", method: "jsonSchema" }),
      writerFallbackLlm3Backup.withStructuredOutput(schema, { name: "thread_writer", method: "jsonSchema" })
    ]
  });

  let result;
  let parse_success = true;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    result = await structuredLlm.invoke([
      { role: "system", content: TOPIC_THREAD_WRITER_PROMPT },
      { role: "user", content: `<HOOK>\n${state.selected_hook}\n</HOOK>\n<DOSSIER>\n${state.research_dossier}\n</DOSSIER>${guidanceContext}` }
    ], { ...config, timeout: 300000 });
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

export const ViralityCriticNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  const schema = z.object({
    virality_score: z.number(),
    post_critiques: z.array(z.object({
      post_index: z.number(),
      critique: z.string(),
      fix_directive: z.string().optional()
    }))
  });

  const structuredLlm = criticPrimaryLlm.withStructuredOutput(schema, { name: "virality_critic", method: "jsonSchema" }).withFallbacks({
    fallbacks: [
      criticPrimaryLlmBackup.withStructuredOutput(schema, { name: "virality_critic", method: "jsonSchema" }),
      criticFallbackLlm1.withStructuredOutput(schema, { name: "virality_critic", method: "jsonSchema" }),
      criticFallbackLlm3.withStructuredOutput(schema, { name: "virality_critic", method: "jsonSchema" }),
      criticFallbackLlm3Backup.withStructuredOutput(schema, { name: "virality_critic", method: "jsonSchema" })
    ]
  });

  let result;
  let parse_success = true;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    result = await structuredLlm.invoke([
      { role: "system", content: TOPIC_VIRALITY_CRITIC_PROMPT },
      { role: "user", content: `<THREAD>\n${JSON.stringify(state.thread_draft, null, 2)}\n</THREAD>${guidanceContext}` }
    ], { ...config, timeout: 300000 });
    if (!result) parse_success = false;
  } catch (_e) {
    parse_success = false;
  }

  return {
    virality_score: parse_success && result ? result.virality_score : 85,
    post_critiques: parse_success && result ? result.post_critiques : [],
    is_approved: parse_success && result && result.virality_score >= 85 ? true : false,
    iterations: state.iterations + 1,
    parse_success,
    retries: { ...(state.retries || {}), critic: (state.retries?.critic || 0) + 1 }
  };
};
