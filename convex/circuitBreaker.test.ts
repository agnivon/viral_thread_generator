/// <reference types="vite/client" />
"use node";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { ModelCircuitBreaker } from "./lib/agents/circuitBreaker.js";

const modules = import.meta.glob("./**/*.ts");

test("circuitBreaker - recordTrip creates and updates active trips", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  // 1. Record a key trip
  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "key",
    target: "google:key1",
    trippedUntil: now + 60_000,
    reason: "429 Rate Limit",
    category: "RATE_LIMIT_429",
  });

  let active = await t.query(internal.circuitBreaker.getActiveTrips, {});
  expect(active.length).toBe(1);
  expect(active[0].target).toBe("google:key1");
  expect(active[0].type).toBe("key");
  expect(active[0].reason).toBe("429 Rate Limit");

  // 2. Update existing trip with higher trippedUntil
  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "key",
    target: "google:key1",
    trippedUntil: now + 120_000,
    reason: "429 Rate Limit Extended",
    category: "RATE_LIMIT_429",
  });

  active = await t.query(internal.circuitBreaker.getActiveTrips, {});
  expect(active.length).toBe(1);
  expect(active[0].trippedUntil).toBe(now + 120_000);
  expect(active[0].reason).toBe("429 Rate Limit Extended");

  // 3. Record a model trip
  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "model",
    target: "gemini-3.8-flash",
    trippedUntil: now + 600_000,
    reason: "500 Server Error",
    category: "SERVER_ERROR_500_502",
  });

  active = await t.query(internal.circuitBreaker.getActiveTrips, {});
  expect(active.length).toBe(2);
});

test("circuitBreaker - getActiveTrips filters out expired trips", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  // Insert expired trip
  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "key",
    target: "expired-key",
    trippedUntil: now - 1000, // already expired
    reason: "Old 429",
    category: "RATE_LIMIT_429",
  });

  // Insert active trip
  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "key",
    target: "active-key",
    trippedUntil: now + 50_000,
    reason: "Active 429",
    category: "RATE_LIMIT_429",
  });

  const active = await t.query(internal.circuitBreaker.getActiveTrips, {});
  expect(active.length).toBe(1);
  expect(active[0].target).toBe("active-key");
});

test("circuitBreaker - clearTrip removes active trip", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "key",
    target: "key-to-clear",
    trippedUntil: now + 60_000,
    reason: "429 Rate Limit",
    category: "RATE_LIMIT_429",
  });

  let active = await t.query(internal.circuitBreaker.getActiveTrips, {});
  expect(active.length).toBe(1);

  await t.mutation(internal.circuitBreaker.clearTrip, {
    type: "key",
    target: "key-to-clear",
  });

  active = await t.query(internal.circuitBreaker.getActiveTrips, {});
  expect(active.length).toBe(0);
});

test("circuitBreaker - cleanupExpiredTrips deletes expired trips but preserves active ones", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  // Expired trip 1
  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "key",
    target: "expired-key-1",
    trippedUntil: now - 5000,
    reason: "Expired",
    category: "RATE_LIMIT_429",
  });

  // Expired trip 2
  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "model",
    target: "expired-model-2",
    trippedUntil: now - 1000,
    reason: "Expired",
    category: "SERVER_ERROR_500_502",
  });

  // Active trip
  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "model",
    target: "active-model-1",
    trippedUntil: now + 600_000,
    reason: "Active",
    category: "SERVER_ERROR_500_502",
  });

  const deletedCount = await t.mutation(internal.circuitBreaker.cleanupExpiredTrips, {});
  expect(deletedCount).toBe(2);

  const active = await t.query(internal.circuitBreaker.getActiveTrips, {});
  expect(active.length).toBe(1);
  expect(active[0].target).toBe("active-model-1");
});

test("circuitBreaker - syncFromDatabase integrates with ModelCircuitBreaker class", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "key",
    target: "google:key1",
    trippedUntil: now + 3600_000,
    reason: "429 Rate Limit",
    category: "RATE_LIMIT_429",
  });

  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "model",
    target: "gemini-3.8-flash",
    trippedUntil: now + 600_000,
    reason: "500 Server Error",
    category: "SERVER_ERROR_500_502",
  });

  const active = await t.query(internal.circuitBreaker.getActiveTrips, {});

  const cb = new ModelCircuitBreaker();
  cb.syncFromDatabase(active, now);

  const check1 = cb.isAvailable(
    { provider: "google", keyGroup: "google:key1", modelId: "gemini-3.7-flash" },
    now
  );
  expect(check1.available).toBe(false);
  expect(check1.reason).toContain('Key "google:key1" tripped');

  const check2 = cb.isAvailable(
    { provider: "google", keyGroup: "google:key2", modelId: "gemini-3.8-flash" },
    now
  );
  expect(check2.available).toBe(false);
  expect(check2.reason).toContain('Model "gemini-3.8-flash" tripped');

  const check3 = cb.isAvailable(
    { provider: "google", keyGroup: "google:key2", modelId: "gemini-3.7-flash" },
    now
  );
  expect(check3.available).toBe(true);
});

test("circuitBreaker - recordTrip does not downgrade an active longer cooldown", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  // 1. 12-hour ban
  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "key",
    target: "google:key1",
    trippedUntil: now + 12 * 3600_000,
    reason: "429 Rate Limit",
    category: "RATE_LIMIT_429",
  });

  // 2. Subsequent 1-hour ban attempt on same key
  await t.mutation(internal.circuitBreaker.recordTrip, {
    type: "key",
    target: "google:key1",
    trippedUntil: now + 3600_000,
    reason: "503 Service Unavailable",
    category: "SERVICE_UNAVAILABLE_503",
  });

  const active = await t.query(internal.circuitBreaker.getActiveTrips, {});
  expect(active.length).toBe(1);
  // Must still be 12 hours, NOT downgraded to 1 hour
  expect(active[0].trippedUntil).toBe(now + 12 * 3600_000);
  expect(active[0].category).toBe("RATE_LIMIT_429");
});

test("circuitBreaker - clearTrip deletes all matching records if duplicates exist", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  // Insert two records directly into circuitBreaker
  await t.mutation(async (ctx) => {
    await ctx.db.insert("circuitBreaker", {
      type: "key",
      target: "dup-key",
      trippedUntil: now + 60_000,
      reason: "Trip 1",
      category: "RATE_LIMIT_429",
      updatedAt: now,
    });
    await ctx.db.insert("circuitBreaker", {
      type: "key",
      target: "dup-key",
      trippedUntil: now + 120_000,
      reason: "Trip 2",
      category: "RATE_LIMIT_429",
      updatedAt: now,
    });
  });

  let active = await t.query(internal.circuitBreaker.getActiveTrips, {});
  expect(active.filter((a) => a.target === "dup-key").length).toBe(2);

  await t.mutation(internal.circuitBreaker.clearTrip, {
    type: "key",
    target: "dup-key",
  });

  active = await t.query(internal.circuitBreaker.getActiveTrips, {});
  expect(active.filter((a) => a.target === "dup-key").length).toBe(0);
});
