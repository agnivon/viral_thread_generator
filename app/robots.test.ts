import { describe, it, expect, beforeEach, afterEach } from "vitest";
import robots from "./robots";

describe("app/robots", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://viralthreads.agnivon.dev";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns valid MetadataRoute.Robots configuration", () => {
    const config = robots();

    expect(config.sitemap).toBe("https://viralthreads.agnivon.dev/sitemap.xml");
    expect(config.host).toBe("https://viralthreads.agnivon.dev");

    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
    const wildcardRule = rules.find((r) => r.userAgent === "*");

    expect(wildcardRule).toBeDefined();

    const allowed = Array.isArray(wildcardRule?.allow) ? wildcardRule.allow : [wildcardRule?.allow];
    expect(allowed).toContain("/");
    expect(allowed).toContain("/login");
    expect(allowed).toContain("/icon.svg");

    const disallowed = Array.isArray(wildcardRule?.disallow) ? wildcardRule.disallow : [wildcardRule?.disallow];
    expect(disallowed).toContain("/dashboard");
    expect(disallowed).toContain("/threads");
    expect(disallowed).toContain("/settings");
    expect(disallowed).toContain("/api/*");
  });
});
