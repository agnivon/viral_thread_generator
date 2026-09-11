import { describe, it, expect } from "vitest";
import { isDev, useDev, isProduction, isTrendCronEnabled } from "./env";

describe("env utilities", () => {
  it("correctly identifies dev environment by CONVEX_DEPLOYMENT", () => {
    expect(isDev({ CONVEX_DEPLOYMENT: "dev:my-project-123", NODE_ENV: "production" })).toBe(true);
    expect(useDev({ CONVEX_DEPLOYMENT: "dev:my-project-123", NODE_ENV: "production" })).toBe(true);
  });

  it("correctly identifies dev environment by localhost SITE_URL", () => {
    expect(
      isDev({
        CONVEX_DEPLOYMENT: "prod:my-project-123",
        SITE_URL: "http://localhost:3000",
        NODE_ENV: "production",
      })
    ).toBe(true);
  });

  it("correctly identifies dev environment by non-production NODE_ENV", () => {
    expect(isDev({ NODE_ENV: "development" })).toBe(true);
    expect(isDev({ NODE_ENV: "test" })).toBe(true);
  });

  it("correctly identifies dev environment by explicit flags", () => {
    expect(isDev({ CONVEX_ENV: "dev" })).toBe(true);
    expect(isDev({ IS_DEV: "true" })).toBe(true);
  });

  it("correctly identifies production environment with prod flags", () => {
    const prodEnv = {
      CONVEX_DEPLOYMENT: "prod:my-deployment-99",
      NODE_ENV: "production",
      SITE_URL: "https://my-deployment.convex.site",
    };
    expect(isDev(prodEnv)).toBe(false);
    expect(useDev(prodEnv)).toBe(false);
    expect(isProduction(prodEnv)).toBe(true);
  });

  it("correctly identifies Convex Cloud production environment without NODE_ENV or CONVEX_DEPLOYMENT", () => {
    const convexCloudProdEnv = {
      THREADS_REDIRECT_URI: "https://mock-production.convex.site/auth",
      CLOUDFLARE_TURNSTILE_SECRET: "mock_turnstile_secret_key_for_testing",
    };
    expect(isDev(convexCloudProdEnv)).toBe(false);
    expect(isProduction(convexCloudProdEnv)).toBe(true);
    expect(isTrendCronEnabled(convexCloudProdEnv)).toBe(true);
  });

  it("defaults bare environment without dev indicators to production", () => {
    expect(isDev({})).toBe(false);
    expect(isProduction({})).toBe(true);
    expect(isTrendCronEnabled({})).toBe(true);
  });

  describe("isTrendCronEnabled", () => {
    it("is disabled in dev environments by default", () => {
      expect(isTrendCronEnabled({ CONVEX_DEPLOYMENT: "dev:local", NODE_ENV: "production" })).toBe(false);
    });

    it("can be force-enabled in dev with ENABLE_DEV_TREND_CRON", () => {
      expect(
        isTrendCronEnabled({
          CONVEX_DEPLOYMENT: "dev:local",
          ENABLE_DEV_TREND_CRON: "true",
        })
      ).toBe(true);
    });

    it("is enabled in production by default", () => {
      expect(
        isTrendCronEnabled({
          CONVEX_DEPLOYMENT: "prod:live-123",
          NODE_ENV: "production",
          SITE_URL: "https://my-deployment.convex.site",
        })
      ).toBe(true);
    });

    it("can be explicitly disabled in production with DISABLE_TREND_CRON", () => {
      expect(
        isTrendCronEnabled({
          CONVEX_DEPLOYMENT: "prod:live-123",
          NODE_ENV: "production",
          DISABLE_TREND_CRON: "true",
        })
      ).toBe(false);
    });
  });
});
