/// <reference types="vite/client" />
"use node";
import { convexTest } from "convex-test";
import { expect, test, vi, afterEach } from "vitest";
import { WorkId } from "@convex-dev/workpool";
import { internal } from "./_generated/api";
import schema from "./schema";
import { notifications } from "./notifications/client";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => {
  vi.restoreAllMocks();
});

test("onGenerationComplete creates thread_generation_success notification when generation succeeds", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const threadId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("threadDrafts", {
      userId,
      selected_hook: "Top 5 AI Tools in 2026",
      generation_status: "success",
      is_published: false,
    });
  });

  const createSpy = vi.spyOn(notifications, "create").mockResolvedValue({
    created: true,
    notificationId: "n1",
  });

  await t.mutation(internal.notifications.onComplete.onGenerationComplete, {
    workId: "work_gen_1" as WorkId,
    context: {
      userId,
      threadId,
    },
    result: {
      kind: "success",
      returnValue: { recordId: threadId },
    },
  });

  expect(createSpy).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      targetId: userId,
      kind: "thread_generation_success",
      data: {
        threadId,
        title: "Thread Generation Succeeded",
        body: 'Your thread "Top 5 AI Tools in 2026" is ready for review.',
        href: `/threads/drafts/${threadId}/approve`,
      },
      dedupeKey: "thread_generation_success:work_gen_1",
      source: {
        type: "thread_generation",
        id: threadId,
      },
    })
  );
});

test("onGenerationComplete creates thread_generation_failed notification on failure", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const createSpy = vi.spyOn(notifications, "create").mockResolvedValue({
    created: true,
    notificationId: "n2",
  });

  await t.mutation(internal.notifications.onComplete.onGenerationComplete, {
    workId: "work_gen_failed_1" as WorkId,
    context: {
      userId,
    },
    result: {
      kind: "failed",
      error: "LLM rate limit exceeded",
    },
  });

  expect(createSpy).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      targetId: userId,
      kind: "thread_generation_failed",
      data: {
        threadId: undefined,
        title: "Thread Generation Failed",
        body: "Failed to generate thread: LLM rate limit exceeded",
        error: "LLM rate limit exceeded",
      },
      dedupeKey: "thread_generation_failed:work_gen_failed_1",
      source: {
        type: "thread_generation",
        id: "work_gen_failed_1",
      },
    })
  );
});

test("onGenerationComplete does not create notification when work is canceled", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const createSpy = vi.spyOn(notifications, "create").mockResolvedValue({
    created: true,
    notificationId: "n3",
  });

  await t.mutation(internal.notifications.onComplete.onGenerationComplete, {
    workId: "work_gen_canceled_1" as WorkId,
    context: {
      userId,
    },
    result: {
      kind: "canceled",
    },
  });

  expect(createSpy).not.toHaveBeenCalled();
});

test("onPublicationComplete creates thread_publication_success notification when publication succeeds", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const threadId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("threadDrafts", {
      userId,
      generation_status: "success",
      is_published: true,
      publication_status: "success",
    });
  });

  const createSpy = vi.spyOn(notifications, "create").mockResolvedValue({
    created: true,
    notificationId: "n4",
  });

  await t.mutation(internal.notifications.onComplete.onPublicationComplete, {
    workId: "work_pub_1" as WorkId,
    context: {
      userId,
      threadId,
    },
    result: {
      kind: "success",
      returnValue: { postIds: ["post_1", "post_2", "post_3"], threadId },
    },
  });

  expect(createSpy).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      targetId: userId,
      kind: "thread_publication_success",
      data: {
        threadId,
        title: "Thread Published Successfully",
        body: "Your thread was published to Threads (3 posts).",
        postIds: ["post_1", "post_2", "post_3"],
        href: `/threads/drafts/${threadId}/approve`,
      },
      dedupeKey: "thread_publication_success:work_pub_1",
      source: {
        type: "thread_publication",
        id: threadId,
      },
    })
  );
});

test("onPublicationComplete creates thread_publication_failed notification on failure", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const threadId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("threadDrafts", {
      userId,
      generation_status: "success",
      is_published: false,
      publication_status: "failed",
    });
  });

  const createSpy = vi.spyOn(notifications, "create").mockResolvedValue({
    created: true,
    notificationId: "n5",
  });

  await t.mutation(internal.notifications.onComplete.onPublicationComplete, {
    workId: "work_pub_failed_1" as WorkId,
    context: {
      userId,
      threadId,
    },
    result: {
      kind: "failed",
      error: "Threads API authentication expired",
    },
  });

  expect(createSpy).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      targetId: userId,
      kind: "thread_publication_failed",
      data: {
        threadId,
        title: "Thread Publication Failed",
        body: "Failed to publish thread: Threads API authentication expired",
        error: "Threads API authentication expired",
      },
      dedupeKey: "thread_publication_failed:work_pub_failed_1",
      source: {
        type: "thread_publication",
        id: threadId,
      },
    })
  );
});
