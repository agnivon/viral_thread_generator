/// <reference types="vite/client" />
"use node";
import { convexTest } from "convex-test";
import { expect, test, vi, afterEach } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { NewsThreadFactoryGraph } from "./lib/agents/news/graph.js";
import { ThreadsAPI } from "./lib/threads/api.js";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => {
  vi.restoreAllMocks();
});

test("saveThreadDraft mutation saves state correctly", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const inputState = {
    url: "https://example.com/source-url",
    raw_markdown: "Mock raw markdown content",
    core_hooks: ["Hook 1", "Hook 2"],
    selected_hook: "Hook 1",
    thread_draft: ["Draft 1", "Draft 2"],
    critique: "Mock critique",
    virality_score: 95,
    post_critiques: [{ post_index: 1, critique: "" }],
    iterations: 1,
    is_approved: false,
    userId,
  };

  const id = await t.mutation(internal.mutations.threadsMutations.saveThreadDraft, inputState);
  expect(id).toBeDefined();

  // Read it back
  const saved = await t.query(async (ctx) => {
    return await ctx.db.get("threadDrafts", id);
  });

  expect(saved).toMatchObject({
    url: inputState.url,
    raw_markdown: inputState.raw_markdown,
    core_hooks: inputState.core_hooks,
    selected_hook: inputState.selected_hook,
    thread_draft: inputState.thread_draft,
    critique: inputState.critique,
    virality_score: inputState.virality_score,
    post_critiques: inputState.post_critiques,
    iterations: inputState.iterations,
    is_approved: inputState.is_approved,
    userId: inputState.userId,
    is_published: false,
    generation_status: "success",
  });
});

test("generateNewsThread action runs graph and saves result", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const mockGraphOutput = {
    url: "https://example.com/target-url",
    guidance: "Some test guidance",
    manual_hook_selection: true,
    raw_markdown: "Graph markdown result",
    core_hooks: ["g1", "g2"],
    selected_hook: "g2",
    thread_draft: ["draft post 1", "draft post 2"],
    images: [],
    critique: "Needs minor polish",
    virality_score: 90,
    post_critiques: [],
    character_critique: "",
    iterations: 3,
    is_approved: false,
    is_character_valid: true,
    parse_success: true,
    retries: { scraper: 0, researcher: 0, hook: 0, writer: 0, critic: 0, validator: 0 },
    search_queries: undefined,
    search_query_generation: false,
    research_context: "",
  };

  const invokeSpy = vi.spyOn(NewsThreadFactoryGraph, "invoke").mockResolvedValue(mockGraphOutput);

  // Mock getState to return empty next tasks so it thinks it finished without interrupt
  vi.spyOn(NewsThreadFactoryGraph, "getState").mockResolvedValue({ next: [] } as any);

  // 4. Trigger generation internal action
  const { recordId } = await t.action(internal.actions.threadsActions.generateThreadInternal, {
    input_field: { agent: "news", url: "https://example.com/target-url" },
    manual_hook_selection: true,
    userId,
  });

  expect(recordId).toBeDefined();
  expect(invokeSpy).toHaveBeenCalledWith({
    input_field: { agent: "news", url: "https://example.com/target-url" },
    guidance: undefined,
    manual_hook_selection: true,
    raw_markdown: "",
    core_hooks: [],
    selected_hook: "",
    thread_draft: [],
    critique: "",
    iterations: 0,
    is_approved: false,
  }, { configurable: { thread_id: recordId } });

  // Verify the saved state in the database matches the mocked output
  const saved = await t.query(async (ctx) => {
    return await ctx.db.get("threadDrafts", recordId);
  });

  const { parse_success: _p, retries: _r, ...expectedDbFields } = mockGraphOutput;
  expect(saved).toMatchObject({
    input_field: { agent: "news", url: expectedDbFields.url },
    raw_markdown: expectedDbFields.raw_markdown,
    core_hooks: expectedDbFields.core_hooks,
    selected_hook: expectedDbFields.selected_hook,
    thread_draft: [...expectedDbFields.thread_draft, "https://example.com/target-url"],
    critique: expectedDbFields.critique,
    virality_score: expectedDbFields.virality_score,
    post_critiques: expectedDbFields.post_critiques,
    iterations: expectedDbFields.iterations,
    is_approved: expectedDbFields.is_approved,
    generation_status: "success",
    manual_hook_selection: true,
  });
});

