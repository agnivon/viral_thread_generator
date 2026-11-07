import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSiteUrl,
  PRODUCTION_DOMAIN,
  PRODUCTION_URL,
  SITE_NAME,
  AUTHOR_NAME,
  AUTHOR_SITE,
} from "./site";

describe("lib/site", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("exports valid production domain, URL, and author constants", () => {
    expect(PRODUCTION_DOMAIN).toBe("viralthreads.agnivon.dev");
    expect(PRODUCTION_URL).toBe("https://viralthreads.agnivon.dev");
    expect(SITE_NAME).toBe("Viral Thread Generator");
    expect(AUTHOR_NAME).toBe("Agnivo Neogi");
    expect(AUTHOR_SITE).toBe("https://agnivon.dev");
  });

  it("defaults to PRODUCTION_URL when no environment variables are set", () => {
    expect(getSiteUrl()).toBe("https://viralthreads.agnivon.dev");
  });

  it("prefers NEXT_PUBLIC_APP_URL when set, stripping trailing slashes", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://custom-domain.com/";
    expect(getSiteUrl()).toBe("https://custom-domain.com");
  });

  it("uses VERCEL_PROJECT_PRODUCTION_URL when NEXT_PUBLIC_APP_URL is not set", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "viralthreads.agnivon.dev";
    expect(getSiteUrl()).toBe("https://viralthreads.agnivon.dev");
  });

  it("falls back to VERCEL_URL preview when production url is not set", () => {
    process.env.VERCEL_URL = "preview-deploy-123.vercel.app";
    expect(getSiteUrl()).toBe("https://preview-deploy-123.vercel.app");
  });
});
