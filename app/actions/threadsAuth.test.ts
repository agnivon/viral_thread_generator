import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initiateThreadsAuth } from "./threadsAuth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@convex-dev/auth/nextjs/server", () => ({
  convexAuthNextjsToken: vi.fn(),
}));

describe("threadsAuth server action", () => {
  const originalEnv = { ...process.env };
  const mockCookieStore = {
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.THREADS_APP_ID = "test-app-id";
    process.env.THREADS_REDIRECT_URI = "https://example.convex.site/auth";
    process.env.THREADS_APP_SECRET = "test-app-secret-key-123456";
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws error when required environment variables are missing", async () => {
    delete process.env.THREADS_APP_ID;
    await expect(initiateThreadsAuth()).rejects.toThrow(
      "Missing Threads App configuration in environment variables"
    );
  });

  it("throws error when user is not authenticated", async () => {
    vi.mocked(convexAuthNextjsToken).mockResolvedValue(null);
    await expect(initiateThreadsAuth()).rejects.toThrow(
      "Unauthorized: You must be signed in to link your Threads account"
    );
  });

  it("throws error when session token is malformed", async () => {
    vi.mocked(convexAuthNextjsToken).mockResolvedValue("invalid.token");
    await expect(initiateThreadsAuth()).rejects.toThrow(
      "Unauthorized: Invalid session token"
    );
  });

  it("successfully signs state, sets cookie, and redirects with valid token", async () => {
    // Construct a mock JWT with sub claim
    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: "user_test_123|session_456" })).toString("base64url");
    const fakeToken = `${header}.${payload}.signature`;

    vi.mocked(convexAuthNextjsToken).mockResolvedValue(fakeToken);

    await initiateThreadsAuth();

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "threads_oauth_state",
      expect.stringMatching(/^user_test_123:\d+:[a-f0-9]{64}$/),
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        maxAge: 3600,
      })
    );

    expect(redirect).toHaveBeenCalledTimes(1);
    const redirectUrl = vi.mocked(redirect).mock.calls[0][0];
    const parsedUrl = new URL(redirectUrl);

    expect(parsedUrl.origin).toBe("https://threads.net");
    expect(parsedUrl.pathname).toBe("/oauth/authorize");
    expect(parsedUrl.searchParams.get("client_id")).toBe("test-app-id");
    expect(parsedUrl.searchParams.get("redirect_uri")).toBe("https://example.convex.site/auth");
    expect(parsedUrl.searchParams.get("response_type")).toBe("code");
    expect(parsedUrl.searchParams.get("state")).toMatch(/^user_test_123:\d+:[a-f0-9]{64}$/);
    expect(parsedUrl.searchParams.get("scope")).toContain("threads_basic");
    expect(parsedUrl.searchParams.get("scope")).toContain("threads_content_publish");
  });
});
