/// <reference types="vite/client" />
"use node";
import { convexTest } from "convex-test";
import { expect, test, vi, afterEach } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

afterEach(() => {
  vi.restoreAllMocks();
});

test("saveSubscription inserts a new subscription and updates on duplicate endpoint", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const asUser = t.withIdentity({ subject: userId });

  // 1. Insert new subscription
  const res1 = await asUser.mutation(api.pushSubscriptions.saveSubscription, {
    endpoint: "https://fcm.googleapis.com/fcm/send/device1",
    keys: {
      p256dh: "key_p256dh_1",
      auth: "auth_token_1",
    },
    userAgent: "Mozilla/5.0 (Android WebAPK)",
  });

  expect(res1.success).toBe(true);
  expect(res1.id).toBeDefined();

  // Verify in database
  const subs = await t.query(internal.pushSubscriptions.listByUserInternal, {
    userId,
  });
  expect(subs).toHaveLength(1);
  expect(subs[0].endpoint).toBe("https://fcm.googleapis.com/fcm/send/device1");
  expect(subs[0].keys.p256dh).toBe("key_p256dh_1");
  expect(subs[0].userAgent).toBe("Mozilla/5.0 (Android WebAPK)");

  // 2. Update existing subscription with modified keys
  const res2 = await asUser.mutation(api.pushSubscriptions.saveSubscription, {
    endpoint: "https://fcm.googleapis.com/fcm/send/device1",
    keys: {
      p256dh: "key_p256dh_updated",
      auth: "auth_token_updated",
    },
    userAgent: "Mozilla/5.0 (Android WebAPK Updated)",
  });

  expect(res2.success).toBe(true);
  expect(res2.id).toBe(res1.id);

  const updatedSubs = await t.query(
    internal.pushSubscriptions.listByUserInternal,
    { userId }
  );
  expect(updatedSubs).toHaveLength(1);
  expect(updatedSubs[0].keys.p256dh).toBe("key_p256dh_updated");

  // 3. Re-save identical subscription: succeeds idempotently without error
  const res3 = await asUser.mutation(api.pushSubscriptions.saveSubscription, {
    endpoint: "https://fcm.googleapis.com/fcm/send/device1",
    keys: {
      p256dh: "key_p256dh_updated",
      auth: "auth_token_updated",
    },
    userAgent: "Mozilla/5.0 (Android WebAPK Updated)",
  });
  expect(res3.success).toBe(true);
  expect(res3.id).toBe(res1.id);
});

test("removeSubscription deletes the user's subscription and respects ownership", async () => {
  const t = convexTest(schema, modules);
  const user1 = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });
  const user2 = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  const asUser1 = t.withIdentity({ subject: user1 });
  const asUser2 = t.withIdentity({ subject: user2 });

  await asUser1.mutation(api.pushSubscriptions.saveSubscription, {
    endpoint: "https://fcm.googleapis.com/fcm/send/user1_phone",
    keys: { p256dh: "p1", auth: "a1" },
  });

  // User 2 should NOT be able to delete User 1's subscription
  const deleteByOther = await asUser2.mutation(
    api.pushSubscriptions.removeSubscription,
    {
      endpoint: "https://fcm.googleapis.com/fcm/send/user1_phone",
    }
  );
  expect(deleteByOther.success).toBe(false);

  // User 1 should be able to delete their own subscription
  const deleteByOwner = await asUser1.mutation(
    api.pushSubscriptions.removeSubscription,
    {
      endpoint: "https://fcm.googleapis.com/fcm/send/user1_phone",
    }
  );
  expect(deleteByOwner.success).toBe(true);

  const remaining = await t.query(internal.pushSubscriptions.listByUserInternal, {
    userId: user1,
  });
  expect(remaining).toHaveLength(0);
});

test("removeDeadSubscriptionInternal removes expired subscription by endpoint", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  await t.mutation(async (ctx) => {
    await ctx.db.insert("pushSubscriptions", {
      userId,
      endpoint: "https://fcm.googleapis.com/fcm/send/dead_endpoint",
      keys: { p256dh: "key", auth: "auth" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const res = await t.mutation(
    internal.pushSubscriptions.removeDeadSubscriptionInternal,
    {
      endpoint: "https://fcm.googleapis.com/fcm/send/dead_endpoint",
    }
  );
  expect(res.removed).toBe(true);

  const subs = await t.query(internal.pushSubscriptions.listByUserInternal, {
    userId,
  });
  expect(subs).toHaveLength(0);
});
