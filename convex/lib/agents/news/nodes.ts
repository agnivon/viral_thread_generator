"use node";

import { interrupt } from "@langchain/langgraph";
import { providerStrategy, toolStrategy } from "langchain";
import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import {
  deepSeekFlashT08ReasoningNone,
  googleGemini31FlashLiteT08Key1, googleGemini31FlashLiteT08Key2,
  deepSeekFlashT01ReasoningNone,
  googleGemini31FlashLiteT01Key1, googleGemini31FlashLiteT01Key2,
  googleGemini31FlashLiteT02Key1, googleGemini31FlashLiteT02Key2, deepSeekFlashT02ReasoningNone,
  googleGemini35FlashLiteT01Key1, googleGemini35FlashLiteT01Key2,
  googleGemini35FlashLiteT08Key1, googleGemini35FlashLiteT08Key2,
  googleGemini35FlashLiteT02Key1, googleGemini35FlashLiteT02Key2,
  criticModelCandidates,
  threadWriterModelCandidates
} from "../models.js";
import {
  NEWS_HOOK_PROMPT,
  NEWS_SCRAPER_PROMPT,
  NEWS_WRITER_PROMPT,
  NEWS_CRITIC_PROMPT,
  NEWS_DIFFERENTIAL_CRITIC_PROMPT,
  NEWS_RESEARCHER_PROMPT
} from "./prompts.js";
import { NewsThreadFactoryStateType } from "./state.js";
import { BackgroundDossierTool, ContentAuthenticityCheckerTool, WebScraperTool, YoutubeScraperTool } from "./tools.js";
import { CharacterValidatorTool } from "../tools.js";
import {
  buildAgents,
  extractMessageText,
  invokeWithFallbacks,
  withTimeout,
  normalizeResearchDossier,
  filterActionablePostCritiques,
  reconcileSurgicalDraft,
  buildWriterRevisionContext,
  buildHookWriterContext,
  runCharacterValidation,
  differentialCriticSchema,
  buildDifferentialCriticUserPrompt,
  processDifferentialEvaluation,
} from "../utils.js";
import { parseScraperToolResult, formatScraperUserPrompt } from "../scrapeUtils.js";
import { extractSelectedHook } from "../nodes.js";
import { runDiscoverySubgraph } from "../discovery/graph.js";
import { extractDiscoveryTopic } from "../discovery/nodes.js";


const scraperModels = [
  withTimeout(googleGemini35FlashLiteT01Key1, 35000),
  withTimeout(googleGemini35FlashLiteT01Key2, 35000),
  withTimeout(googleGemini31FlashLiteT01Key1, 45000),
  withTimeout(googleGemini31FlashLiteT01Key2, 45000),
  withTimeout(deepSeekFlashT01ReasoningNone, 45000)
];

