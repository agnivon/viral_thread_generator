/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi, afterEach, beforeEach } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { ThreadsAuthAPI } from "./lib/ThreadsAPI";
import http from "./http";
import { auth } from "./auth";

const modules = import.meta.glob("./**/*.ts");

// Store original env vars
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.THREADS_APP_ID = "mock-app-id";
  process.env.THREADS_APP_SECRET = "mock-app-secret";
  process.env.THREADS_REDIRECT_URI = "mock-redirect-uri";
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

test("threads token refresh flow - refreshes when near expiry", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  // 1. Initial query should return null when no tokens exist
  const initialToken = await t.query(internal.queries.tokensQueries.getLatestToken, {
    platform: "threads",
    type: "long lived",
    userId,
  });
  expect(initialToken).toBeNull();

  // 2. Insert an initial active Threads token (expiring in 1 hour, i.e., near expiry)
  const initialTokenId = await t.mutation(internal.mutations.tokensMutations.updateToken, {
    userId, platformUserId: "platform-12345",
    newToken: "initial-long-lived-token",
    expiresIn: 3600, // 1 hour (less than 24 hours, should refresh)
    platform: "threads",
    type: "long lived",
  });

  // Verify the token is set up correctly in the database
  const activeToken = await t.query(internal.queries.tokensQueries.getLatestToken, {
    platform: "threads",
    type: "long lived",
    userId,
  });
  expect(activeToken).not.toBeNull();
  expect(activeToken?.token).toBe("initial-long-lived-token");
  expect(activeToken?.platform).toBe("threads");
  expect(activeToken?.type).toBe("long lived");
  expect(activeToken?.active).toBe(true);

  // 3. Mock the fetch request for refreshAccessToken
  const fetchMock = vi.fn().mockImplementation(async (url: string, _init?: RequestInit) => {
    expect(url).toContain("refresh_access_token");
    expect(url).toContain("access_token=initial-long-lived-token");
    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "refreshed-long-lived-token",
        token_type: "Bearer",
        expires_in: 5184000, // 60 days
      }),
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);

  // 4. Run the refresh action
  const result = await t.action(internal.actions.tokensActions.refreshThreadsToken, { userId });
  expect(result.expiresIn).toBe(5184000);
  expect(result.tokenId).toBeDefined();
  expect(result.refreshed).toBe(true);

  // 5. Verify the database state after refresh:
  // - The old token should be deleted
  // - The new token should be active and have the refreshed value
  const allTokens = await t.query(async (ctx) => {
    return await ctx.db.query("accessTokens").collect();
  });
  
  expect(allTokens.length).toBe(1);
  expect(allTokens[0]._id).toBe(result.tokenId);
  expect(allTokens[0].token).toBe("refreshed-long-lived-token");
  expect(allTokens[0].active).toBe(true);

  // Verify that the initial token ID no longer exists
  const oldTokenCheck = await t.query(async (ctx) => {
    return await ctx.db.get("accessTokens", initialTokenId);
  });
  expect(oldTokenCheck).toBeNull();
});

test("threads token refresh flow - skipped when not near expiry", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  // 1. Insert an active Threads token far in the future (expires in 10 days)
  const initialTokenId = await t.mutation(internal.mutations.tokensMutations.updateToken, {
    userId, platformUserId: "platform-12345",
    newToken: "fresh-long-lived-token",
    expiresIn: 10 * 24 * 60 * 60, // 10 days (greater than 24 hours, should NOT refresh)
    platform: "threads",
    type: "long lived",
  });

  // 2. Mock fetch to throw if called (since refresh should be skipped)
  const fetchMock = vi.fn().mockImplementation(async () => {
    throw new Error("Fetch should not be called when token is not near expiry!");
  });
  vi.stubGlobal("fetch", fetchMock);

  // 3. Run the refresh action
  const result = await t.action(internal.actions.tokensActions.refreshThreadsToken, { userId });

  expect(result.refreshed).toBe(false);
  expect(result.tokenId).toBe(initialTokenId);

  // 4. Verify that the token remains unchanged in the database
  const activeToken = await t.query(internal.queries.tokensQueries.getLatestToken, {
    platform: "threads",
    type: "long lived",
    userId,
  });
  expect(activeToken?.token).toBe("fresh-long-lived-token");
});

test("ThreadsAuthAPI static methods", async () => {
  const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.includes("oauth/access_token") && init?.method === "POST") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "mock-short-lived-token",
          user_id: 12345,
        }),
      } as Response;
    }
    if (url.includes("access_token") && (!init?.method || init.method === "GET")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "mock-long-lived-token",
          token_type: "Bearer",
          expires_in: 5184000,
        }),
      } as Response;
    }
    return { ok: false } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);

  const shortLived = await ThreadsAuthAPI.getShortLivedToken(
    "mock-app-id",
    "mock-app-secret",
    "mock-redirect-uri",
    "mock-code"
  );
  expect(shortLived.access_token).toBe("mock-short-lived-token");
  expect(shortLived.user_id).toBe(12345);

  const longLived = await ThreadsAuthAPI.exchangeForLongLivedToken(
    "mock-app-secret",
    "mock-short-lived-token"
  );
  expect(longLived.access_token).toBe("mock-long-lived-token");
  expect(longLived.expires_in).toBe(5184000);
});

