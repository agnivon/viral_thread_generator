"use node";

import { interrupt } from "@langchain/langgraph";
import { providerStrategy, toolStrategy } from "langchain";
import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import {
  googleGemini38FlashT01ThinkingKey1,
  googleGemini38FlashT01ThinkingKey2,
  googleGemini36FlashT01ThinkingKey1,
  googleGemini36FlashT01ThinkingKey2,
  deepSeekFlashT01ReasoningHigh,
  googleGemini35FlashLiteT01ThinkingKey1,
  googleGemini38FlashT08ThinkingKey1,
  googleGemini38FlashT08ThinkingKey2,
  googleGemini36FlashT08ThinkingKey1,
  googleGemini36FlashT08ThinkingKey2,
  deepSeekFlashT08ReasoningHigh,
  criticModelCandidates,
  threadWriterModelCandidates,
} from "../models.js";
import {
  CLICKBAIT_SCRAPER_PROMPT,
  CLICKBAIT_ANGLE_PROMPT,
  CLICKBAIT_HOOK_PROMPT,
  CLIFFHANGER_WRITER_PROMPT,
  CLICKBAIT_CRITIC_PROMPT,
  CLICKBAIT_DIFFERENTIAL_CRITIC_PROMPT,
} from "./prompts.js";
import { ClickbaitArchetypeSchema, ClickbaitThreadFactoryStateType } from "./state.js";
import { WebScraperTool, YoutubeScraperTool, CharacterValidatorTool } from "./tools.js";
import { ContentAuthenticityCheckerTool } from "../news/tools.js";
import {
  buildAgents,
  invokeWithFallbacks,
  filterActionablePostCritiques,
  reconcileSurgicalDraft,
  parseFlaggedPostIndicesFromErrors,
  buildSurgicalWriterContext,
  differentialCriticSchema,
  processDifferentialEvaluation,
} from "../utils.js";
import { extractSelectedHook } from "../nodes.js";

const clickbaitScraperModels = [
  googleGemini38FlashT01ThinkingKey1,
  googleGemini38FlashT01ThinkingKey2,
  googleGemini36FlashT01ThinkingKey1,
  googleGemini36FlashT01ThinkingKey2,
  deepSeekFlashT01ReasoningHigh,
  googleGemini35FlashLiteT01ThinkingKey1,
];

export const ClickbaitScraperNode = async (
  state: ClickbaitThreadFactoryStateType,
  config?: RunnableConfig
) => {
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
      clickbaitScraperModels,
      [
        { role: "system", content: CLICKBAIT_SCRAPER_PROMPT },
        { role: "user", content: markdown },
      ],
      { ...config, timeout: 60000 }
    );
    return {
      raw_markdown: summary.content as string,
      images,
      parse_success: true,
      retries: { ...(state.retries || {}), scraper: (state.retries?.scraper || 0) + 1 },
    };
  } catch (_e) {
    console.warn("[ClickbaitScraperNode] Scraper extraction failed");
    return {
      parse_success: false,
      retries: { ...(state.retries || {}), scraper: (state.retries?.scraper || 0) + 1 },
    };
  }
};

const clickbaitAngleSchema = z.object({
  archetype: ClickbaitArchetypeSchema,
  shock_payload: z.string().min(1, "Must identify shock payload"),
  withheld_mechanism: z.string().min(1, "Must isolate withheld mechanism"),
  high_arousal_valence: z.enum(["outrage", "awe", "anxiety", "greed", "curiosity"]),
  clickbait_thesis: z.string().optional(),
});

const clickbaitAngleAgents = buildAgents<z.infer<typeof clickbaitAngleSchema>>(
  [
    googleGemini38FlashT01ThinkingKey1,
    googleGemini38FlashT01ThinkingKey2,
    googleGemini36FlashT01ThinkingKey1,
    googleGemini36FlashT01ThinkingKey2,
    deepSeekFlashT01ReasoningHigh,
  ],
  {
    systemPrompt: CLICKBAIT_ANGLE_PROMPT,
    responseFormat: {
      google: toolStrategy(clickbaitAngleSchema),
      deepseek: providerStrategy(clickbaitAngleSchema),
    },
  }
);