export const ScraperNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  const isYoutube = state.url.includes("youtube.com") || state.url.includes("youtu.be");
  const scraperResultStr = isYoutube
    ? await YoutubeScraperTool.invoke({ url: state.url }, { ...config, timeout: 60000 })
    : await WebScraperTool.invoke({ url: state.url }, { ...config, timeout: 60000 });
  const { markdown, images, title: articleTitle, description: articleDescription } =
    parseScraperToolResult(scraperResultStr);

  try {
    const summary = await invokeWithFallbacks(
      scraperModels,
      [
        { role: "system", content: NEWS_SCRAPER_PROMPT },
        {
          role: "user",
          content: formatScraperUserPrompt({
            url: state.url,
            title: articleTitle,
            description: articleDescription,
            markdown,
          }),
        },
      ],
      { ...config, timeout: 60000 }
    );
    return {
      raw_markdown: extractMessageText(summary.content),
      images,
      article_title: articleTitle || undefined,
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

// Thinking Gemini Flash-Lite (`thinkingLevel: "medium"`) MUST use `toolStrategy`; DeepSeek (`response_format: { type: "json_object" }`) uses `providerStrategy`.
const newsContextResearcherAgents = buildAgents<z.infer<typeof newsResearcherSchema>>(
  [
    withTimeout(googleGemini35FlashLiteT02Key1, 45000),
    withTimeout(googleGemini35FlashLiteT02Key2, 45000),
    withTimeout(googleGemini31FlashLiteT02Key1, 45000),
    withTimeout(googleGemini31FlashLiteT02Key2, 45000),
    withTimeout(deepSeekFlashT02ReasoningNone, 45000)
  ],
  {
    tools: [BackgroundDossierTool],
    systemPrompt: NEWS_RESEARCHER_PROMPT,
    responseFormat: {
      google: toolStrategy(newsResearcherSchema),
      deepseek: providerStrategy(newsResearcherSchema)
    }
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

export const NewsDiscoveryNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  const topicCandidate = extractDiscoveryTopic(state.url, state.raw_markdown, "News topic", state.article_title);
  return await runDiscoverySubgraph({
    nodeLabel: "NewsDiscoveryNode",
    topic: topicCandidate,
    rawMarkdown: state.raw_markdown,
    guidance: state.guidance,
    retries: state.retries,
    retryKey: "researcher",
    returnDossierField: "research_context",
    signal: config?.signal,
  });
};

const newsHookSchema = z.object({
  core_delta: z.string().optional(),
  core_hooks: z.array(z.string()).min(1, "Must generate at least one hook"),
  selected_hook: z.string().min(1, "Must select a hook")
});

// Thinking Gemini Flash-Lite (`thinkingLevel: "high"`/`"medium"`) MUST use `toolStrategy`; DeepSeek (`json_object`) uses `providerStrategy`.
const newsHookStrategistAgents = buildAgents<z.infer<typeof newsHookSchema>>(
  [
    withTimeout(googleGemini35FlashLiteT08Key1, 45000),
    withTimeout(googleGemini35FlashLiteT08Key2, 45000),
    withTimeout(googleGemini31FlashLiteT08Key1, 45000),
    withTimeout(googleGemini31FlashLiteT08Key2, 45000),
    withTimeout(deepSeekFlashT08ReasoningNone, 45000)
  ],
  {
    systemPrompt: NEWS_HOOK_PROMPT,
    responseFormat: {
      google: toolStrategy(newsHookSchema),
      deepseek: providerStrategy(newsHookSchema)
    }
  }
);

export const HookStrategistNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  let result;
  let parse_success = false;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    const researchContext = state.research_context ? `\n\n<RESEARCH_CONTEXT>\n${state.research_context}\n</RESEARCH_CONTEXT>` : "";
    const anglesContext = state.discovery_angles && state.discovery_angles.length > 0
      ? `\n\n<DISCOVERY_ANGLES>\n${JSON.stringify(state.discovery_angles, null, 2)}\n</DISCOVERY_ANGLES>`
      : "";
    const deltaContext = state.core_delta
      ? `\n\n<CORE_DELTA>\n${state.core_delta}\n</CORE_DELTA>`
      : "";
    result = await invokeWithFallbacks(newsHookStrategistAgents, {
      messages: [{ role: "user", content: `<SOURCE>\n${state.raw_markdown}\n</SOURCE>${researchContext}${anglesContext}${deltaContext}${guidanceContext}` }]
    }, { ...config, timeout: 45000 });
    parse_success = true;
  } catch (_e) {
    parse_success = false;
  }

  let core_hooks: string[] = [];
  let selected_hook = "";
  let core_delta: string | undefined = undefined;

  if (parse_success && result?.structuredResponse) {
    core_hooks = result.structuredResponse.core_hooks || [];
    selected_hook = result.structuredResponse.selected_hook || "";
    core_delta = result.structuredResponse.core_delta || state.core_delta;
  } else {
    core_delta = state.core_delta;
    parse_success = false;
  }

  return {
    core_hooks,
    selected_hook,
    core_delta,
    parse_success,
    retries: { ...(state.retries || {}), hook: (state.retries?.hook || 0) + 1 }
  };
};

export const ThreadWriterNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  const {
    previousDraftContext,
    critiqueContext,
    postCritiquesContext,
    charCritiqueContext,
    guidanceContext,
    pinnedPostsContext,
    isSurgical,
    isPost1Flagged,
    flaggedIndices,
  } = buildWriterRevisionContext({
    threadDraft: state.thread_draft,
    critique: state.critique,
    postCritiques: state.post_critiques,
    characterCritique: state.character_critique,
    guidance: state.guidance,
  });
  const researchContext = state.research_context ? `\n\n<RESEARCH_CONTEXT>\n${state.research_context}\n</RESEARCH_CONTEXT>` : "";
  const deltaContext = state.core_delta
    ? `\n\n<CORE_DELTA>\n${state.core_delta}\n</CORE_DELTA>`
    : "";
  const discoveryContext = state.discovery_angles && state.discovery_angles.length > 0
    ? `\n\n<DISCOVERY_ANGLES>\n${JSON.stringify(state.discovery_angles, null, 2)}\nUse the forensic reality, economic tensions, and primary proof sources from these angles to ground the narrative and cite concrete evidence in the thread body.\n</DISCOVERY_ANGLES>`
    : "";
  const hookContext = buildHookWriterContext({
    selectedHook: state.selected_hook,
    isPost1Flagged,
    tagName: "HOOK",
  });

  let draft;
  let parse_success = true;
  try {
    draft = await invokeWithFallbacks(
      threadWriterModelCandidates,
      [
        { role: "system", content: NEWS_WRITER_PROMPT },
        { role: "user", content: `${hookContext}\n\n<SOURCE>\n${state.raw_markdown}\n</SOURCE>${researchContext}${discoveryContext}${deltaContext}${previousDraftContext}${critiqueContext}${postCritiquesContext}${pinnedPostsContext}${charCritiqueContext}${guidanceContext}` }
      ],
      { ...config, timeout: 180000 }
    );
    if (!draft || !draft.thread_draft) parse_success = false;
  } catch (_e) {
    parse_success = false;
  }

  let finalThreadDraft = state.thread_draft || [];
  if (parse_success && draft?.thread_draft) {
    if (isSurgical) {
      finalThreadDraft = reconcileSurgicalDraft(state.thread_draft, draft.thread_draft, flaggedIndices);
    } else {
      finalThreadDraft = draft.thread_draft;
    }
  }

  const updatedHook =
    isPost1Flagged &&
    parse_success &&
    finalThreadDraft.length > 0 &&
    finalThreadDraft[0]?.trim()
      ? { selected_hook: finalThreadDraft[0] }
      : {};

  return {
    thread_draft: finalThreadDraft,
    ...updatedHook,
    parse_success,
    retries: { ...(state.retries || {}), writer: (state.retries?.writer || 0) + 1 }
  };
};

