"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import {
  ChevronRight,
  Clock,
  Globe,
  Newspaper,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

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

export const sourcesQueryKeys = {
  all: ["news"] as const,
  bySourceKeyword: (sourceId: string, keyword: string) => ["news", sourceId, keyword] as const,
  keywords: (sourceId: string) => ["keywords", sourceId] as const,
};

// --- Google Trends Formatter Utilities ---

export function formatSearchVolume(traffic?: number): string {
  if (!traffic || traffic <= 0) return "<10K";
  if (traffic >= 1_000_000) {
    const millions = traffic / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M+`;
  }
  if (traffic >= 1_000) {
    return `${Math.round(traffic / 1_000)}K+`;
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

type SortMode = "relevance" | "traffic" | "growth" | "recent";

export default function SourcesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [keywordSearch, setKeywordSearch] = useState<string>("");
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  const getTrendingKeywordsAction = useAction(api.actions.googleTrendsNewsActions.getTrendingKeywords);

  const {
    data: googleKeywords = [],
    isLoading: isGoogleLoading,
    refetch: refetchKeywords,
    isFetching: isGoogleFetching,
  } = useQuery<KeywordItem[]>({
    queryKey: sourcesQueryKeys.keywords("googleTrends"),
    queryFn: async () => (await getTrendingKeywordsAction({})) as KeywordItem[],
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    try {
      await refetchKeywords();
      toast.success("Google Trends refreshed successfully!");
    } catch (err) {
      console.error("Error refreshing Google Trends:", err);
      toast.error("Failed to refresh Google Trends.");
    }
  };

  // Filter and sort keywords
  const filteredKeywords = useMemo(() => {
    let result = googleKeywords;
    if (keywordSearch.trim()) {
      const term = keywordSearch.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.keyword.toLowerCase().includes(term) ||
          item.relatedKeywords?.some((rq) => rq.toLowerCase().includes(term))
      );
    }
    return [...result].sort((a, b) => {
      if (sortMode === "relevance") {
        return (a.rank ?? 999) - (b.rank ?? 999);
      }
      if (sortMode === "traffic") {
        return (b.traffic ?? 0) - (a.traffic ?? 0);
      }
      if (sortMode === "growth") {
        return (b.trafficGrowthRate ?? 0) - (a.trafficGrowthRate ?? 0);
      }
      if (sortMode === "recent") {
        return (b.startedAtMs ?? 0) - (a.startedAtMs ?? 0);
      }
      return 0;
    });
  }, [googleKeywords, keywordSearch, sortMode]);

  // Reset page when search or sort changes
  useMemo(() => {
    setCurrentPage(1);
  }, [keywordSearch, sortMode]);

  // Pagination for page size 50
  const totalPages = Math.max(1, Math.ceil(filteredKeywords.length / pageSize));
  const paginatedKeywords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredKeywords.slice(start, start + pageSize);
  }, [filteredKeywords, currentPage, pageSize]);

  // Safe loading flag ensuring SSR output matches client initial hydration
  const isLoading = !mounted || isGoogleLoading;

  return (
    <div className="flex-1 w-full bg-gradient-to-b from-background via-background/95 to-background/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/30 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-4xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
                  Sources
                </span>
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span suppressHydrationWarning>{googleKeywords.length} Live Trends</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Real-time Google Trends search interest and verified news coverage synced on-demand.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={!mounted ? false : (isGoogleLoading || isGoogleFetching)}
              className="rounded-xl border-border/80 hover:bg-muted/50 cursor-pointer flex items-center gap-2 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${mounted && isGoogleFetching ? "animate-spin" : ""}`} />
              Refresh Feed
            </Button>
          </div>
        </div>

        {/* Filter and Sort Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/45 backdrop-blur-xs p-3.5 rounded-2xl border border-border/80 shadow-xs">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder="Search active trends or related queries..."
              value={keywordSearch}
              onChange={(e) => setKeywordSearch(e.target.value)}
              className="h-9 pl-9 text-xs sm:text-sm bg-background/60 border-border/60 focus-visible:ring-violet-500/30 rounded-xl"
            />
            {keywordSearch && (
              <button
                onClick={() => setKeywordSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Buttons */}
          <div className="flex items-center gap-1 text-xs font-medium bg-background/60 p-1 rounded-xl border border-border/50 self-start sm:self-auto">
            <span className="text-[11px] text-muted-foreground px-2 hidden md:inline font-semibold">Sort:</span>
            <button
              type="button"
              onClick={() => setSortMode("relevance")}
              className={`py-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer ${
                sortMode === "relevance"
                  ? "bg-violet-600 text-white font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              Relevance
            </button>
            <button
              type="button"
              onClick={() => setSortMode("traffic")}
              className={`py-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer ${
                sortMode === "traffic"
                  ? "bg-violet-600 text-white font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              Volume
            </button>
            <button
              type="button"
              onClick={() => setSortMode("growth")}
              className={`py-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer ${
                sortMode === "growth"
                  ? "bg-violet-600 text-white font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              Spike %
            </button>
            <button
              type="button"
              onClick={() => setSortMode("recent")}
              className={`py-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer ${
                sortMode === "recent"
                  ? "bg-violet-600 text-white font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              Recent
            </button>
          </div>
        </div>

        {/* Full-Width Keyword Cards List */}
        <div className="space-y-3.5 w-full">
          {isLoading ? (
            <div className="space-y-3.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-6 bg-card/45 border-border/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-12 rounded" />
                        <Skeleton className="h-6 w-48 rounded" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Skeleton className="h-10 w-24 rounded-xl" />
                      <Skeleton className="h-10 w-24 rounded-xl" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredKeywords.length === 0 ? (
            <Card className="p-16 text-center bg-card/45 border-border/80">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="p-4 bg-muted rounded-full text-muted-foreground/60">
                  <Globe className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No Trends Found</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {keywordSearch
                    ? "No trending topics matched your search filter."
                    : "No active Google Trends found right now. Try refreshing the feed."}
                </p>
                {keywordSearch && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setKeywordSearch("")}
                    className="rounded-xl mt-2 text-xs"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            paginatedKeywords.map((item, idx) => {
              const itemGrowth = formatGrowthRate(item.trafficGrowthRate);
              const displayRank = item.rank ?? ((currentPage - 1) * pageSize + idx + 1);
              const articleCount = item.articleKeys?.length || 0;

              return (
                <Link
                  key={item.id}
                  href={`/sources/${encodeURIComponent(item.id)}`}
                  className="block w-full group focus-visible:outline-none"
                >
                  <Card className="w-full relative overflow-hidden bg-card/45 backdrop-blur-xs border-border/80 hover:border-violet-500/40 hover:shadow-md transition-all duration-200 p-5 sm:p-6">
                    {/* Left Accent Bar on Hover */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-violet-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      {/* Left: Rank, Title, and Related Query Chips */}
                      <div className="space-y-2.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/25">
                            #{displayRank}
                          </span>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground capitalize group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {item.keyword}
                          </h2>
                        </div>

                        {/* Related Queries Chips */}
                        {item.relatedKeywords && item.relatedKeywords.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-muted-foreground font-medium mr-1">Trending queries:</span>
                            {item.relatedKeywords.slice(0, 4).map((query, qIdx) => (
                              <span
                                key={qIdx}
                                className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground border border-border/60"
                              >
                                {query}
                              </span>
                            ))}
                            {item.relatedKeywords.length > 4 && (
                              <span className="text-[10px] text-muted-foreground/70 font-medium">
                                +{item.relatedKeywords.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Metrics Badges & CTA */}
                      <div className="flex items-center justify-between lg:justify-end gap-3 sm:gap-4 shrink-0 flex-wrap pt-2 lg:pt-0 border-t border-border/30 lg:border-t-0">
                        {/* Search Volume */}
                        <div className="flex flex-col items-start lg:items-end">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                            Volume
                          </span>
                          <span className="text-base sm:text-lg font-black font-mono text-foreground">
                            {formatSearchVolume(item.traffic)}
                          </span>
                        </div>

                        {/* Volume Spike / Growth Rate */}
                        <div className="flex flex-col items-start lg:items-end">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                            Spike
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <TrendingUp className="w-3 h-3" />
                            {itemGrowth.text}
                          </span>
                        </div>

                        {/* Timeline */}
                        <div className="flex flex-col items-start lg:items-end hidden sm:flex">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                            Timeline
                          </span>
                          <span suppressHydrationWarning className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                            <Clock className="w-3 h-3 text-muted-foreground/60" />
                            {formatStartedAgo(item.startedAtMs)}
                          </span>
                        </div>

                        {/* Article Count */}
                        {articleCount > 0 && (
                          <div className="flex flex-col items-start lg:items-end hidden md:flex">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                              Coverage
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-medium">
                              <Newspaper className="w-3 h-3 text-violet-500" />
                              {articleCount} {articleCount === 1 ? "story" : "stories"}
                            </span>
                          </div>
                        )}

                        {/* CTA Arrow */}
                        <div className="inline-flex items-center gap-1 pl-2 text-xs font-semibold text-violet-600 dark:text-violet-400 group-hover:translate-x-1 transition-transform">
                          <span>View Details</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })
          )}
        </div>

        {/* Footer with Page Size 50 Pagination Controls */}
        {filteredKeywords.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/30 text-xs text-muted-foreground">
            <div>
              Showing {Math.min(filteredKeywords.length, (currentPage - 1) * pageSize + 1)}-
              {Math.min(filteredKeywords.length, currentPage * pageSize)} of {filteredKeywords.length} trends (page size 50)
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-xl text-xs h-8 px-3"
                >
                  Previous
                </Button>
                <span className="font-semibold text-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-xl text-xs h-8 px-3"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
