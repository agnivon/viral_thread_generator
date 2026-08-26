/// <reference types="vite/client" />
"use node";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("threadsQueries - getThreadDraft unauthorized when not logged in or wrong user", async () => {
  const t = convexTest(schema, modules);
  const user1 = await t.mutation(async (ctx) => ctx.db.insert("users", {}));
  const user2 = await t.mutation(async (ctx) => ctx.db.insert("users", {}));

  const draftId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("threadDrafts", {
      userId: user1,
      generation_status: "success",
      is_published: false,
    });
  });

  // 1. Unauthenticated query should throw Unauthorized
  await expect(t.query(api.queries.threadsQueries.getThreadDraft, { id: draftId }))
    .rejects.toThrow("Unauthorized");

  // 2. Query as another user should throw Unauthorized
  const tUser2 = t.withIdentity({ subject: user2 });
  await expect(tUser2.query(api.queries.threadsQueries.getThreadDraft, { id: draftId }))
    .rejects.toThrow("Unauthorized");

  // 3. Query as owner should succeed
  const tUser1 = t.withIdentity({ subject: user1 });
  const draft = await tUser1.query(api.queries.threadsQueries.getThreadDraft, { id: draftId });
  expect(draft).not.toBeNull();
  expect(draft?._id).toBe(draftId);
  expect(draft?.userId).toBe(user1);
});

test("threadsQueries - getAllThreadDrafts & getPaginatedThreadDrafts", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => ctx.db.insert("users", {}));

  const draftId1 = await t.mutation(async (ctx) => {
    return await ctx.db.insert("threadDrafts", {
      userId,
      generation_status: "success",
      is_published: false,
      raw_markdown: "Draft 1",
    });
  });

  const _draftId2 = await t.mutation(async (ctx) => {
    return await ctx.db.insert("threadDrafts", {
      userId,
      generation_status: "success",
      is_published: false,
      raw_markdown: "Draft 2",
    });
  });

  const tUser = t.withIdentity({ subject: userId });

  // getAllThreadDrafts
  const allDrafts = await tUser.query(api.queries.threadsQueries.getAllThreadDrafts, {});
  expect(allDrafts.length).toBe(2);

  // getPaginatedThreadDrafts
  const paginated = await tUser.query(api.queries.threadsQueries.getPaginatedThreadDrafts, {
    paginationOpts: { numItems: 1, cursor: null },
  });
  expect(paginated.page.length).toBe(1);
  expect(paginated.isDone).toBe(false);

  // getThreadDraftInternal
  const internalDraft = await t.query(internal.queries.threadsQueries.getThreadDraftInternal, {
    id: draftId1,
    userId,
  });
  expect(internalDraft?._id).toBe(draftId1);

  const user2 = await t.mutation(async (ctx) => ctx.db.insert("users", {}));
  await expect(
    t.query(internal.queries.threadsQueries.getThreadDraftInternal, {
      id: draftId1,
      userId: user2,
    })
  ).rejects.toThrow("Unauthorized");
});

test("tokensQueries - hasActiveToken & getLatestToken", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => ctx.db.insert("users", {}));

  // When no token exists
  const tUser = t.withIdentity({ subject: userId });
  const hasTokenInitial = await tUser.query(api.queries.tokensQueries.hasActiveToken, {
    platform: "threads",
    type: "long lived",
  });
  expect(hasTokenInitial).toBe(false);

  // Unauthenticated user checks token status -> false
  const unauthHasToken = await t.query(api.queries.tokensQueries.hasActiveToken, {
    platform: "threads",
    type: "long lived",
  });
  expect(unauthHasToken).toBe(false);

  // Insert active token
  await t.mutation(async (ctx) => {
    return await ctx.db.insert("accessTokens", {
      token: "active-test-token",
      userId,
      platformUserId: "platform-123",
      platform: "threads",
      type: "long lived",
      active: true,
      expiredIn: Date.now() + 100000,
      lastCreated: Date.now(),
      lastUpdated: Date.now(),
    });
  });

  const hasTokenAfter = await tUser.query(api.queries.tokensQueries.hasActiveToken, {
    platform: "threads",
    type: "long lived",
  });
  expect(hasTokenAfter).toBe(true);

  const latestToken = await t.query(internal.queries.tokensQueries.getLatestToken, {
    platform: "threads",
    type: "long lived",
    userId,
  });
  expect(latestToken).not.toBeNull();
  expect(latestToken?.token).toBe("active-test-token");
});
