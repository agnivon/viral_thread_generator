"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Globe,
  Layers,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { sourcesQueryKeys } from "@/lib/query-keys";
import {
  Article,
  KeywordItem,
  formatSearchVolume,
  formatGrowthRate,
  formatStartedAgo,
} from "../page";

export default function KeywordDetailPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const params = useParams();
  const keywordSlug = (params?.keyword as string) || "";

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articleFilter, setArticleFilter] = useState<string>("");
  const [dateSortOrder, setDateSortOrder] = useState<"newest" | "oldest">("newest");
  const [activeQueryChip, setActiveQueryChip] = useState<string>("");
  const [showAllBreakdown, setShowAllBreakdown] = useState<boolean>(false);

  const getTrendingKeywordsAction = useAction(api.actions.googleTrends.getTrendingKeywords);
  const fetchArticlesAction = useAction(api.actions.googleTrends.fetchArticlesForKeyword);

  // Fetch all keywords on-demand (cached for fast transitions & back/forward)
  const {
    data: keywords = [],
    isLoading: isKeywordsLoading,
    refetch: refetchKeywords,
  } = useQuery<KeywordItem[]>({
    queryKey: sourcesQueryKeys.keywords("googleTrends"),
    queryFn: async (): Promise<KeywordItem[]> => {
      const result = await getTrendingKeywordsAction({});
      return result ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const currentKeywordObj = useMemo(() => {
    if (!keywordSlug) return null;
    const decoded = decodeURIComponent(keywordSlug).toLowerCase().trim();
    return (
      keywords.find((k) => k.id.toLowerCase() === decoded) ||
      keywords.find((k) => k.keyword.toLowerCase().trim() === decoded) ||
      keywords.find((k) => k.id.toLowerCase().replace(/[^a-z0-9]+/g, "-") === decoded) ||
      keywords.find((k) => k.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-") === decoded) ||
      null
    );
  }, [keywords, keywordSlug]);

  const displayKeyword = currentKeywordObj?.keyword || decodeURIComponent(keywordSlug).replace(/-/g, " ");

  const createThreadHref = useMemo(() => {
    const topic = displayKeyword;
    const desc = currentKeywordObj?.relatedKeywords?.length
      ? `Explore emerging developments and insights on ${topic}. Related queries: ${currentKeywordObj.relatedKeywords.slice(0, 3).join(", ")}.`
      : `Explore emerging developments and insights on ${topic}.`;
    return `/threads/create?topic=${encodeURIComponent(topic)}&description=${encodeURIComponent(desc)}&agent=topic`;
  }, [displayKeyword, currentKeywordObj]);

  const hasArticleKeys = Boolean(currentKeywordObj?.articleKeys && currentKeywordObj.articleKeys.length > 0);

  // Fetch articles linked to this keyword directly from Google Trends
  const {
    data: articles = [],
    isLoading: isArticlesLoading,
    error: articlesError,
    refetch: refetchArticles,
    isFetching: isArticlesFetching,
  } = useQuery<Article[]>({
    queryKey: sourcesQueryKeys.bySourceKeyword("googleTrends", keywordSlug, hasArticleKeys),
    queryFn: async (): Promise<Article[]> => {
      const kw = currentKeywordObj?.keyword || decodeURIComponent(keywordSlug);
      const results = await fetchArticlesAction({
        keyword: kw,
        articleKeys: currentKeywordObj?.articleKeys,
      });
      return results ?? [];
    },
    enabled: Boolean(keywordSlug),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleSync = async () => {
    try {
      await Promise.all([refetchKeywords(), refetchArticles()]);
      toast.success("Topic refreshed successfully!");
    } catch (err) {
      console.error("Error refreshing topic:", err);
      toast.error("Failed to refresh topic.");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_e) {
      return dateStr;
    }
  };

  // Filter and sort articles based on text search, query chip, and published date
  const filteredArticles = useMemo(() => {
    let list = [...articles];
    if (activeQueryChip) {
      const chipLower = activeQueryChip.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(chipLower) ||
          a.description.toLowerCase().includes(chipLower)
      );
    }
    if (articleFilter.trim()) {
      const filterLower = articleFilter.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(filterLower) ||
          a.description.toLowerCase().includes(filterLower)
      );
    }

    const getTimestamp = (a: Article): number => {
      if (typeof a.published_at === "number" && !isNaN(a.published_at)) {
        return a.published_at;
      }
      if (a.published) {
        const parsed = new Date(a.published).getTime();
        if (!isNaN(parsed)) return parsed;
      }
      return 0;
    };

    list.sort((a, b) => {
      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);
      return dateSortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [articles, activeQueryChip, articleFilter, dateSortOrder]);

  const growthInfo = formatGrowthRate(currentKeywordObj?.trafficGrowthRate);
  const breakdownList = currentKeywordObj?.relatedKeywords || [];
  const visibleBreakdown = showAllBreakdown ? breakdownList : breakdownList.slice(0, 12);

  return (
    <div className="flex-1 w-full bg-linear-to-b from-background via-background/95 to-background/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Breadcrumb */}
        <div>
          <Link
            href="/sources"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Trending Topics</span>
          </Link>
        </div>

        {/* Google Trends KPI Hero Showcase */}
        <Card className="relative overflow-hidden bg-card/45 backdrop-blur-xs border-border/80 shadow-xs">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-violet-600 via-indigo-600 to-cyan-500" />

          <CardHeader className="p-5 sm:p-6 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Active Trend
                  </span>
                  {typeof currentKeywordObj?.rank === "number" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30 shadow-xs">
                      #{currentKeywordObj.rank} Relevance
                    </span>
                  )}
                  <span suppressHydrationWarning className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground border border-border/60">
                    <Clock className="w-3 h-3 text-muted-foreground/70" />
                    {formatStartedAgo(currentKeywordObj?.startedAtMs)}
                  </span>
                </div>
                <CardTitle className="text-3xl sm:text-4xl font-extrabold tracking-tight capitalize text-foreground">
                  {displayKeyword}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  Real-time Google Trends metrics and native articles supplied by Google Trends.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={!mounted ? false : (isArticlesLoading || isArticlesFetching)}
                  className="rounded-xl border-border/80 hover:bg-muted/50 cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${mounted && isArticlesFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Link href={createThreadHref}>
                  <Button
                    size="sm"
                    className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white cursor-pointer text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Thread</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* 4-Metric Google Trends Stat Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6">
              {/* Stat 1: Search Volume */}
              <div className="p-4 rounded-xl bg-background/50 border border-border/60 flex flex-col justify-between space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Search Volume</span>
                  <Search className="w-4 h-4 text-violet-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
                  {!mounted || isKeywordsLoading ? <Skeleton className="h-8 w-20" /> : formatSearchVolume(currentKeywordObj?.traffic)}
                </div>
                <div className="text-[11px] text-muted-foreground">Estimated queries</div>
              </div>

              {/* Stat 2: Growth % */}
              <div className="p-4 rounded-xl bg-background/50 border border-border/60 flex flex-col justify-between space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Volume Spike</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {!mounted || isKeywordsLoading ? <Skeleton className="h-8 w-20" /> : growthInfo.text}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {growthInfo.isBreakout ? "Breakout velocity" : "Surge acceleration"}
                </div>
              </div>

              {/* Stat 3: Trend Status */}
              <div className="p-4 rounded-xl bg-background/50 border border-border/60 flex flex-col justify-between space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Status</span>
                  <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                  Active
                </div>
                <div className="text-[11px] text-muted-foreground">Ongoing search interest</div>
              </div>

              {/* Stat 4: Timeline */}
              <div className="p-4 rounded-xl bg-background/50 border border-border/60 flex flex-col justify-between space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Timeline</span>
                  <Clock className="w-4 h-4 text-indigo-500" />
                </div>
                <div suppressHydrationWarning className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate mt-1">
                  {!mounted || isKeywordsLoading ? <Skeleton className="h-6 w-24" /> : formatStartedAgo(currentKeywordObj?.startedAtMs)}
                </div>
                <div className="text-[11px] text-muted-foreground">Initial trend spike</div>
              </div>
            </div>

            {/* Trend Breakdown Section */}
            {breakdownList.length > 0 && (
              <div className="mt-6 pt-5 border-t border-border/30">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-bold text-foreground">Trend Breakdown</h3>
                    <span className="text-xs text-muted-foreground">
                      ({breakdownList.length} search queries driving this trend)
                    </span>
                  </div>
                  {activeQueryChip && (
                    <button
                      onClick={() => setActiveQueryChip("")}
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                    >
                      Clear filter <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-3">
                  Click any query below to filter the verified news articles by related search term:
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {visibleBreakdown.map((query, idx) => {
                    const isChipActive = activeQueryChip === query;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveQueryChip(isChipActive ? "" : query)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 border cursor-pointer ${
                          isChipActive
                            ? "bg-violet-600 text-white border-violet-600 shadow-xs"
                            : "bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground border-border/50"
                        }`}
                      >
                        <Search className={`w-3 h-3 ${isChipActive ? "text-white" : "text-muted-foreground/70"}`} />
                        <span>{query}</span>
                        {isChipActive && <X className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>

                {breakdownList.length > 12 && (
                  <button
                    onClick={() => setShowAllBreakdown(!showAllBreakdown)}
                    className="mt-2.5 text-xs text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {showAllBreakdown ? (
                      <>
                        Show fewer queries <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        Show all {breakdownList.length} queries <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Verified Articles List */}
        <Card className="flex-1 flex flex-col relative overflow-hidden bg-card/45 backdrop-blur-xs border-border/80 shadow-xs">
          <CardHeader className="px-5 py-4 border-b border-border/30 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Verified News Articles</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-semibold font-mono">
                  {filteredArticles.length} {filteredArticles.length === 1 ? "article" : "articles"}
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Native news stories linked directly to this Google Trend.
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              {/* Date Sort Controls */}
              <div className="flex items-center gap-1 bg-background/60 p-1 rounded-xl border border-border/60 text-xs shrink-0 self-start sm:self-auto shadow-2xs">
                <span className="text-[11px] font-semibold text-muted-foreground px-1.5 hidden md:inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground/70" />
                  Date:
                </span>
                <button
                  type="button"
                  onClick={() => setDateSortOrder("newest")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    dateSortOrder === "newest"
                      ? "bg-violet-600 text-white font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                  title="Sort Newest First"
                >
                  <ArrowDown className="w-3 h-3" />
                  <span>Newest</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDateSortOrder("oldest")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    dateSortOrder === "oldest"
                      ? "bg-violet-600 text-white font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                  title="Sort Oldest First"
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>Oldest</span>
                </button>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  placeholder="Filter articles..."
                  value={articleFilter}
                  onChange={(e) => setArticleFilter(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background/60 border-border/60 rounded-lg"
                />
                {articleFilter && (
                  <button
                    onClick={() => setArticleFilter("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 flex flex-col min-h-[350px]">
            {isArticlesLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="h-6 w-1/3 rounded-md" />
                    <Skeleton className="h-6 w-1/3 rounded-md" />
                    <Skeleton className="h-6 w-1/6 rounded-md" />
                    <Skeleton className="h-6 w-1/12 rounded-md" />
                  </div>
                ))}
              </div>
            ) : articlesError ? (
              <div className="flex flex-col items-center justify-center flex-1 p-12 text-center space-y-4">
                <div className="p-3 bg-destructive/10 rounded-full text-destructive">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-foreground">Failed to fetch news articles for this trend.</p>
                <Button
                  variant="outline"
                  onClick={() => refetchArticles()}
                  className="rounded-xl border-border/80 hover:bg-muted/50 cursor-pointer text-xs"
                >
                  Try Again
                </Button>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 p-12 text-center space-y-3">
                <div className="p-4 bg-muted rounded-full text-muted-foreground/60">
                  <Globe className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Articles Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed text-center">
                  {activeQueryChip || articleFilter
                    ? "No articles matched the search query filter."
                    : "No articles returned by Google Trends for this active trend."}
                </p>
                {(activeQueryChip || articleFilter) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveQueryChip("");
                      setArticleFilter("");
                    }}
                    className="rounded-xl mt-2 text-xs"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Article Cards List */}
                <div className="md:hidden divide-y divide-border/30">
                  {filteredArticles.map((article: Article) => {
                    const sourceName = article.mediaCompany || article.description.replace(/^Source:\s*/i, "") || "Google News";
                    return (
                      <div
                        key={article.id}
                        className="p-4 space-y-3 hover:bg-muted/15 transition-colors cursor-pointer"
                        onClick={() => setSelectedArticle(article)}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/70 text-muted-foreground border border-border/50 text-[11px] font-medium truncate max-w-[60%]">
                              {sourceName}
                            </span>
                            <div className="flex items-center gap-1 text-muted-foreground text-[11px] shrink-0">
                              <Calendar className="w-3 h-3 text-muted-foreground/60" />
                              <span suppressHydrationWarning>{formatDate(article.published)}</span>
                            </div>
                          </div>
                          <h4 className="font-semibold text-sm text-foreground leading-snug hover:text-violet-600 transition-colors">
                            {article.title}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedArticle(article);
                            }}
                            className="text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Preview Detail
                          </Button>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/80 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Read Original Article"
                              aria-label="Read Original Article"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <Link
                              href={`/threads/create?url=${encodeURIComponent(article.url)}&topic=${encodeURIComponent(article.title)}&agent=news`}
                              className="inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Create</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto flex-1">
                  <Table>
                    <TableHeader className="bg-muted/20 border-b border-border/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground/80 w-[50%]">
                          Article Title
                        </TableHead>
                        <TableHead className="p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground/80 w-[25%]">
                          Source
                        </TableHead>
                        <TableHead className="p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground/80 w-[18%]">
                          <button
                            type="button"
                            onClick={() => setDateSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
                            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer group focus-visible:outline-none"
                            title={`Sort by published date (${dateSortOrder === "newest" ? "currently newest first" : "currently oldest first"}). Click to toggle.`}
                          >
                            <span>Published</span>
                            <span className="p-0.5 rounded bg-muted/60 text-violet-600 dark:text-violet-400 group-hover:bg-violet-500/10">
                              {dateSortOrder === "newest" ? (
                                <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUp className="w-3 h-3" />
                              )}
                            </span>
                          </button>
                        </TableHead>
                        <TableHead className="p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground/80 w-[10%] text-right">
                          Link
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredArticles.map((article: Article) => (
                        <TableRow
                          key={article.id}
                          onClick={() => setSelectedArticle(article)}
                          className="border-b border-border/30 hover:bg-muted/25 transition-colors duration-150 cursor-pointer"
                        >
                          {/* Title */}
                          <TableCell className="p-3 align-top whitespace-normal font-semibold text-foreground leading-snug">
                            {article.title}
                          </TableCell>

                          {/* Media Company / Source */}
                          <TableCell className="p-3 align-top whitespace-normal text-muted-foreground text-xs leading-relaxed">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/50 text-[11px] font-medium">
                              {article.mediaCompany || article.description.replace(/^Source:\s*/i, "") || "Google News"}
                            </span>
                          </TableCell>

                          {/* Published */}
                          <TableCell className="p-3 align-top whitespace-normal text-muted-foreground text-xs leading-relaxed">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                              <span suppressHydrationWarning>{formatDate(article.published)}</span>
                            </div>
                          </TableCell>

                          {/* Link */}
                          <TableCell className="p-3 align-top text-right" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-1.5 rounded-lg border border-border/80 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Read Original Article"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Article Detail Sheet Drawer */}
        <Sheet open={Boolean(selectedArticle)} onOpenChange={(open) => !open && setSelectedArticle(null)}>
          {selectedArticle && (
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6 flex flex-col justify-between">
              <div className="space-y-6">
                <SheetHeader className="p-0 text-left space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                      {selectedArticle.mediaCompany || selectedArticle.description.replace(/^Source:\s*/i, "") || "Google News"}
                    </span>
                    <span suppressHydrationWarning className="text-xs text-muted-foreground">{formatDate(selectedArticle.published)}</span>
                  </div>
                  <SheetTitle className="text-xl font-bold leading-tight text-foreground">
                    {selectedArticle.title}
                  </SheetTitle>
                  {selectedArticle.description && (
                    <SheetDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {selectedArticle.description}
                    </SheetDescription>
                  )}
                </SheetHeader>

                {selectedArticle.image && (
                  <div className="rounded-2xl overflow-hidden border border-border/40 bg-muted/20 max-h-60 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedArticle.image}
                      alt={selectedArticle.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-2.5">
                  <a
                    href={selectedArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl text-xs font-semibold py-2.5 border border-border/80 hover:bg-muted/50 text-foreground transition-all cursor-pointer bg-card"
                  >
                    View Original Article
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <Link
                    href={`/threads/create?url=${encodeURIComponent(selectedArticle.url)}&agent=news&topic=${encodeURIComponent(
                      displayKeyword
                    )}&guidance=${encodeURIComponent(
                      `Focus on key takeaways and developments from ${selectedArticle.mediaCompany || "this coverage"} regarding ${displayKeyword}. Article headline: "${selectedArticle.title}".`
                    )}`}
                    className="w-full"
                  >
                    <Button
                      size="sm"
                      className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white cursor-pointer text-xs py-2.5 h-auto flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Draft with News Editor</span>
                    </Button>
                  </Link>
                </div>
              </div>

              <SheetFooter className="p-0 pt-6 border-t border-border/30 mt-6 flex flex-row gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedArticle(null)}
                  className="rounded-xl border-border/80 hover:bg-muted/50 cursor-pointer text-xs"
                >
                  Close
                </Button>
              </SheetFooter>
            </SheetContent>
          )}
        </Sheet>
      </div>
    </div>
  );
}