test("storeAuthToken and deleteTokensByPlatform mutations", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  // Add a pre-existing token
  await t.mutation(internal.mutations.tokensMutations.updateToken, {
    userId, platformUserId: "platform-12345",
    newToken: "pre-existing-token",
    expiresIn: 3600,
    platform: "threads",
    type: "long lived",
  });

  // Call the delete mutation
  await t.mutation(internal.mutations.tokensMutations.deleteTokensByPlatform, {
    platform: "threads",
    userId,
  });

  // Verify deletion worked
  const emptyTokens = await t.query(async (ctx) => {
    return await ctx.db.query("accessTokens").collect();
  });
  expect(emptyTokens.length).toBe(0);

  // Call the store mutation singularly for short-lived token
  const shortLivedId = await t.mutation(internal.mutations.tokensMutations.storeAuthToken, {
    userId, platformUserId: "platform-12345",
    platform: "threads",
    token: "new-short-lived",
    type: "short lived",
    active: false,
    expiresIn: 3600,
  });

  // Call the store mutation singularly for long-lived token
  const longLivedId = await t.mutation(internal.mutations.tokensMutations.storeAuthToken, {
    userId, platformUserId: "platform-12345",
    platform: "threads",
    token: "new-long-lived",
    type: "long lived",
    active: true,
    expiresIn: 5184000,
  });

  // Verify result IDs are returned
  expect(shortLivedId).toBeDefined();
  expect(longLivedId).toBeDefined();

  // Retrieve all tokens
  const allTokens = await t.query(async (ctx) => {
    return await ctx.db.query("accessTokens").collect();
  });

  expect(allTokens.length).toBe(2);

  const shortLivedToken = allTokens.find(t => t.type === "short lived");
  const longLivedToken = allTokens.find(t => t.type === "long lived");

  expect(shortLivedToken).toBeDefined();
  expect(shortLivedToken?.token).toBe("new-short-lived");
  expect(shortLivedToken?.active).toBe(false);

  expect(longLivedToken).toBeDefined();
  expect(longLivedToken?.token).toBe("new-long-lived");
  expect(longLivedToken?.active).toBe(true);
});

test("http action /auth callback", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(async (ctx) => {
    return await ctx.db.insert("users", {});
  });

  vi.spyOn(auth, "getUserId").mockResolvedValue(userId);

  // Mock global fetch for OAuth exchange requests
  const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.includes("oauth/access_token") && init?.method === "POST") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "mock-short-lived-token",
          user_id: 12345,
        }),
      } as Response;
    }
    if (url.includes("access_token") && (!init?.method || init.method === "GET")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "mock-long-lived-token",
          token_type: "Bearer",
          expires_in: 5184000,
        }),
      } as Response;
    }
    return { ok: false } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);

  // Lookup the http handler from router
  const route = http.lookup("/auth", "GET");
  expect(route).not.toBeNull();

  // Mock Action Context mapping actions to convex-test operations
  const mockCtx = {
    runQuery: (ref: any, args: any) => t.query(ref, args),
    runMutation: (ref: any, args: any) => t.mutation(ref, args),
    runAction: (ref: any, args: any) => t.action(ref, args),
  } as any;

  // 1. Check response when code is missing (should fail with 400)
  const reqNoCode = new Request("https://intent-cuttlefish-35.convex.site/auth");
  const resNoCode = await (route![0] as any)._handler(mockCtx, reqNoCode);
  expect(resNoCode.status).toBe(400);
  const htmlNoCode = await resNoCode.text();
  expect(htmlNoCode).toContain("Authorization Failed");

  // 2. Check response when code is provided (should succeed with 200 after stripping #_)
  const reqWithCode = new Request("https://intent-cuttlefish-35.convex.site/auth?code=mock-auth-code%23_");
  const resWithCode = await (route![0] as any)._handler(mockCtx, reqWithCode);
  expect(resWithCode.status).toBe(200);
  const htmlWithCode = await resWithCode.text();
  expect(htmlWithCode).toContain("Authorization Successful");

  // 3. Verify database state
  const activeToken = await t.query(internal.queries.tokensQueries.getLatestToken, {
    platform: "threads",
    type: "long lived",
    userId,
  });
  expect(activeToken).not.toBeNull();
  expect(activeToken?.token).toBe("mock-long-lived-token");
  expect(activeToken?.platform).toBe("threads");
  expect(activeToken?.type).toBe("long lived");
  expect(activeToken?.active).toBe(true);
});
