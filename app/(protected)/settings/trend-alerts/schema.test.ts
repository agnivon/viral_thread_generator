import { describe, it, expect } from "vitest";
import {
  isSettingsFormChanged,
  DEFAULT_TREND_ALERTS_VALUES,
  trendAlertsSchema,
  type TrendAlertsFormData,
} from "./schema";

describe("trendAlertsSchema validation", () => {
  it("validates valid trend filter settings", () => {
    const validData: TrendAlertsFormData = {
      enabled: true,
      minGrowthRate: 200,
      selectedNiches: ["tech_ai", "gaming"],
      whitelistKeywords: ["deepseek", "nvidia"],
      blacklistKeywords: ["lottery"],
    };
    const result = trendAlertsSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects negative minGrowthRate", () => {
    const invalidData = {
      enabled: true,
      minGrowthRate: -50,
      selectedNiches: [],
      whitelistKeywords: [],
      blacklistKeywords: [],
    };
    const result = trendAlertsSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("contains complete default values matching form schema", () => {
    const result = trendAlertsSchema.safeParse(DEFAULT_TREND_ALERTS_VALUES);
    expect(result.success).toBe(true);
    expect(DEFAULT_TREND_ALERTS_VALUES.enabled).toBe(false);
    expect(DEFAULT_TREND_ALERTS_VALUES.minGrowthRate).toBe(150);
  });
});

describe("isSettingsFormChanged", () => {
  it("returns false when form is clean and no pending tags exist", () => {
    expect(isSettingsFormChanged(false, "", "")).toBe(false);
    expect(isSettingsFormChanged(false, "   ", "   ")).toBe(false);
  });

  it("returns true when react-hook-form isDirty is true", () => {
    expect(isSettingsFormChanged(true, "", "")).toBe(true);
    expect(isSettingsFormChanged(true, "tag", "")).toBe(true);
  });

  it("returns true when user has uncommitted draft tag text", () => {
    expect(isSettingsFormChanged(false, "anthropic", "")).toBe(true);
    expect(isSettingsFormChanged(false, "", "crypto")).toBe(true);
  });
});