test("resumeNewsThreadGeneration action resumes graph and saves result", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  // 1. Insert thread factory state record in hook selection status
  const stateId = await t.mutation(internal.mutations.threadsMutations.saveThreadDraft, {
    input_field: { agent: "news", url: "https://example.com/source-url" },
    raw_markdown: "Mock raw markdown content",
    core_hooks: ["Hook 1", "Hook 2"],
    selected_hook: "",
    thread_draft: [],
    critique: "",
    virality_score: 0,
    post_critiques: [],
    iterations: 0,
    is_approved: false,
    userId,
  });

  const mockGraphOutput = {
    url: "https://example.com/source-url",
    guidance: "Test hook strategies",
    manual_hook_selection: true,
    raw_markdown: "Mock raw markdown content",
    core_hooks: ["Hook 1", "Hook 2"],
    selected_hook: "Hook 2",
    thread_draft: ["Draft 1"],
    images: [],
    critique: "Good",
    virality_score: 95,
    post_critiques: [],
    character_critique: "",
    iterations: 1,
    is_approved: true,
    is_character_valid: true,
    parse_success: true,
    retries: { scraper: 0, researcher: 0, hook: 0, writer: 0, critic: 0, validator: 0 },
    search_queries: undefined,
    search_query_generation: false,
    research_context: "",
  };

  const invokeSpy = vi.spyOn(NewsThreadFactoryGraph, "invoke").mockResolvedValue(mockGraphOutput);
  vi.spyOn(NewsThreadFactoryGraph, "getState").mockResolvedValue({ next: [] } as any);

  // 5. Resume the internal action
  const { recordId } = await t.action(internal.actions.threadsActions.resumeThreadInternal, {
    recordId: stateId,
    selected_hook: "Hook 2",
    userId,
  });

  expect(recordId).toBe(stateId);
  expect(invokeSpy).toHaveBeenCalled();
  
  const saved = await t.query(async (ctx) => {
    return await ctx.db.get("threadDrafts", recordId);
  });

  expect(saved?.generation_status).toBe("success");
  expect(saved?.selected_hook).toBe("Hook 2");
  expect(saved?.is_approved).toBe(true);
});

test("publishThread action retrieves state and publishes thread of posts sequentially", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  // 1. Insert threads active access token (expiring in 10 days, so refresh is skipped)
  await t.mutation(internal.mutations.tokensMutations.storeAuthToken, {
    userId,
    platform: "threads",
    platformUserId: "mock-platform-user",
    token: "mock-long-lived-token",
    type: "long lived",
    active: true,
    expiresIn: 10 * 24 * 60 * 60,
  });

  // 2. Insert thread factory state record
  const stateId = await t.mutation(internal.mutations.threadsMutations.saveThreadDraft, {
    input_field: { agent: "news", url: "https://example.com/source-url" },
    raw_markdown: "Mock raw markdown content",
    core_hooks: [],
    selected_hook: "Hook 1",
    thread_draft: ["Draft 1", "Draft 2"],
    critique: "Mock critique",
    virality_score: 95,
    post_critiques: [],
    iterations: 1,
    is_approved: true,
    userId,
  });

  // 3. Spy/Mock ThreadsAPI calls
  const createPostSpy = vi.spyOn(ThreadsAPI.prototype, "createPost").mockResolvedValue("post-id-1");
  const createReplySpy = vi.spyOn(ThreadsAPI.prototype, "createReply")
    .mockResolvedValueOnce("post-id-2");

  // 4. Run the publishThread action
  const result = await t.action(internal.actions.threadsActions.publishThread, {
    id: stateId,
    userId,
  });

  // 5. Verify results
  expect(result.postIds).toEqual(["post-id-1", "post-id-2"]);

  expect(createPostSpy).toHaveBeenCalledTimes(1);
  expect(createPostSpy).toHaveBeenCalledWith({ text: "Draft 1" });

  expect(createReplySpy).toHaveBeenCalledTimes(1);
  expect(createReplySpy).toHaveBeenNthCalledWith(1, "post-id-1", { text: "Draft 2" });
});

test("ThreadsAPI createContainer retries on propagation error (auto-publish)", async () => {
  vi.useFakeTimers();
  const apiInstance = new ThreadsAPI("mock-token", "mock-user-id");

  let fetchCallCount = 0;
  const fetchMock = vi.fn().mockImplementation(async (_url: string, _init?: RequestInit) => {
    fetchCallCount++;
    if (fetchCallCount === 1) {
      // First call (to create container) fails with a propagation error
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: "Unsupported post request. Object with ID '123' does not exist"
          }
        })
      } as Response;
    }
    // Second call (to create container) succeeds
    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: "mock-published-post-id"
      })
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);

  const promise = apiInstance.createReply("123", { text: "Reply text" });
  
  // Advance timers so the retry delay resolves
  await vi.runAllTimersAsync();
  const result = await promise;

  expect(result).toBe("mock-published-post-id");
  expect(fetchCallCount).toBe(2); // 1. fail container, 2. success container (auto-published)
  vi.useRealTimers();
});

test("ThreadsAPI publishContainer retries on propagation error (2-step flow with media)", async () => {
  vi.useFakeTimers();
  const apiInstance = new ThreadsAPI("mock-token", "mock-user-id");

  let fetchCallCount = 0;
  const fetchMock = vi.fn().mockImplementation(async (url: string, _init?: RequestInit) => {
    if (url.includes("fields=status")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: "FINISHED"
        })
      } as Response;
    }
    fetchCallCount++;
    if (url.includes("/threads_publish")) {
      if (fetchCallCount === 2) {
        // First publish attempt fails because container is not yet ready/propagated
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              message: "The requested resource does not exist"
            }
          })
        } as Response;
      }
      // Second publish attempt succeeds
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "published-media-post-id"
        })
      } as Response;
    }
    // Container creation succeeds immediately
    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: "mock-media-container-id"
      })
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);

  // Use imageUrl to trigger the 2-step media publishing flow
  const promise = apiInstance.createPost({ text: "Media post", imageUrl: "https://example.com/image.jpg" });
  
  // Advance timers so the retry delay resolves
  await vi.runAllTimersAsync();
  const result = await promise;

  expect(result).toBe("published-media-post-id");
  expect(fetchCallCount).toBe(3); // 1. create container, 2. fail publish, 3. success publish
  vi.useRealTimers();
});


