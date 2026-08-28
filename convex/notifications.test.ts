/// <reference types="vite/client" />
"use node";
import { convexTest } from "convex-test";
import { expect, test, vi, afterEach } from "vitest";
import { WorkId } from "@convex-dev/workpool";
import { internal, api } from "./_generated/api";
import schema from "./schema";
import { notifications } from "./notifications/client";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => {
  vi.restoreAllMocks();
});

test("notifications.create inserts a new notification and respects dedupeKey", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const res1 = await t.mutation(async (ctx) => {
    return await notifications.create(ctx, {
      targetId: userId,
      kind: "thread_generation_success",
      data: {
        title: "Thread Ready",
        body: "Your thread is ready.",
      },
      dedupeKey: "dedupe_123",
    });
  });

  expect(res1.created).toBe(true);
  expect(res1.notificationId).toBeDefined();

  // Second insert with same dedupeKey should be ignored
  const res2 = await t.mutation(async (ctx) => {
    return await notifications.create(ctx, {
      targetId: userId,
      kind: "thread_generation_success",
      data: {
        title: "Thread Ready Again",
      },
      dedupeKey: "dedupe_123",
    });
  });

  expect(res2.created).toBe(false);
  expect(res2.notificationId).toBe(res1.notificationId);
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
    notificationId: "n1" as unknown as Id<"notifications">,
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
    notificationId: "n2" as unknown as Id<"notifications">,
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
    notificationId: "n3" as unknown as Id<"notifications">,
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

test("onPublicationComplete creates thread_publication_success notification with permalink", async () => {
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
    notificationId: "n4" as unknown as Id<"notifications">,
  });

  await t.mutation(internal.notifications.onComplete.onPublicationComplete, {
    workId: "work_pub_1" as WorkId,
    context: {
      userId,
      threadId,
    },
    result: {
      kind: "success",
      returnValue: {
        postIds: ["post_1", "post_2", "post_3"],
        threadId,
        permalink: "https://www.threads.net/@mockuser/post/post_1",
      },
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
        href: "https://www.threads.net/@mockuser/post/post_1",
      },
      dedupeKey: "thread_publication_success:work_pub_1",
      source: {
        type: "thread_publication",
        id: threadId,
      },
    })
  );
});

