/**
 * Centralized, type-safe query key factories for TanStack Query (React Query v5).
 * Follows Rule 8: Structured query key objects with explicit tuples (`as const`).
 */

export const trendsQueryKeys = {
  all: ["trends"] as const,
  keywords: (sourceId: string) => ["trends", "keywords", sourceId] as const,
  bySourceKeyword: (sourceId: string, keyword: string, hasArticleKeys?: boolean) =>
    ["trends", "news", sourceId, keyword, { hasArticleKeys: Boolean(hasArticleKeys) }] as const,
};

export const trendAlertsQueryKeys = {
  all: ["trendAlerts"] as const,
  settings: () => ["trendAlerts", "settings"] as const,
  liveTrends: (geo: string = "US") => ["trends", "keywords", "googleTrends", { geo }] as const,
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
