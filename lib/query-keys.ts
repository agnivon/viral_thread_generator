/**
 * Centralized, type-safe query key factories for TanStack Query (React Query v5).
 * Follows Rule 8: Structured query key objects with explicit tuples (`as const`).
 */

export const sourcesQueryKeys = {
  all: ["news"] as const,
  keywords: (sourceId: string) => ["keywords", sourceId] as const,
  bySourceKeyword: (sourceId: string, keyword: string, hasArticleKeys?: boolean) =>
    ["news", sourceId, keyword, { hasArticleKeys: Boolean(hasArticleKeys) }] as const,
};

export const trendAlertsQueryKeys = {
  all: ["trendAlerts"] as const,
  settings: () => ["trendAlerts", "settings"] as const,
  liveTrends: (geo: string = "US") => ["keywords", "googleTrends", { geo }] as const,
  preview: (filters: {
    minGrowthRate: number;
    selectedNiches: string[];
    whitelistKeywords: string[];
    blacklistKeywords: string[];
  }) => ["trendAlerts", "preview", filters] as const,
};

export const linkPreviewKeys = {
  all: ["urlMetadata"] as const,
  byUrl: (url: string) => ["urlMetadata", url] as const,
};

export const threadDraftsQueryKeys = {
  all: ["threadDrafts"] as const,
  detail: (id: string) => ["threadDrafts", id] as const,
};