export const ClickbaitAngleStrategistNode = async (
  state: ClickbaitThreadFactoryStateType,
  config?: RunnableConfig
) => {
  let result;
  let parse_success = false;

  try {
    const guidanceContext = state.guidance
      ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>`
      : "";
    result = await invokeWithFallbacks(
      clickbaitAngleAgents,
      {
        messages: [
          {
            role: "user",
            content: `<SOURCE_MATERIAL>\n${state.raw_markdown}\n</SOURCE_MATERIAL>${guidanceContext}`,
          },
        ],
      },
      { ...config, timeout: 60000 }
    );
    parse_success = true;
  } catch (err) {
    console.warn("[ClickbaitAngleStrategistNode] Angle extraction failed:", err);
    parse_success = false;
  }

  if (parse_success && result?.structuredResponse) {
    const res = result.structuredResponse;
    return {
      archetype: res.archetype,
      shock_payload: res.shock_payload,
      withheld_mechanism: res.withheld_mechanism,
      high_arousal_valence: res.high_arousal_valence,
      core_delta: res.clickbait_thesis || res.shock_payload,
      parse_success: true,
      retries: { ...(state.retries || {}), researcher: 0 },
    };
  }

  return {
    parse_success: false,
    retries: { ...(state.retries || {}), researcher: (state.retries?.researcher || 0) + 1 },
  };
};

const clickbaitHookSchema = z.object({
  core_delta: z.string().optional(),
  core_hooks: z.array(z.string()).min(1, "Must generate at least one hook"),
  selected_hook: z.string().min(1, "Must select a hook"),
});

const clickbaitHookStrategistAgents = buildAgents<z.infer<typeof clickbaitHookSchema>>(
  [
    googleGemini38FlashT08ThinkingKey1,
    googleGemini38FlashT08ThinkingKey2,
    googleGemini36FlashT08ThinkingKey1,
    googleGemini36FlashT08ThinkingKey2,
    deepSeekFlashT08ReasoningHigh,
  ],
  {
    systemPrompt: CLICKBAIT_HOOK_PROMPT,
    responseFormat: {
      google: toolStrategy(clickbaitHookSchema),
      deepseek: providerStrategy(clickbaitHookSchema),
    },
  }
);

export const ClickbaitHookStrategistNode = async (
  state: ClickbaitThreadFactoryStateType,
  config?: RunnableConfig
) => {
  let result;
  let parse_success = false;

  try {
    const guidanceContext = state.guidance
      ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>`
      : "";
    const angleContext = state.archetype
      ? `\n\n<CLICKBAIT_VECTOR>\nArchetype: ${state.archetype}\nShock Payload: ${state.shock_payload}\nWithheld Mechanism: ${state.withheld_mechanism}\nHigh Arousal Target: ${state.high_arousal_valence}\n</CLICKBAIT_VECTOR>`
      : "";
    const deltaContext = state.core_delta
      ? `\n\n<CORE_DELTA>\n${state.core_delta}\n</CORE_DELTA>`
      : "";

    result = await invokeWithFallbacks(
      clickbaitHookStrategistAgents,
      {
        messages: [
          {
            role: "user",
            content: `<SOURCE>\n${state.raw_markdown}\n</SOURCE>${angleContext}${deltaContext}${guidanceContext}`,
          },
        ],
      },
      { ...config, timeout: 60000 }
    );
    parse_success = true;
  } catch (err) {
    console.warn("[ClickbaitHookStrategistNode] Hook generation failed:", err);
    parse_success = false;
  }

  let core_hooks: string[] = [];
  let selected_hook = "";
  let core_delta: string | undefined = state.core_delta;

  if (parse_success && result?.structuredResponse) {
    core_hooks = result.structuredResponse.core_hooks || [];
    selected_hook = result.structuredResponse.selected_hook || "";
    core_delta = result.structuredResponse.core_delta || state.core_delta;
  } else {
    parse_success = false;
  }

  return {
    core_hooks,
    selected_hook,
    core_delta,
    parse_success,
    retries: { ...(state.retries || {}), hook: (state.retries?.hook || 0) + 1 },
  };
};

export const ManualHookSelectionNode = async (
  state: ClickbaitThreadFactoryStateType,
  _config?: RunnableConfig
) => {
  const selected_hook = interrupt({
    core_hooks: state.core_hooks,
    action: "Please select a clickbait hook to proceed.",
  });
  return { selected_hook: extractSelectedHook(selected_hook) };
};