export const CharacterValidatorNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  return await runCharacterValidation(CharacterValidatorTool, state.thread_draft, state.retries, config);
};

const newsCriticSchema = z.object({
  virality_score: z.number(),
  overall_critique: z.string(),
  post_critiques: z.array(z.object({
    post_index: z.number(),
    critique: z.string(),
    fix_directive: z.string().optional()
  }))
});

// Critic agents use thinking Gemini (`thinkingLevel: "high"`), so `google` MUST use `toolStrategy`
// while `deepseek` uses `providerStrategy` + `modelKwargs.response_format: { type: "json_object" }`.
const newsViralityCriticAgents = buildAgents<z.infer<typeof newsCriticSchema>>(
  criticModelCandidates,
  {
    tools: [ContentAuthenticityCheckerTool],
    systemPrompt: NEWS_CRITIC_PROMPT,
    responseFormat: {
      google: toolStrategy(newsCriticSchema),
      deepseek: providerStrategy(newsCriticSchema),
    }
  }
);

const newsDifferentialCriticAgents = buildAgents<z.infer<typeof differentialCriticSchema>>(
  criticModelCandidates,
  {
    systemPrompt: NEWS_DIFFERENTIAL_CRITIC_PROMPT,
    responseFormat: {
      google: toolStrategy(differentialCriticSchema),
      deepseek: providerStrategy(differentialCriticSchema),
    }
  }
);

export const ViralityCriticNode = async (state: NewsThreadFactoryStateType, config?: RunnableConfig) => {
  const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
  const researchContext = state.research_context ? `\n\n<RESEARCH_CONTEXT>\n${state.research_context}\n</RESEARCH_CONTEXT>` : "";
  const deltaContext = state.core_delta
    ? `\n\n<CORE_DELTA>\n${state.core_delta}\n</CORE_DELTA>`
    : "";

  const priorActionableCritiques = filterActionablePostCritiques(state.post_critiques);
  const isDifferentialMode = state.iterations >= 1 && priorActionableCritiques.length > 0;

  if (isDifferentialMode) {
    // ── DIFFERENTIAL VERIFICATION MODE (Iteration >= 2, Pillars 2 & 3) ──
    const sourceContext = `\n\n<SOURCE_MATERIAL>\n${state.raw_markdown || ""}\n</SOURCE_MATERIAL>${
      state.research_context
        ? `\n\n<RESEARCH_CONTEXT>\n${state.research_context}\n</RESEARCH_CONTEXT>`
        : ""
    }`;

    let result;
    let parse_success = false;
    try {
      result = await invokeWithFallbacks(
        newsDifferentialCriticAgents,
        {
          messages: [
            {
              role: "user",
              content: buildDifferentialCriticUserPrompt({
                iterations: state.iterations,
                priorActionableCritiques,
                threadDraft: state.thread_draft,
                previousThreadDraft: state.previous_thread_draft,
                sourceContext,
                deltaContext,
                guidanceContext,
              }),
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
      previousThreadDraft: state.previous_thread_draft,
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
      previous_thread_draft: state.thread_draft,
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
      newsViralityCriticAgents,
      {
        messages: [
          {
            role: "user",
            content: `<CURRENT_ITERATION_ATTEMPT>\n${state.iterations + 1}\n</CURRENT_ITERATION_ATTEMPT>\n\n<SOURCE_MATERIAL>\n${state.raw_markdown}\n</SOURCE_MATERIAL>${researchContext}${deltaContext}\n\n<THREAD>\n${JSON.stringify(state.thread_draft, null, 2)}\n</THREAD>${guidanceContext}`,
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
    previous_thread_draft: state.thread_draft,
    audit_history: updatedAuditHistory,
    iterations: state.iterations + 1,
    retries: { ...(state.retries || {}), critic: (state.retries?.critic || 0) + 1, validator: 0 },
    parse_success: true,
  };
};

export const ManualHookSelectionNode = async (state: NewsThreadFactoryStateType, _config?: RunnableConfig) => {
  const selected_hook = interrupt({
    core_hooks: state.core_hooks,
    action: "Please select a hook to proceed."
  });
  return { selected_hook: extractSelectedHook(selected_hook) };
};
