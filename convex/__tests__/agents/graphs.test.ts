/// <reference types="vite/client" />
import { expect, test, describe } from "vitest";
import { END } from "@langchain/langgraph";
import { NewsThreadFactoryGraph, route_after_critic as newsRouteAfterCritic } from "../../lib/agents/news/graph";
import { SocialMediaThreadFactoryGraph, route_after_critic as socialMediaRouteAfterCritic } from "../../lib/agents/social_media/graph";
import { TopicThreadFactoryGraph, route_after_critic as topicRouteAfterCritic } from "../../lib/agents/topic/graph";
import type { NewsThreadFactoryStateType } from "../../lib/agents/news/state";
import type { SocialMediaThreadFactoryStateType } from "../../lib/agents/social_media/state";
import type { TopicThreadFactoryStateType } from "../../lib/agents/topic/state";

type RouterState = NewsThreadFactoryStateType &
  SocialMediaThreadFactoryStateType &
  TopicThreadFactoryStateType;

type RouterFn = (state: RouterState) => string;

test("NewsThreadFactoryGraph - structure & node compilation", () => {
  expect(NewsThreadFactoryGraph).toBeDefined();
  expect(typeof NewsThreadFactoryGraph.invoke).toBe("function");
});

test("SocialMediaThreadFactoryGraph - structure & node compilation", () => {
  expect(SocialMediaThreadFactoryGraph).toBeDefined();
  expect(typeof SocialMediaThreadFactoryGraph.invoke).toBe("function");
});

test("TopicThreadFactoryGraph - structure & node compilation", () => {
  expect(TopicThreadFactoryGraph).toBeDefined();
  expect(typeof TopicThreadFactoryGraph.invoke).toBe("function");
});

describe.each<{ name: string; router: RouterFn }>([
  { name: "NewsThreadFactory", router: newsRouteAfterCritic },
  { name: "SocialMediaThreadFactory", router: socialMediaRouteAfterCritic },
  { name: "TopicThreadFactory", router: topicRouteAfterCritic },
])("$name route_after_critic", ({ router }) => {
  const baseState = {
    url: "https://example.com",
    raw_markdown: "content",
    research_context: "",
    core_hooks: [],
    selected_hook: "hook",
    thread_draft: ["post 1", "post 2"],
    critique: "",
    character_critique: "",
    is_character_valid: true,
    search_query_generation: false,
  };

  test("retries ViralityCriticNode if parse failed and retries < 3", () => {
    const nextNode = router({
      ...baseState,
      parse_success: false,
      retries: { scraper: 0, researcher: 0, hook: 0, writer: 0, critic: 1, validator: 0 },
      iterations: 0,
    } as unknown as RouterState);
    expect(nextNode).toBe("ViralityCriticNode");
  });

  test("throws error if parse failed and retries >= 3", () => {
    expect(() =>
      router({
        ...baseState,
        parse_success: false,
        retries: { scraper: 0, researcher: 0, hook: 0, writer: 0, critic: 3, validator: 0 },
        iterations: 0,
      } as unknown as RouterState)
    ).toThrow("ViralityCriticNode failed after 3 retries");
  });

  test("iteration 1: retries ThreadWriterNode when approved but actionable fix_directive is present", () => {
    const nextNode = router({
      ...baseState,
      parse_success: true,
      is_approved: true,
      iterations: 1,
      post_critiques: [
        {
          post_index: 1,
          critique: "Hook reveals payoff too early",
          fix_directive: "Cut payoff and end on curiosity gap",
        },
      ],
    } as unknown as RouterState);
    expect(nextNode).toBe("ThreadWriterNode");
  });

  test("iteration 1: DOES NOT retry when approved and critiques exist but fix_directive is undefined or empty", () => {
    const nextNodeWithoutFix = router({
      ...baseState,
      parse_success: true,
      is_approved: true,
      iterations: 1,
      post_critiques: [
        {
          post_index: 1,
          critique: "Looks solid overall",
        },
        {
          post_index: 2,
          critique: "Clean pacing",
          fix_directive: "",
        },
        {
          post_index: 3,
          critique: "Good rhythm",
          fix_directive: "   ",
        },
      ],
    } as unknown as RouterState);
    expect(nextNodeWithoutFix).toBe(END);
  });

  test("iteration 1: routes to VisualKeywordStrategistNode when approved and no fix_directive if search_query_generation is true", () => {
    const nextNode = router({
      ...baseState,
      parse_success: true,
      is_approved: true,
      iterations: 1,
      search_query_generation: true,
      post_critiques: [
        {
          post_index: 1,
          critique: "Observation without directive",
        },
      ],
    } as unknown as RouterState);
    expect(nextNode).toBe("VisualKeywordStrategistNode");
  });

  test("iteration 1: routes to END when approved with empty post_critiques", () => {
    const nextNode = router({
      ...baseState,
      parse_success: true,
      is_approved: true,
      iterations: 1,
      post_critiques: [],
    } as unknown as RouterState);
    expect(nextNode).toBe(END);
  });

  test("iteration 2: does NOT retry even if fix_directive is present when approved", () => {
    const nextNode = router({
      ...baseState,
      parse_success: true,
      is_approved: true,
      iterations: 2,
      post_critiques: [
        {
          post_index: 1,
          critique: "Needs improvement",
          fix_directive: "Rewrite line 1",
        },
      ],
    } as unknown as RouterState);
    expect(nextNode).toBe(END);
  });

  test("unapproved draft (is_approved === false): always retries ThreadWriterNode when iterations < 3", () => {
    const nextNode = router({
      ...baseState,
      parse_success: true,
      is_approved: false,
      iterations: 1,
      post_critiques: [],
    } as unknown as RouterState);
    expect(nextNode).toBe("ThreadWriterNode");
  });

  test("iterations >= 3: exits graph even if not approved", () => {
    const nextNode = router({
      ...baseState,
      parse_success: true,
      is_approved: false,
      iterations: 3,
      post_critiques: [
        {
          post_index: 1,
          critique: "Still failing",
          fix_directive: "Fix everything",
        },
      ],
    } as unknown as RouterState);
    expect(nextNode).toBe(END);
  });
});