test("onPublicationComplete uses canonical Threads shortlink fallback when permalink is absent", async () => {
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
    notificationId: "n4_fallback" as unknown as Id<"notifications">,
  });

  await t.mutation(internal.notifications.onComplete.onPublicationComplete, {
    workId: "work_pub_fallback_1" as WorkId,
    context: {
      userId,
      threadId,
    },
    result: {
      kind: "success",
      returnValue: {
        postIds: ["post_1", "post_2"],
        threadId,
      },
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
        body: "Your thread was published to Threads (2 posts).",
        postIds: ["post_1", "post_2"],
        href: "https://www.threads.net/t/post_1",
      },
      dedupeKey: "thread_publication_success:work_pub_fallback_1",
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
    notificationId: "n5" as unknown as Id<"notifications">,
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

test("notifications queries and mutations: markSeen, markAllSeen, dismiss, dismissAll", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const authedT = t.withIdentity({ subject: userId });

  // Insert 2 notifications
  const n1 = await t.mutation(async (ctx) => {
    return await ctx.db.insert("notifications", {
      userId,
      kind: "thread_generation_success",
      data: { title: "Draft 1 Ready" },
      isSeen: false,
      isDismissed: false,
      createdAt: Date.now() - 1000,
    });
  });

  const n2 = await t.mutation(async (ctx) => {
    return await ctx.db.insert("notifications", {
      userId,
      kind: "thread_generation_failed",
      data: { title: "Draft 2 Failed", body: "Error" },
      isSeen: false,
      isDismissed: false,
      createdAt: Date.now(),
    });
  });

  // Verify initial unseen count and list
  const initialUnseen = await authedT.query(api.notifications.unseenCount, {});
  expect(initialUnseen).toBe(2);

  const initialList = await authedT.query(api.notifications.list, {});
  expect(initialList.length).toBe(2);

  // Test markSeen
  await authedT.mutation(api.notifications.markSeen, { notificationId: n1 });
  const afterSeen = await authedT.query(api.notifications.unseenCount, {});
  expect(afterSeen).toBe(1);

  // Test markAllSeen
  await authedT.mutation(api.notifications.markAllSeen, {});
  const afterAllSeen = await authedT.query(api.notifications.unseenCount, {});
  expect(afterAllSeen).toBe(0);

  // Test dismiss (soft delete)
  await authedT.mutation(api.notifications.dismiss, { notificationId: n1 });
  const activeList = await authedT.query(api.notifications.list, { includeDismissed: false });
  expect(activeList.length).toBe(1);
  expect(activeList[0]._id).toBe(n2);

  // Check document in DB has isDismissed: true and dismissedAt
  const doc1 = await t.query(async (ctx) => ctx.db.get("notifications", n1));
  expect(doc1?.isDismissed).toBe(true);
  expect(doc1?.dismissedAt).toBeDefined();

  // Test dismissAll (soft delete all)
  await authedT.mutation(api.notifications.dismissAll, {});
  const emptyActiveList = await authedT.query(api.notifications.list, {});
  expect(emptyActiveList.length).toBe(0);

  const allList = await authedT.query(api.notifications.list, { includeDismissed: true });
  expect(allList.length).toBe(2);
});

test("purgeDismissed internal mutation hard deletes stale dismissed notifications", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
  const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;

  // 1. Stale dismissed notification (10 days old -> should be hard deleted)
  const staleId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("notifications", {
      userId,
      kind: "thread_generation_success",
      data: { title: "Old Notification" },
      isSeen: true,
      isDismissed: true,
      dismissedAt: tenDaysAgo,
      createdAt: tenDaysAgo - 1000,
    });
  });

  // 2. Recent dismissed notification (2 days old -> should be kept)
  const recentDismissedId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("notifications", {
      userId,
      kind: "thread_generation_success",
      data: { title: "Recent Dismissed Notification" },
      isSeen: true,
      isDismissed: true,
      dismissedAt: twoDaysAgo,
      createdAt: twoDaysAgo - 1000,
    });
  });

  // 3. Active notification (not dismissed -> should be kept)
  const activeId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("notifications", {
      userId,
      kind: "thread_generation_success",
      data: { title: "Active Notification" },
      isSeen: false,
      isDismissed: false,
      createdAt: Date.now(),
    });
  });

  // Run purge with 7-day retention
  const purgeResult = await t.mutation(internal.notifications.purgeDismissed, {
    retentionDays: 7,
  });

  expect(purgeResult.purged).toBe(1);

  // Stale doc is permanently gone
  const staleDoc = await t.query(async (ctx) => ctx.db.get("notifications", staleId));
  expect(staleDoc).toBeNull();

  // Recent dismissed doc is still in DB
  const recentDoc = await t.query(async (ctx) => ctx.db.get("notifications", recentDismissedId));
  expect(recentDoc).not.toBeNull();

  // Active doc is still in DB
  const activeDoc = await t.query(async (ctx) => ctx.db.get("notifications", activeId));
  expect(activeDoc).not.toBeNull();
});

test("runBackfillAllNotifications creates notifications from existing thread drafts", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  // Create 1 success generated draft, 1 failed generated draft, and 1 published draft
  await t.mutation(async (ctx) => {
    await ctx.db.insert("threadDrafts", {
      userId,
      selected_hook: "10 Tips for High Reach",
      generation_status: "success",
      is_published: false,
    });
    await ctx.db.insert("threadDrafts", {
      userId,
      generation_status: "failed",
      failure_reason: "API quota exceeded",
      is_published: false,
    });
    await ctx.db.insert("threadDrafts", {
      userId,
      generation_status: "success",
      is_published: true,
      publication_status: "success",
      thread_draft: ["Post 1", "Post 2"],
    });
  });

  const res = await t.mutation(internal.migrations.runBackfillAllNotifications, {});
  expect(res.totalDrafts).toBe(3);
  // Draft 1 creates 1 (gen success), Draft 2 creates 1 (gen failed), Draft 3 creates 2 (gen success + pub success) -> 4 total
  expect(res.createdNotifications).toBe(4);

  // Second run should be idempotent due to dedupeKey
  const res2 = await t.mutation(internal.migrations.runBackfillAllNotifications, {});
  expect(res2.createdNotifications).toBe(0);
});

