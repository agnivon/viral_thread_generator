export interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
  image?: string;
  category?: string[];
  published: string;
  published_at?: number;
  mediaCompany?: string;
}

export interface KeywordItem {
  id: string;
  keyword: string;
  traffic?: number;
  trafficGrowthRate?: number;
  rank?: number;
  isActive?: boolean;
  startedAtMs?: number;
  relatedKeywords?: string[];
  articleKeys?: [number, string, string][];
}

// --- Google Trends Formatter Utilities ---

export function formatSearchVolume(traffic?: number): string {
  if (!traffic || traffic <= 0) return "<10K";
  if (traffic >= 1_000_000) {
    const millions = traffic / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M+`;
  }
  if (traffic >= 1000) {
    const thousands = traffic / 1000;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(0)}K+`;
  }
  return `${traffic}+`;
}

export function formatGrowthRate(rate?: number): { text: string; isBreakout: boolean } {
  if (!rate || rate <= 0) return { text: "Spike", isBreakout: false };
  if (rate >= 1000) return { text: "+1,000%", isBreakout: true };
  return { text: `+${rate.toLocaleString()}%`, isBreakout: false };
}

export function formatStartedAgo(startedAtMs?: number): string {
  if (!startedAtMs || startedAtMs <= 0) return "Recently started";
  const now = Date.now();
  const diffMs = Math.max(0, now - startedAtMs);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? "Started just now" : `Started ${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? "Started 1 hour ago" : `Started ${diffHours} hours ago`;
  }
  return diffDays === 1 ? "Started 1 day ago" : `Started ${diffDays} days ago`;
}
