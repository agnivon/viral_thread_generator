"use node";

import { interrupt } from "@langchain/langgraph";
import { providerStrategy } from "langchain";
import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import {
  openAiGpt54MiniT08, deepSeekFlashT08ReasoningNone,
  googleGemini31FlashLiteT08Key1, googleGemini31FlashLiteT08Key2,
  deepSeekFlashT01ReasoningNone,
  googleGemini31FlashLiteT01Key1, googleGemini31FlashLiteT01Key2,
  openAiGpt54T08Penalty04, googleGemini3FlashPreviewT08Key1, googleGemini3FlashPreviewT08Key2,
  googleGemini38FlashT08Key1, googleGemini38FlashT08Key2,
  googleGemini37FlashT08Key1, googleGemini37FlashT08Key2,
  googleGemini36FlashT08Key1, googleGemini36FlashT08Key2,
  googleGemini35FlashT08Key1, googleGemini35FlashT08Key2,
  deepSeekFlashT085ReasoningNone,
  googleGemini31FlashLiteT02Key1, googleGemini31FlashLiteT02Key2, openAiGpt54MiniT02,
  googleGemini35FlashLiteT01Key1, googleGemini35FlashLiteT01Key2,
  googleGemini35FlashLiteT08Key1, googleGemini35FlashLiteT08Key2,
  googleGemini35FlashLiteT02Key1, googleGemini35FlashLiteT02Key2,
  criticModelCandidates
} from "../models.js";
import {
  SOCIAL_MEDIA_HOOK_PROMPT,
  SOCIAL_MEDIA_SCRAPER_PROMPT,
  SOCIAL_MEDIA_WRITER_PROMPT,
  SOCIAL_MEDIA_CRITIC_PROMPT,
  SOCIAL_MEDIA_DIFFERENTIAL_CRITIC_PROMPT,
  SOCIAL_MEDIA_RESEARCHER_PROMPT
} from "./prompts.js";
import { SocialMediaThreadFactoryStateType } from "./state.js";
import { CharacterValidatorTool } from "../tools.js";
import {
  ContentAuthenticityCheckerTool,
  WebScraperTool,
  BackgroundDossierTool
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


const socialMediaScraperModels = [
  googleGemini35FlashLiteT01Key1,
  googleGemini35FlashLiteT01Key2,
  googleGemini31FlashLiteT01Key1,
  googleGemini31FlashLiteT01Key2,
  deepSeekFlashT01ReasoningNone
];

export const PostScraperNode = async (state: SocialMediaThreadFactoryStateType, config?: RunnableConfig) => {
  const scraperResultStr = await WebScraperTool.invoke({ url: state.url }, { ...config, timeout: 60000 });
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
      socialMediaScraperModels,
      [
        { role: "system", content: SOCIAL_MEDIA_SCRAPER_PROMPT },
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
    console.warn("PostScraperNode output failed");
    return {
      parse_success: false,
      retries: { ...(state.retries || {}), scraper: (state.retries?.scraper || 0) + 1 }
    };
  }
};

const socialMediaResearcherSchema = z.object({
  research_context: z.string().min(1, "Must generate research context")
});

const socialMediaContextResearcherAgents = buildAgents<z.infer<typeof socialMediaResearcherSchema>>(
  [
    googleGemini35FlashLiteT02Key1,
    googleGemini35FlashLiteT02Key2,
    googleGemini31FlashLiteT02Key1,
    googleGemini31FlashLiteT02Key2,
    openAiGpt54MiniT02
  ],
  {
    tools: [BackgroundDossierTool],
    systemPrompt: SOCIAL_MEDIA_RESEARCHER_PROMPT,
    responseFormat: providerStrategy(socialMediaResearcherSchema)
  }
);

export const ContextResearcherNode = async (state: SocialMediaThreadFactoryStateType, config?: RunnableConfig) => {
  let result;
  let parse_success = false;

  try {
    result = await invokeWithFallbacks(socialMediaContextResearcherAgents, {
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

const socialMediaHookSchema = z.object({
  core_delta: z.string().optional(),
  core_hooks: z.array(z.string()).min(1, "Must generate at least one hook"),
  selected_hook: z.string().min(1, "Must select a hook")
});

const socialMediaHookStrategistAgents = buildAgents<z.infer<typeof socialMediaHookSchema>>(
  [
    googleGemini35FlashLiteT08Key1,
    googleGemini35FlashLiteT08Key2,
    googleGemini31FlashLiteT08Key1,
    googleGemini31FlashLiteT08Key2,
    openAiGpt54MiniT08,
    deepSeekFlashT08ReasoningNone
  ],
  {
    systemPrompt: SOCIAL_MEDIA_HOOK_PROMPT,
    responseFormat: providerStrategy(socialMediaHookSchema)
  }
);

export const HookStrategistNode = async (state: SocialMediaThreadFactoryStateType, config?: RunnableConfig) => {
  let result;
  let parse_success = false;

  try {
    const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
    const researchContextStr = state.research_context ? `\n\n<RESEARCH_CONTEXT>\n${state.research_context}\n</RESEARCH_CONTEXT>` : "";
    result = await invokeWithFallbacks(socialMediaHookStrategistAgents, {
      messages: [{ role: "user", content: `<SOURCE>\n${state.raw_markdown}\n</SOURCE>${researchContextStr}${guidanceContext}` }]
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
    core_delta = result.structuredResponse.core_delta;
  } else {
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

const socialMediaWriterSchema = z.object({
  thread_draft: z.array(z.string()).min(1, "Must generate at least one post for the thread draft")
});

const socialMediaThreadWriterModels = [
  googleGemini38FlashT08Key1.withStructuredOutput(socialMediaWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini38FlashT08Key2.withStructuredOutput(socialMediaWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000),
  googleGemini37FlashT08Key1.withStructuredOutput(socialMediaWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini37FlashT08Key2.withStructuredOutput(socialMediaWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000),
  googleGemini36FlashT08Key1.withStructuredOutput(socialMediaWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini36FlashT08Key2.withStructuredOutput(socialMediaWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000),
  googleGemini35FlashT08Key1.withStructuredOutput(socialMediaWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini35FlashT08Key2.withStructuredOutput(socialMediaWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000),
  deepSeekFlashT085ReasoningNone.withStructuredOutput(socialMediaWriterSchema, { name: "thread_writer", method: "jsonMode" }),
  openAiGpt54T08Penalty04.withStructuredOutput(socialMediaWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  googleGemini3FlashPreviewT08Key1.withStructuredOutput(socialMediaWriterSchema, { name: "thread_writer", method: "jsonSchema" }),
  withTimeout(googleGemini3FlashPreviewT08Key2.withStructuredOutput(socialMediaWriterSchema, { name: "thread_writer", method: "jsonSchema" }), 45000)
];

export const ThreadWriterNode = async (state: SocialMediaThreadFactoryStateType, config?: RunnableConfig) => {
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
  const researchContextStr = state.research_context ? `\n\n<RESEARCH_CONTEXT>\n${state.research_context}\n</RESEARCH_CONTEXT>` : "";
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

  let draft;
  let parse_success = true;
  try {
    draft = await invokeWithFallbacks(
      socialMediaThreadWriterModels,
      [
        { role: "system", content: SOCIAL_MEDIA_WRITER_PROMPT },
        { role: "user", content: `<HOOK>\n${state.selected_hook}\n</HOOK>\n\n<SOURCE>\n${state.raw_markdown}\n</SOURCE>${researchContextStr}${deltaContext}${previousDraftContext}${critiqueContext}${postCritiquesContext}${pinnedPostsContext}${charCritiqueContext}${guidanceContext}` }
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

  return {
    thread_draft: finalThreadDraft,
    parse_success,
    retries: { ...(state.retries || {}), writer: (state.retries?.writer || 0) + 1 }
  };
};

export const CharacterValidatorNode = async (state: SocialMediaThreadFactoryStateType, config?: RunnableConfig) => {
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

const socialMediaCriticSchema = z.object({
  virality_score: z.number(),
  overall_critique: z.string(),
  post_critiques: z.array(z.object({
    post_index: z.number(),
    critique: z.string(),
    fix_directive: z.string().optional()
  }))
});

const socialMediaViralityCriticAgents = buildAgents<z.infer<typeof socialMediaCriticSchema>>(
  criticModelCandidates,
  {
    tools: [ContentAuthenticityCheckerTool],
    systemPrompt: SOCIAL_MEDIA_CRITIC_PROMPT,
    responseFormat: providerStrategy(socialMediaCriticSchema)
  }
);

const socialMediaDifferentialCriticAgents = buildAgents<z.infer<typeof differentialCriticSchema>>(
  criticModelCandidates,
  {
    systemPrompt: SOCIAL_MEDIA_DIFFERENTIAL_CRITIC_PROMPT,
    responseFormat: providerStrategy(differentialCriticSchema)
  }
);

export const ViralityCriticNode = async (state: SocialMediaThreadFactoryStateType, config?: RunnableConfig) => {
  const guidanceContext = state.guidance ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>` : "";
  const researchContextStr = state.research_context ? `\n\n<RESEARCH_CONTEXT>\n${state.research_context}\n</RESEARCH_CONTEXT>` : "";
  const deltaContext = state.core_delta
    ? `\n\n<CORE_DELTA>\n${state.core_delta}\n</CORE_DELTA>`
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
        socialMediaDifferentialCriticAgents,
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
      socialMediaViralityCriticAgents,
      {
        messages: [
          { role: "user", content: `<CURRENT_ITERATION_ATTEMPT>\n${state.iterations + 1}\n</CURRENT_ITERATION_ATTEMPT>\n\n<SOURCE_MATERIAL>\n${state.raw_markdown}\n</SOURCE_MATERIAL>${researchContextStr}${deltaContext}\n\n<THREAD>\n${JSON.stringify(state.thread_draft, null, 2)}\n</THREAD>${guidanceContext}` }
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

export const ManualHookSelectionNode = async (state: SocialMediaThreadFactoryStateType, _config?: RunnableConfig) => {
  const selected_hook = interrupt({
    core_hooks: state.core_hooks,
    action: "Please select a hook to proceed."
  });
  return { selected_hook: extractSelectedHook(selected_hook) };
};
