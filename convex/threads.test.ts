/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi, afterEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { ThreadFactoryGraph } from "./lib/agents/graph.js";
import { ThreadsAPI } from "./lib/ThreadsAPI.js";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => {
  vi.restoreAllMocks();
});

test("saveThreadDraft mutation saves state correctly", async () => {
  const t = convexTest(schema, modules);

  const inputState = {
    url: "https://example.com/test-url",
    raw_markdown: "Some raw markdown content",
    core_hooks: ["hookA", "hookB"],
    selected_hook: "hookA",
    thread_draft: ["tweet 1", "tweet 2"],
    critique: "Perfect",
    iterations: 1,
    is_approved: true,
  };

  const id = await t.mutation(internal.mutations.threadsMutations.saveThreadDraft, inputState);
  expect(id).toBeDefined();

  // Read it back
  const saved = await t.query(async (ctx) => {
    return await ctx.db.get("threadDrafts", id);
  });

  expect(saved).toMatchObject({ ...inputState, is_published: false });
});

test("generateThread action runs graph and saves result", async () => {
  const t = convexTest(schema, modules);

  const mockGraphOutput = {
    url: "https://example.com/target-url",
    raw_markdown: "Graph markdown result",
    core_hooks: ["g1", "g2"],
    selected_hook: "g2",
    thread_draft: ["draft post 1", "draft post 2"],
    critique: "Needs minor polish",
    iterations: 3,
    is_approved: false,
    parse_success: true,
    retries: { scraper: 0, hook: 0, writer: 0, critic: 0 },
  };

  const invokeSpy = vi.spyOn(ThreadFactoryGraph, "invoke").mockResolvedValue(mockGraphOutput);

  const tAuth = t.withIdentity({ subject: "mock-user-id" });
  const recordId = await tAuth.action(api.actions.threadsActions.generateThread, {
    url: "https://example.com/target-url",
  });

  expect(recordId).toBeDefined();
  expect(invokeSpy).toHaveBeenCalledWith({
    url: "https://example.com/target-url",
    raw_markdown: "",
    core_hooks: [],
    selected_hook: "",
    thread_draft: [],
    critique: "",
    iterations: 0,
    is_approved: false,
  });

  // Verify the saved state in the database matches the mocked output
  const saved = await t.query(async (ctx) => {
    return await ctx.db.get("threadDrafts", recordId);
  });

  const { parse_success: _p, retries: _r, ...expectedDbFields } = mockGraphOutput;
  expect(saved).toMatchObject(expectedDbFields);
});

test("publishThread action retrieves state and publishes thread of posts sequentially", async () => {
  const t = convexTest(schema, modules);

  // 1. Insert threads active access token
  await t.mutation(internal.mutations.tokensMutations.storeAuthToken, {
    userId: "mock-user-id",
    platform: "threads",
    token: "mock-long-lived-token",
    type: "long lived",
    active: true,
    expiresIn: 3600,
  });

  // 2. Insert thread factory state record
  const stateId = await t.mutation(internal.mutations.threadsMutations.saveThreadDraft, {
    url: "https://example.com/source-url",
    raw_markdown: "Some raw markdown",
    core_hooks: [],
    selected_hook: "",
    thread_draft: ["First post text", "Second post text"],
    critique: "",
    iterations: 0,
    is_approved: true,
  });

  // 3. Spy/Mock ThreadsAPI calls
  const createPostSpy = vi.spyOn(ThreadsAPI.prototype, "createPost").mockResolvedValue("post-id-1");
  const createReplySpy = vi.spyOn(ThreadsAPI.prototype, "createReply")
    .mockResolvedValueOnce("post-id-2")
    .mockResolvedValueOnce("post-id-3");

  // 4. Run the publishThread action
  const tAuth = t.withIdentity({ subject: "mock-user-id" });
  const result = await tAuth.action(api.actions.threadsActions.publishThread, {
    id: stateId,
  });

  // 5. Verify results
  expect(result.postIds).toEqual(["post-id-1", "post-id-2", "post-id-3"]);

  expect(createPostSpy).toHaveBeenCalledTimes(1);
  expect(createPostSpy).toHaveBeenCalledWith({ text: "First post text" });

  expect(createReplySpy).toHaveBeenCalledTimes(2);
  expect(createReplySpy).toHaveBeenNthCalledWith(1, "post-id-1", { text: "Second post text" });
  expect(createReplySpy).toHaveBeenNthCalledWith(2, "post-id-2", { text: "https://example.com/source-url" });
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


