"use node";

import { z } from "zod";
import { interrupt } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { providerStrategy } from "langchain";
import {
  googleGemini31FlashLiteT08Key1, googleGemini31FlashLiteT08Key2, openAiGpt54MiniT08,
  googleGemini31FlashLiteT01Key1, googleGemini31FlashLiteT01Key2, deepSeekFlashT01ReasoningNone,
  googleGemini38FlashT08Key1, googleGemini38FlashT08Key2,
  googleGemini37FlashT08Key1, googleGemini37FlashT08Key2,
  googleGemini36FlashT08Key1, googleGemini36FlashT08Key2,
  googleGemini35FlashT08Key1, googleGemini35FlashT08Key2,
  deepSeekFlashT085ReasoningNone, openAiGpt54T08Penalty04, googleGemini3FlashPreviewT08Key1, googleGemini3FlashPreviewT08Key2,
  googleGemini31FlashLiteT02Key1, googleGemini31FlashLiteT02Key2, openAiGpt54MiniT02,
  googleGemini35FlashLiteT01Key1, googleGemini35FlashLiteT01Key2,
  googleGemini35FlashLiteT08Key1, googleGemini35FlashLiteT08Key2, deepSeekFlashT08ReasoningNone,
  googleGemini35FlashLiteT02Key1, googleGemini35FlashLiteT02Key2,
  criticModelCandidates
} from "../models.js";
import {
  TOPIC_RESEARCH_ORCHESTRATOR_PROMPT,
  TOPIC_DEEP_PAGE_SCRAPER_PROMPT,
  TOPIC_HOOK_STRATEGIST_PROMPT,
  TOPIC_THREAD_WRITER_PROMPT,
  TOPIC_VIRALITY_CRITIC_PROMPT,
  TOPIC_DIFFERENTIAL_CRITIC_PROMPT
} from "./prompts.js";
import { TopicThreadFactoryStateType } from "./state.js";
import {
  TavilySearchTool,
  DuckDuckGoSearchTool,
  JinaReaderTool,
  FirecrawlScrapeTool,
  TopicCharacterValidatorTool,
  ContentAuthenticityCheckerTool
} from "./tools.js";
import {
  buildAgents,
  invokeWithFallbacks,
  withTimeout,
  normalizeResearchDossier,
  filterActionablePostCritiques,
  reconcileSurgicalDraft,
  parseFlaggedPostIndicesFromErrors,
  buildSurgicalWriterContext,
  differentialCriticSchema,
  processDifferentialEvaluation,
} from "../utils.js";
import { extractSelectedHook } from "../nodes.js";

const topicResearchOrchestratorSchema = z.object({
  research_dossier: z.string().min(1, "Must generate research dossier"),
  urls_to_scrape: z.array(z.string()).optional()
});

const topicResearchOrchestratorAgents = buildAgents<z.infer<typeof topicResearchOrchestratorSchema>>(
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
  deepSeekFlashT01ReasoningNone.withStructuredOutput(topicDeepScraperSchema, { name: "deep_scraper", method: "jsonMode" })
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
  core_delta: z.string().optional(),
  core_hooks: z.array(z.string()).min(1, "Must generate at least one hook"),
  selected_hook: z.string().min(1, "Must select a hook")
});

const topicHookStrategistModels = [
  googleGemini35FlashLiteT08Key1.withStructuredOutput(topicHookStrategistSchema, { name: "hook_strategist", method: "jsonSchema" }),
  googleGemini35FlashLiteT08Key2.withStructuredOutput(topicHookStrategistSchema, { name: "hook_strategist", method: "jsonSchema" }),
  googleGemini31FlashLiteT08Key1.withStructuredOutput(topicHookStrategistSchema, { name: "hook_strategist", method: "jsonSchema" }),
  googleGemini31FlashLiteT08Key2.withStructuredOutput(topicHookStrategistSchema, { name: "hook_strategist", method: "jsonSchema" }),
  openAiGpt54MiniT08.withStructuredOutput(topicHookStrategistSchema, { name: "hook_strategist", method: "jsonSchema" }),
  deepSeekFlashT08ReasoningNone.withStructuredOutput(topicHookStrategistSchema, { name: "hook_strategist", method: "jsonMode" })
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
    core_hooks: parse_success && result ? result.core_hooks : [],
    selected_hook: parse_success && result ? result.selected_hook : "",
    core_delta: parse_success && result ? result.core_delta : undefined,
    parse_success,
    retries: { ...(state.retries || {}), hook: (state.retries?.hook || 0) + 1 }
  };
};

