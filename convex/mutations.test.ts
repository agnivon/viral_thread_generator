/// <reference types="vite/client" />
"use node";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("threadsMutations - initializeThreadDraft, updateThreadDraft, markAsPublished, deleteThreadDraftInternal", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => ctx.db.insert("users", {}));
  const user2 = await t.mutation(async (ctx) => ctx.db.insert("users", {}));

  // 1. initializeThreadDraft
  const draftId = await t.mutation(internal.mutations.threadsMutations.initializeThreadDraft, {
    userId,
    agent: "news",
    input_field: { agent: "news", url: "https://news.example.com/item" },
    guidance: "Test guidance",
    manual_hook_selection: true,
    search_query_generation: true,
  });
  expect(draftId).toBeDefined();

  const initialDraft = await t.query(async (ctx) => ctx.db.get("threadDrafts", draftId));
  expect(initialDraft).toMatchObject({
    userId,
    agent: "news",
    generation_status: "processing",
    publication_status: "not_published",
    is_approved: false,
    is_published: false,
    guidance: "Test guidance",
    manual_hook_selection: true,
    search_query_generation: true,
  });

  // 2. updateThreadDraft
  await t.mutation(internal.mutations.threadsMutations.updateThreadDraft, {
    id: draftId,
    generation_status: "failed",
    failure_reason: "Scraper timeout after 60000ms",
    publication_status: "failed",
    publication_error: "Meta API Token Expired",
  });

  const failedDraft = await t.query(async (ctx) => ctx.db.get("threadDrafts", draftId));
  expect(failedDraft).toMatchObject({
    generation_status: "failed",
    failure_reason: "Scraper timeout after 60000ms",
    publication_status: "failed",
    publication_error: "Meta API Token Expired",
  });

  // 3. Clear failure_reason and publication_error on recovery
  await t.mutation(internal.mutations.threadsMutations.updateThreadDraft, {
    id: draftId,
    generation_status: "success",
    failure_reason: null,
    publication_status: "publishing",
    publication_error: null,
    raw_markdown: "# Updated Article",
    core_hooks: ["Hook A", "Hook B"],
    selected_hook: "Hook A",
    thread_draft: ["Post 1", "Post 2"],
    virality_score: 92,
    is_approved: true,
  });

  const updatedDraft = await t.query(async (ctx) => ctx.db.get("threadDrafts", draftId));
  expect(updatedDraft).toMatchObject({
    generation_status: "success",
    publication_status: "publishing",
    raw_markdown: "# Updated Article",
    core_hooks: ["Hook A", "Hook B"],
    selected_hook: "Hook A",
    thread_draft: ["Post 1", "Post 2"],
    virality_score: 92,
    is_approved: true,
  });
  expect(updatedDraft?.failure_reason).toBeUndefined();
  expect(updatedDraft?.publication_error).toBeUndefined();

  // 3. markAsPublished
  await t.mutation(internal.mutations.threadsMutations.markAsPublished, {
    id: draftId,
    userId,
  });

  const publishedDraft = await t.query(async (ctx) => ctx.db.get("threadDrafts", draftId));
  expect(publishedDraft?.is_published).toBe(true);

  // 4. deleteThreadDraftInternal unauthorized check
  const tUser2 = t.withIdentity({ subject: user2 });
  await expect(
    tUser2.mutation(internal.mutations.threadsMutations.deleteThreadDraftInternal, { id: draftId })
  ).rejects.toThrow("Unauthorized");

  // 5. deleteThreadDraftInternal authorized
  const tUser1 = t.withIdentity({ subject: userId });
  await tUser1.mutation(internal.mutations.threadsMutations.deleteThreadDraftInternal, { id: draftId });

  const deletedDraft = await t.query(async (ctx) => ctx.db.get("threadDrafts", draftId));
  expect(deletedDraft).toBeNull();
});

test("tokensMutations - storeAuthToken, updateToken, deleteTokensByPlatform", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => ctx.db.insert("users", {}));

  // Store tokens
  const shortId = await t.mutation(internal.mutations.tokensMutations.storeAuthToken, {
    userId,
    platformUserId: "plat-1",
    platform: "threads",
    token: "short-token",
    type: "short lived",
    active: false,
    expiresIn: 3600,
  });
  expect(shortId).toBeDefined();

  const longId = await t.mutation(internal.mutations.tokensMutations.storeAuthToken, {
    userId,
    platformUserId: "plat-1",
    platform: "threads",
    token: "long-token-1",
    type: "long lived",
    active: true,
    expiresIn: 500000,
  });
  expect(longId).toBeDefined();

  // Update token (should delete old long-lived token and insert new)
  const newLongId = await t.mutation(internal.mutations.tokensMutations.updateToken, {
    oldTokenId: longId,
    userId,
    platformUserId: "plat-1",
    newToken: "long-token-2",
    expiresIn: 600000,
    platform: "threads",
    type: "long lived",
  });
  expect(newLongId).toBeDefined();

  const oldTokenDoc = await t.query(async (ctx) => ctx.db.get("accessTokens", longId));
  expect(oldTokenDoc).toBeNull();

  const newTokenDoc = await t.query(async (ctx) => ctx.db.get("accessTokens", newLongId));
  expect(newTokenDoc?.token).toBe("long-token-2");

  // Delete all tokens for platform
  await t.mutation(internal.mutations.tokensMutations.deleteTokensByPlatform, {
    platform: "threads",
    userId,
  });

  const remainingTokens = await t.query(async (ctx) => ctx.db.query("accessTokens").collect());
  expect(remainingTokens.length).toBe(0);
});