export const CliffhangerThreadWriterNode = async (
  state: ClickbaitThreadFactoryStateType,
  config?: RunnableConfig
) => {
  const previousDraftContext =
    state.thread_draft && state.thread_draft.length > 0
      ? `\n\n<PREVIOUS_THREAD_DRAFT>\n${JSON.stringify(state.thread_draft, null, 2)}\n</PREVIOUS_THREAD_DRAFT>`
      : "";
  const critiqueContext = state.critique
    ? `\n\n<CRITIQUE_TO_ADDRESS>\n${state.critique}\n</CRITIQUE_TO_ADDRESS>`
    : "";
  let postCritiquesContext = "";
  const actionable = filterActionablePostCritiques(state.post_critiques);
  if (actionable.length > 0) {
    postCritiquesContext =
      "\n\n<POST_SPECIFIC_CRITIQUES>\n" +
      actionable
        .map(
          (pc) =>
            `Post ${pc.post_index}: ${pc.critique}${
              pc.fix_directive ? `\nFix Directive: ${pc.fix_directive}` : ""
            }`
        )
        .join("\n\n") +
      "\n</POST_SPECIFIC_CRITIQUES>";
  }
  const charCritiqueContext = state.character_critique
    ? `\n\n<CHARACTER_AND_FORMATTING_CONSTRAINTS_FAILED>\n${state.character_critique}\nFix the previous draft to respect these exact formatting constraints.\n</CHARACTER_AND_FORMATTING_CONSTRAINTS_FAILED>`
    : "";
  const guidanceContext = state.guidance
    ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>`
    : "";
  const angleContext = state.archetype
    ? `\n\n<CLICKBAIT_STRATEGY>\nArchetype: ${state.archetype}\nShock Payload: ${state.shock_payload}\nWithheld Mechanism: ${state.withheld_mechanism}\nHigh Arousal Target: ${state.high_arousal_valence}\n</CLICKBAIT_STRATEGY>`
    : "";
  const deltaContext = state.core_delta
    ? `\n\n<CORE_DELTA>\n${state.core_delta}\n</CORE_DELTA>`
    : "";

  // Surgical mode detection (Pillar 1: Surgical Post Pinning)
  const formattingFlagged = parseFlaggedPostIndicesFromErrors(state.character_critique);
  const flaggedIndices = Array.from(
    new Set([...actionable.map((pc) => pc.post_index), ...formattingFlagged])
  ).filter((idx) => state.thread_draft && idx >= 1 && idx <= state.thread_draft.length);

  const hasPreviousDraft = Array.isArray(state.thread_draft) && state.thread_draft.length > 0;
  const isSurgical = hasPreviousDraft && flaggedIndices.length > 0 && flaggedIndices.length < state.thread_draft.length;

  const { pinnedPostsContext } = isSurgical
    ? buildSurgicalWriterContext(state.thread_draft, flaggedIndices)
    : { pinnedPostsContext: "" };

  const promptContent = `Here is the selected clickbait hook for Post 1:\n<SELECTED_HOOK>\n${state.selected_hook}\n</SELECTED_HOOK>\n\nHere are the extracted facts from the webpage:\n<SOURCE_FACTS>\n${state.raw_markdown}\n</SOURCE_FACTS>${angleContext}${deltaContext}${previousDraftContext}${critiqueContext}${postCritiquesContext}${charCritiqueContext}${guidanceContext}${pinnedPostsContext}`;

  let draft;
  let parse_success = false;

  try {
    draft = await invokeWithFallbacks(
      threadWriterModelCandidates,
      [
        { role: "system", content: CLIFFHANGER_WRITER_PROMPT },
        { role: "user", content: promptContent },
      ],
      { ...config, timeout: 120000 }
    );
    parse_success = true;
  } catch (err) {
    console.warn("[CliffhangerThreadWriterNode] Writer failed:", err);
    parse_success = false;
  }

  let finalThreadDraft = state.thread_draft;
  if (parse_success && draft?.thread_draft && Array.isArray(draft.thread_draft)) {
    if (isSurgical && state.thread_draft) {
      finalThreadDraft = reconcileSurgicalDraft(
        state.thread_draft,
        draft.thread_draft,
        flaggedIndices
      );
    } else {
      finalThreadDraft = draft.thread_draft;
    }
  }

  return {
    thread_draft: finalThreadDraft,
    parse_success,
    retries: { ...(state.retries || {}), writer: (state.retries?.writer || 0) + 1 },
  };
};

export const CharacterValidatorNode = async (
  state: ClickbaitThreadFactoryStateType,
  config?: RunnableConfig
) => {
  const validationStr = await CharacterValidatorTool.invoke(
    { thread_draft: state.thread_draft },
    { ...config, timeout: 60000 }
  );
  const validation = JSON.parse(validationStr);

  if (!validation.isValid) {
    return {
      is_character_valid: false,
      character_critique: `FORMATTING ERRORS REQUIRED TO FIX:\n${validation.errors.join("\n")}`,
      retries: { ...(state.retries || {}), validator: (state.retries?.validator || 0) + 1 },
    };
  }

  return {
    is_character_valid: true,
    character_critique: "",
  };
};

const clickbaitCriticSchema = z.object({
  virality_score: z.number(),
  overall_critique: z.string(),
  post_critiques: z.array(
    z.object({
      post_index: z.number(),
      critique: z.string(),
      fix_directive: z.string().optional(),
    })
  ),
});

const clickbaitViralityCriticAgents = buildAgents<z.infer<typeof clickbaitCriticSchema>>(
  criticModelCandidates,
  {
    tools: [ContentAuthenticityCheckerTool],
    systemPrompt: CLICKBAIT_CRITIC_PROMPT,
    responseFormat: {
      google: toolStrategy(clickbaitCriticSchema),
      deepseek: providerStrategy(clickbaitCriticSchema),
    },
  }
);

const clickbaitDifferentialCriticAgents = buildAgents<
  z.infer<typeof differentialCriticSchema>
>(criticModelCandidates, {
  systemPrompt: CLICKBAIT_DIFFERENTIAL_CRITIC_PROMPT,
  responseFormat: {
    google: toolStrategy(differentialCriticSchema),
    deepseek: providerStrategy(differentialCriticSchema),
  },
});

export const ClickbaitViralityCriticNode = async (
  state: ClickbaitThreadFactoryStateType,
  config?: RunnableConfig
) => {
  const guidanceContext = state.guidance
    ? `\n\n<ADDITIONAL_GUIDANCE>\n${state.guidance}\n</ADDITIONAL_GUIDANCE>`
    : "";
  const deltaContext = state.core_delta
    ? `\n\n<CORE_DELTA>\n${state.core_delta}\n</CORE_DELTA>`
    : "";
  const angleContext = state.archetype
    ? `\n\n<CLICKBAIT_STRATEGY>\nArchetype: ${state.archetype}\nShock Payload: ${state.shock_payload}\nWithheld Mechanism: ${state.withheld_mechanism}\nHigh Arousal Target: ${state.high_arousal_valence}\n</CLICKBAIT_STRATEGY>`
    : "";

  const priorActionableCritiques = filterActionablePostCritiques(state.post_critiques);
  const isDifferentialMode = state.iterations >= 1 && priorActionableCritiques.length > 0;

  if (isDifferentialMode) {
    const priorPunchlistStr = priorActionableCritiques
      .map(
        (pc) =>
          `Post ${pc.post_index}: ${pc.critique}${
            pc.fix_directive ? `\nFix Directive: ${pc.fix_directive}` : ""
          }`
      )
      .join("\n\n");

    let result;
    let parse_success = false;
    try {
      result = await invokeWithFallbacks(
        clickbaitDifferentialCriticAgents,
        {
          messages: [
            {
              role: "user",
              content: `<CURRENT_ITERATION_ATTEMPT>\n${
                state.iterations + 1
              }\n</CURRENT_ITERATION_ATTEMPT>\n\n<PRIOR_ISSUES_PUNCHLIST>\n${priorPunchlistStr}\n</PRIOR_ISSUES_PUNCHLIST>\n\n<THREAD>\n${JSON.stringify(
                state.thread_draft,
                null,
                2
              )}\n</THREAD>${angleContext}${deltaContext}${guidanceContext}`,
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
      retries: {
        ...(state.retries || {}),
        critic: (state.retries?.critic || 0) + 1,
        validator: 0,
      },
      parse_success: true,
    };
  }

  let result;
  let parse_success = false;
  try {
    result = await invokeWithFallbacks(
      clickbaitViralityCriticAgents,
      {
        messages: [
          {
            role: "user",
            content: `<CURRENT_ITERATION_ATTEMPT>\n${
              state.iterations + 1
            }\n</CURRENT_ITERATION_ATTEMPT>\n\n<SOURCE_MATERIAL>\n${
              state.raw_markdown
            }\n</SOURCE_MATERIAL>${angleContext}${deltaContext}\n\n<THREAD>\n${JSON.stringify(
              state.thread_draft,
              null,
              2
            )}\n</THREAD>${guidanceContext}`,
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
  const rawPostCritiques = filterActionablePostCritiques(
    result.structuredResponse.post_critiques
  );
  const virality_score =
    typeof rawScore === "number" ? Math.min(100, Math.max(0, rawScore)) : 70;
  const nextPostCritiques = rawPostCritiques;
  const finalApproval = typeof virality_score === "number" && virality_score >= 85;

  let best_thread_draft = state.best_thread_draft || state.thread_draft;
  let best_virality_score = state.best_virality_score ?? virality_score;
  if (virality_score > (state.best_virality_score ?? -1)) {
    best_virality_score = virality_score;
    best_thread_draft = state.thread_draft;
  }

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
    retries: {
      ...(state.retries || {}),
      critic: (state.retries?.critic || 0) + 1,
      validator: 0,
    },
    parse_success: true,
  };
};