const topicThreadWriterSchema = z.object({
  thread_draft: z.array(z.string()).min(1, "Must generate at least one post for the thread draft")
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
  deepSeekFlashT085ReasoningNone.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonMode" }),
  openAiGpt54T08Penalty04.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  googleGemini3FlashPreviewT08Key1.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini3FlashPreviewT08Key2.withStructuredOutput(topicThreadWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000)
];

export const ThreadWriterNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  const previousDraftContext = state.thread_draft && state.thread_draft.length > 0
    ? `\n\n<PREVIOUS_THREAD_DRAFT>\n${JSON.stringify(state.thread_draft, null, 2)}\n</PREVIOUS_THREAD_DRAFT>`
    : "";
  const critiqueContext = state.critique ? `\n\n<CRITIQUE_TO_ADDRESS>\n${state.critique}\n</CRITIQUE_TO_ADDRESS>` : "";
  let postCritiquesContext = "";
  const actionable = filterActionablePostCritiques(state.post_critiques);
  if (actionable.length > 0) {
    postCritiquesContext = "\n\n<POST_SPECIFIC_CRITIQUES>\n" +
      actionable.map(pc => `Post ${pc.post_index}: ${pc.critique}${pc.fix_directive ? `\nFix Directive: ${pc.fix_directive}` : ''}`).join("\n\n") +
      "\n</POST_SPECIFIC_CRITIQUES>";
  }
  const charCritiqueContext = state.character_critique ? `\n\n<CHARACTER_AND_FORMATTING_CONSTRAINTS_FAILED>\n${state.character_critique}\nFix the previous draft to respect these exact formatting constraints.\n</CHARACTER_AND_FORMATTING_CONSTRAINTS_FAILED>` : "";
  const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
  const deltaContext = state.core_delta
    ? `\n\n<CORE_DELTA>\n${state.core_delta}\n</CORE_DELTA>`
    : "";

  // Surgical mode detection (Pillar 1: Surgical Post Pinning)
  const formattingFlagged = parseFlaggedPostIndicesFromErrors(state.character_critique);
  const flaggedIndices = Array.from(
    new Set([...actionable.map(pc => pc.post_index), ...formattingFlagged])
  ).filter(idx => state.thread_draft && idx >= 1 && idx <= state.thread_draft.length);

  const hasPreviousDraft = Array.isArray(state.thread_draft) && state.thread_draft.length > 0;
  const isSurgical = hasPreviousDraft && flaggedIndices.length > 0 && flaggedIndices.length < state.thread_draft.length;

  const { pinnedPostsContext } = isSurgical
    ? buildSurgicalWriterContext(state.thread_draft, flaggedIndices)
    : { pinnedPostsContext: "" };

  let result;
  let parse_success = true;

  try {
    result = await invokeWithFallbacks(
      topicThreadWriterModels,
      [
        { role: "system", content: TOPIC_THREAD_WRITER_PROMPT },
        { role: "user", content: `<HOOK>\n${state.selected_hook}\n</HOOK>\n<DOSSIER>\n${state.research_dossier}\n</DOSSIER>${deltaContext}${previousDraftContext}${critiqueContext}${postCritiquesContext}${pinnedPostsContext}${charCritiqueContext}${guidanceContext}` }
      ],
      { ...config, timeout: 180000 }
    );
    if (!result || !result.thread_draft) parse_success = false;
  } catch (_e) {
    parse_success = false;
  }

  let finalThreadDraft = state.thread_draft || [];
  if (parse_success && result?.thread_draft) {
    if (isSurgical) {
      finalThreadDraft = reconcileSurgicalDraft(state.thread_draft, result.thread_draft, flaggedIndices);
    } else {
      finalThreadDraft = result.thread_draft;
    }
  }

  return {
    thread_draft: finalThreadDraft,
    parse_success,
    retries: { ...(state.retries || {}), writer: (state.retries?.writer || 0) + 1 }
  };
};

const topicViralityCriticSchema = z.object({
  virality_score: z.number(),
  overall_critique: z.string(),
  post_critiques: z.array(z.object({
    post_index: z.number(),
    critique: z.string(),
    fix_directive: z.string().optional()
  }))
});

const topicViralityCriticAgents = buildAgents<z.infer<typeof topicViralityCriticSchema>>(
  criticModelCandidates,
  {
    tools: [ContentAuthenticityCheckerTool],
    systemPrompt: TOPIC_VIRALITY_CRITIC_PROMPT,
    responseFormat: providerStrategy(topicViralityCriticSchema)
  }
);

const topicDifferentialCriticAgents = buildAgents<z.infer<typeof differentialCriticSchema>>(
  criticModelCandidates,
  {
    systemPrompt: TOPIC_DIFFERENTIAL_CRITIC_PROMPT,
    responseFormat: providerStrategy(differentialCriticSchema)
  }
);

