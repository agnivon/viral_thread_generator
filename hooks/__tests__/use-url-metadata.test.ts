/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { extractFallbackTitle, isAccessDeniedOrGenericTitle, useUrlMetadata } from "../use-url-metadata";

describe("useUrlMetadata and extractFallbackTitle", () => {
  test("extractFallbackTitle formats slug paths into readable title and extracts hostname", () => {
    const res = extractFallbackTitle("https://techcrunch.com/2026/09/apple-announces-new-ai-features.html");
    expect(res.title).toBe("Apple Announces New Ai Features");
    expect(res.hostname).toBe("techcrunch.com");
  });

  test("extractFallbackTitle derives clean title from Reuters URLs by stripping trailing dates", () => {
    const res = extractFallbackTitle("https://www.reuters.com/world/china/china-presses-iran-help-rein-in-houthi-red-sea-attacks-sources-say-2024-01-26/");
    expect(res.title).toBe("China Presses Iran Help Rein In Houthi Red Sea Attacks Sources Say");
    expect(res.hostname).toBe("reuters.com");
  });

  test("extractFallbackTitle derives clean title from Reuters URLs by stripping article IDs", () => {
    const res = extractFallbackTitle("https://www.reuters.com/article/us-tech-chips-idUSKBN12345/");
    expect(res.title).toBe("Us Tech Chips");
    expect(res.hostname).toBe("reuters.com");
  });

  test("extractFallbackTitle derives title for access-denied URLs such as KTLA", () => {
    const res = extractFallbackTitle("https://ktla.com/weather/a-hurricane-could-form-near-southern-california/");
    expect(res.title).toBe("A Hurricane Could Form Near Southern California");
    expect(res.hostname).toBe("ktla.com");
  });

  test("isAccessDeniedOrGenericTitle detects block and challenge pages", () => {
    expect(isAccessDeniedOrGenericTitle("Access to this page has been denied", "https://ktla.com/weather/a-hurricane")).toBe(true);
    expect(isAccessDeniedOrGenericTitle("403 Forbidden", "https://example.com/article")).toBe(true);
    expect(isAccessDeniedOrGenericTitle("Just a moment...", "https://example.com/article")).toBe(true);
    expect(isAccessDeniedOrGenericTitle("Attention Required! | Cloudflare", "https://example.com/article")).toBe(true);
    expect(isAccessDeniedOrGenericTitle("reuters.com", "https://www.reuters.com/world/china/test-slug")).toBe(true);
    expect(isAccessDeniedOrGenericTitle("reuters", "https://www.reuters.com/world/china/test-slug")).toBe(true);
    expect(isAccessDeniedOrGenericTitle("China Presses Iran Help Rein In Attacks", "https://www.reuters.com/world/china/test-slug")).toBe(false);
  });

  test("extractFallbackTitle falls back to domain name when path is empty", () => {
    const res = extractFallbackTitle("https://github.com");
    expect(res.title).toBe("Github");
    expect(res.hostname).toBe("github.com");
  });

  test("extractFallbackTitle handles dashes and underscores correctly", () => {
    const res = extractFallbackTitle("https://news.ycombinator.com/item_id_discussion_post");
    expect(res.title).toBe("Item Id Discussion Post");
    expect(res.hostname).toBe("news.ycombinator.com");
  });

  test("extractFallbackTitle handles invalid URLs gracefully", () => {
    const res = extractFallbackTitle("not-a-valid-url");
    expect(res.title).toBe("Not-a-valid-url");
  });

  test("extractFallbackTitle handles empty or null input", () => {
    const res = extractFallbackTitle("");
    expect(res.title).toBe("Unknown Source");
  });

  test("useUrlMetadata hook function is defined", () => {
    expect(typeof useUrlMetadata).toBe("function");
  });
});
