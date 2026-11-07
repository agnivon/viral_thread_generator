import { describe, it, expect, beforeEach, afterEach } from "vitest";
import sitemap from "./sitemap";

describe("app/sitemap", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://viralthreads.agnivon.dev";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns a valid MetadataRoute.Sitemap array", () => {
    const entries = sitemap();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThanOrEqual(2);

    const homeEntry = entries.find((e) => e.url === "https://viralthreads.agnivon.dev/");
    expect(homeEntry).toBeDefined();
    expect(homeEntry?.priority).toBe(1.0);
    expect(homeEntry?.changeFrequency).toBe("daily");
    expect(homeEntry?.lastModified).toBeInstanceOf(Date);

    const loginEntry = entries.find((e) => e.url === "https://viralthreads.agnivon.dev/login");
    expect(loginEntry).toBeDefined();
    expect(loginEntry?.priority).toBe(0.5);
    expect(loginEntry?.changeFrequency).toBe("monthly");
  });
});