export const ViralityCriticNode = async (state: TopicThreadFactoryStateType, config?: RunnableConfig) => {
  const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
  const deltaContext = state.core_delta
    ? `\n\n<CORE_DELTA>\n${state.core_delta}\n</CORE_DELTA>`
    : "";
  const dossierContext = state.research_dossier
    ? `\n\n<DOSSIER>\n${state.research_dossier}\n</DOSSIER>`
    : "";

  const priorActionableCritiques = filterActionablePostCritiques(state.post_critiques);
  const isDifferentialMode = state.iterations >= 1 && priorActionableCritiques.length > 0;

  if (isDifferentialMode) {
    // ── DIFFERENTIAL VERIFICATION MODE (Iteration >= 2, Pillars 2 & 3) ──
    const priorPunchlistStr = priorActionableCritiques
      .map((pc) => `Post ${pc.post_index}: ${pc.critique}${pc.fix_directive ? `\nFix Directive: ${pc.fix_directive}` : ""}`)
      .join("\n\n");

    let result;
    let parse_success = false;
    try {
      result = await invokeWithFallbacks(
        topicDifferentialCriticAgents,
        {
          messages: [
            {
              role: "user",
              content: `<CURRENT_ITERATION_ATTEMPT>\n${state.iterations + 1}\n</CURRENT_ITERATION_ATTEMPT>\n\n<PRIOR_ISSUES_PUNCHLIST>\n${priorPunchlistStr}\n</PRIOR_ISSUES_PUNCHLIST>\n\n<THREAD>\n${JSON.stringify(state.thread_draft, null, 2)}\n</THREAD>${deltaContext}${guidanceContext}`,
            },
          ],
        },
        { ...config, timeout: 120000 }
      );
      parse_success = true;
    } catch (_e) {
      parse_success = false;
    }

    if (!parse_success || !result?.structuredResponse) {
      return {
        is_approved: false,
        critique: "",
        virality_score: state.virality_score ?? 70,
        post_critiques: state.post_critiques || [],
        best_thread_draft: state.best_thread_draft,
        best_virality_score: state.best_virality_score,
        audit_history: state.audit_history || [],
        iterations: state.iterations,
        retries: { ...(state.retries || {}), critic: (state.retries?.critic || 0) + 1 },
        parse_success: false,
      };
    }

    const evalResult = processDifferentialEvaluation({
      threadDraft: state.thread_draft,
      iterations: state.iterations,
      previousScore: state.virality_score,
      bestThreadDraft: state.best_thread_draft,
      bestViralityScore: state.best_virality_score,
      auditHistory: state.audit_history,
      priorActionableCritiques,
      structuredResponse: result.structuredResponse,
    });

    return {
      ...evalResult,
      iterations: state.iterations + 1,
      retries: { ...(state.retries || {}), critic: (state.retries?.critic || 0) + 1, validator: 0 },
      parse_success: true,
    };
  }

  // ── DISCOVERY AUDIT MODE (Iteration 1, Pillar 2) ──
  let result;
  let parse_success = false;

  try {
    result = await invokeWithFallbacks(
      topicViralityCriticAgents,
      {
        messages: [
          { role: "user", content: `<CURRENT_ITERATION_ATTEMPT>\n${state.iterations + 1}\n</CURRENT_ITERATION_ATTEMPT>${dossierContext}${deltaContext}\n\n<THREAD>\n${JSON.stringify(state.thread_draft, null, 2)}\n</THREAD>${guidanceContext}` }
        ]
      },
      { ...config, timeout: 120000 }
    );
    parse_success = true;
  } catch (_e) {
    parse_success = false;
  }

  if (!parse_success || !result?.structuredResponse) {
    return {
      is_approved: false,
      critique: "",
      virality_score: state.virality_score ?? 70,
      post_critiques: state.post_critiques || [],
      best_thread_draft: state.best_thread_draft,
      best_virality_score: state.best_virality_score,
      audit_history: state.audit_history || [],
      iterations: state.iterations,
      retries: { ...(state.retries || {}), critic: (state.retries?.critic || 0) + 1 },
      parse_success: false,
    };
  }

  const finalCritique = result.structuredResponse.overall_critique || "";
  const rawScore = result.structuredResponse.virality_score;
  const rawPostCritiques = filterActionablePostCritiques(result.structuredResponse.post_critiques);
  const virality_score = typeof rawScore === "number" ? Math.min(100, Math.max(0, rawScore)) : 70;
  const nextPostCritiques = rawPostCritiques;
  const finalApproval = typeof virality_score === "number" && virality_score >= 85;

  // Initialize or maintain Pareto Checkpoint
  let best_thread_draft = state.best_thread_draft || state.thread_draft;
  let best_virality_score = state.best_virality_score ?? virality_score;
  if (virality_score > (state.best_virality_score ?? -1)) {
    best_virality_score = virality_score;
    best_thread_draft = state.thread_draft;
  }

  // Initialize Audit History
  const auditEntry = {
    iteration: state.iterations + 1,
    virality_score,
    post_critiques: nextPostCritiques.map((pc) => ({
      post_index: pc.post_index,
      critique: pc.critique,
      fix_directive: pc.fix_directive,
      status: "open" as const,
    })),
  };
  const updatedAuditHistory = [...(state.audit_history || []), auditEntry];

  return {
    is_approved: finalApproval,
    critique: finalCritique,
    virality_score,
    post_critiques: nextPostCritiques,
    best_thread_draft,
    best_virality_score,
    audit_history: updatedAuditHistory,
    iterations: state.iterations + 1,
    retries: { ...(state.retries || {}), critic: (state.retries?.critic || 0) + 1, validator: 0 },
    parse_success: true,
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
  return { selected_hook: extractSelectedHook(selected_hook) };
};
