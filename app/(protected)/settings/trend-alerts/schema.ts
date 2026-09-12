import { z } from "zod";

export const trendAlertsSchema = z.object({
  enabled: z.boolean(),
  minGrowthRate: z.number().min(0),
  selectedNiches: z.array(z.string()),
  whitelistKeywords: z.array(z.string()),
  blacklistKeywords: z.array(z.string()),
});

export type TrendAlertsFormData = z.infer<typeof trendAlertsSchema>;

export const DEFAULT_TREND_ALERTS_VALUES: TrendAlertsFormData = {
  enabled: false,
  minGrowthRate: 150,
  selectedNiches: [],
  whitelistKeywords: [],
  blacklistKeywords: [],
};

/**
 * Checks if the settings form has active modifications:
 * either react-hook-form isDirty (field values differ from baseline)
 * or user has uncommitted draft text in the tag inputs.
 */
export function isSettingsFormChanged(
  isDirty: boolean,
  pendingWhitelistTag: string = "",
  pendingBlacklistTag: string = ""
): boolean {
  return isDirty || pendingWhitelistTag.trim().length > 0 || pendingBlacklistTag.trim().length > 0;
}
