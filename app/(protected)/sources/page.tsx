"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { AlertCircle, Calendar, ExternalLink, Globe, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string[];
  published: string;
  published_at?: number;
  virality_score?: number;
  overall_critique?: string;
  hook_potential_analysis?: string;
}

interface KeywordItem {
  id: string;
  keyword: string;
}

function SourceDataGrid({
  sourceId,
  getLatestNewsAction,
  evaluateArticleAction,
  items
}: {
  sourceId: string;
  getLatestNewsAction: any;
  evaluateArticleAction: any;
  items: KeywordItem[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const queryClient = useQueryClient();
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [scoringIds, setScoringIds] = useState<Record<string, boolean>>({});
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");

  useEffect(() => {
    if (items.length > 0 && !selectedKeyword) {
      setSelectedKeyword(items[0].id);
    }
  }, [items, selectedKeyword]);

  const handleScoreArticle = async (articleId: string) => {
    setScoringIds((prev) => ({ ...prev, [articleId]: true }));
    try {
      await evaluateMutation.mutateAsync(articleId);
    } catch (err) {
      // Handled in mutate callbacks
    } finally {
      setScoringIds((prev) => {
        const next = { ...prev };
        delete next[articleId];
        return next;
      });
    }
  };

  const evaluateMutation = useMutation({
    mutationFn: async (articleId: string) => {
      return await evaluateArticleAction({ keyword: selectedKeyword, id: articleId });
    },
    onSuccess: (updatedArticle: any) => {
      // Update infinite query cache with the newly scored article
      queryClient.setQueryData(["news", sourceId, selectedKeyword], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            page: page.page.map((article: any) =>
              article.id === updatedArticle.id
                ? { ...article, ...updatedArticle }
                : article
            ),
          })),
        };
      });
      toast.success("Article evaluated and scored successfully!");
    },
    onError: (err: any) => {
      console.error("Evaluation error:", err);
      toast.error(err.message || "Failed to evaluate article.");
    },
  });

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isRefetching,
    refetch,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["news", sourceId, selectedKeyword],
    queryFn: async ({ pageParam }) => {
      if (!selectedKeyword) return { page: [], isDone: true, continueCursor: null };
      return await getLatestNewsAction({ keyword: selectedKeyword, cursor: pageParam, numItems: 30 });
    },
    enabled: !!selectedKeyword,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => {
      return lastPage?.isDone ? undefined : (lastPage?.continueCursor || undefined);
    },
  });

  const handleSync = async () => {
    if (!selectedKeyword) return;
    try {
      await refetch();
      toast.success("News refreshed successfully!");
    } catch (err) {
      console.error("Error refreshing news:", err);
      toast.error("Failed to refresh news.");
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
    } catch (e) {
      return dateStr;
    }
  };

  const articles = data?.pages.flatMap((page) => page?.page || []) ?? [];
  const activeArticle = articles.find((a: any) => a.id === selectedArticle?.id) || selectedArticle;
  const isRefreshing = isFetching && !isFetchingNextPage;

  const currentKeywordObj = items.find(i => i.id === selectedKeyword);
  const displayKeyword = currentKeywordObj ? currentKeywordObj.keyword : selectedKeyword;

  return (
    <div className="flex flex-col lg:flex-row gap-6 mt-6 min-h-[600px]">
      
      {/* Left Sidebar - Keywords */}
      <div className="lg:w-1/4 flex flex-col gap-4">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-bold text-foreground">Trending Topics</h2>
        </div>
        <Card className="bg-card/45 backdrop-blur-xs border-border/80 flex flex-col h-[600px] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {items.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                <Globe className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">No trending topics found.</p>
              </div>
            ) : (
              items.map((item) => {
                const isSelected = selectedKeyword === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedKeyword(item.id)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer ${
                      isSelected
                        ? "bg-violet-600 border-violet-600 text-white shadow-md ring-1 ring-violet-500/30"
                        : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate pr-2 capitalize leading-tight">{item.keyword}</span>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 shrink-0 rounded-full bg-white animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="p-4 border-t border-border/30 bg-muted/10">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={mounted ? (!selectedKeyword || isLoading || isRefreshing) : true}
              className="w-full justify-center rounded-xl border-border/80 hover:bg-muted/50 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${mounted && isRefreshing ? "animate-spin" : ""}`} />
              Sync Selected
            </Button>
          </div>
        </Card>
      </div>

      {/* Right Area - Articles */}
      <div className="lg:w-3/4 flex flex-col">
        <Card className="flex-1 flex flex-col relative overflow-hidden bg-card/45 backdrop-blur-xs border-border/80 hover:border-violet-500/10 transition-all duration-300">
          {/* Accent Highlight Line on Card Hover */}
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <CardHeader className="px-6 py-5 border-b border-border/30 bg-muted/10">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Articles for "{displayKeyword ? <span className="capitalize text-violet-500">{displayKeyword}</span> : '...'}"
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground">
              The latest news fetched and stored from {sourceId === "currents" ? "Currents API" : "NewsData API"}.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 flex-1 flex flex-col min-h-[400px]">
            {isLoading && selectedKeyword ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="h-6 w-1/4 rounded-md" />
                    <Skeleton className="h-6 w-1/2 rounded-md" />
                    <Skeleton className="h-6 w-1/12 rounded-md" />
                    <Skeleton className="h-6 w-1/12 rounded-md" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center flex-1 p-12 text-center space-y-4">
                <div className="p-3 bg-destructive/10 rounded-full text-destructive">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-foreground">Failed to fetch news from Firestore.</p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="rounded-xl border-border/80 hover:bg-muted/50 cursor-pointer"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <Table>
                  <TableHeader className="bg-muted/20 border-b border-border/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground/80 w-[20%]">Title</TableHead>
                      <TableHead className="p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground/80 w-[35%]">Description</TableHead>
                      <TableHead className="p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground/80 w-[10%]">Category</TableHead>
                      <TableHead className="p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground/80 w-[15%]">Published</TableHead>
                      <TableHead className="p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground/80 w-[15%]">Score</TableHead>
                      <TableHead className="p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground/80 w-[5%] text-right">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.length === 0 ? (
                      <TableRow className="hover:bg-transparent border-0">
                        <TableCell colSpan={6} className="p-16 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="p-4 bg-muted rounded-full text-muted-foreground/60">
                              <Globe className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">No Articles Found</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed text-center">
                              {selectedKeyword 
                                ? "We couldn't find any articles synced to Firestore for this keyword." 
                                : "Please select a trending keyword from the sidebar."}
                            </p>
                            {selectedKeyword && (
                              <Button
                                onClick={handleSync}
                                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold cursor-pointer"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" /> Sync This Topic
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      articles.map((article: any) => (
                        <TableRow
                          key={article.id}
                          className="border-b border-border/30 hover:bg-muted/25 transition-colors duration-150"
                        >
                          <TableCell className="p-3 align-top whitespace-normal min-w-[200px] font-semibold text-foreground leading-snug">
                            {article.title}
                          </TableCell>
                          <TableCell className="p-3 align-top whitespace-normal min-w-[280px] text-muted-foreground text-xs leading-relaxed">
                            {article.description || <span className="italic text-muted-foreground/50">No description provided.</span>}
                          </TableCell>
                          <TableCell className="p-3 align-top whitespace-normal min-w-[100px]">
                            <div className="flex flex-wrap gap-1">
                              {article.category && article.category.length > 0 ? (
                                article.category.map((cat: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 shadow-xs"
                                  >
                                    {cat}
                                  </span>
                                ))
                              ) : (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                                  general
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="p-3 align-top whitespace-nowrap text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                              <span>{formatDate(article.published)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="p-3 align-top whitespace-normal min-w-[140px]">
                            <div className="flex flex-col gap-2">
                              {article.virality_score !== undefined && article.virality_score !== null ? (
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => setSelectedArticle(article)}
                                    className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-bold w-fit shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer ${article.virality_score >= 85
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        : article.virality_score >= 70
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                          : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                                      }`}
                                    title="Click to view overall critique"
                                  >
                                    {article.virality_score} / 100
                                  </button>
                                  <button
                                    onClick={() => setSelectedArticle(article)}
                                    className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline text-left font-medium flex items-center gap-0.5 mt-0.5 cursor-pointer"
                                  >
                                    Read Critique &rarr;
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/50 italic">Not evaluated</span>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleScoreArticle(article.id)}
                                disabled={!!scoringIds[article.id]}
                                className="rounded-lg text-xs py-1 h-7 border border-border/80 hover:bg-violet-500/5 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-500/20 cursor-pointer flex items-center gap-1.5 w-full justify-center transition-all"
                              >
                                {scoringIds[article.id] ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    Scoring...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3" />
                                    {article.virality_score !== undefined && article.virality_score !== null ? "Re-Score" : "Score"}
                                  </>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="p-3 align-top text-right">
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-2 rounded-xl bg-violet-500/5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:text-violet-700 transition-all border border-violet-500/10 hover:border-violet-500/30"
                              title="Open original article"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {hasNextPage && !isLoading && !error && articles.length > 0 && (
              <div className="flex justify-center p-6 border-t border-border/30 bg-muted/5 mt-auto">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-xl border-border/80 hover:bg-muted/50 cursor-pointer flex items-center gap-2"
                >
                  {isFetchingNextPage ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More Articles"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        {activeArticle && (
          <SheetContent className="w-full sm:max-w-md p-6 overflow-y-auto bg-card/95 backdrop-blur-md border-l border-border/30">
            <SheetHeader className="p-0 pb-5 border-b border-border/30">
              <div className="flex items-center gap-2 mb-2">
                {activeArticle.category && activeArticle.category.length > 0 ? (
                  activeArticle.category.map((cat: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                    >
                      {cat}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                    general
                  </span>
                )}
              </div>
              <SheetTitle className="text-xl font-bold tracking-tight text-foreground leading-snug">
                {activeArticle.title}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(activeArticle.published)}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {activeArticle.virality_score !== undefined && activeArticle.virality_score !== null && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">Virality Rating</h4>
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/30 space-y-3">
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-black text-foreground bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
                        {activeArticle.virality_score} <span className="text-sm font-semibold text-muted-foreground">/ 100</span>
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${activeArticle.virality_score >= 85
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : activeArticle.virality_score >= 70
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                        }`}>
                        {activeArticle.virality_score >= 85
                          ? "High Virality"
                          : activeArticle.virality_score >= 70
                            ? "Moderate"
                            : "Low Potential"}
                      </span>
                    </div>
                    <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden border border-border/40">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${activeArticle.virality_score >= 85
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                            : activeArticle.virality_score >= 70
                              ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                              : "bg-gradient-to-r from-rose-500 to-red-500"
                          }`}
                        style={{ width: `${activeArticle.virality_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeArticle.overall_critique && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">AI Critique</h4>
                  <div className="p-4.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-950 dark:text-amber-100 text-sm leading-relaxed italic pl-4 border-l-4 border-l-amber-500/40">
                    "{activeArticle.overall_critique}"
                  </div>
                </div>
              )}

              {activeArticle.hook_potential_analysis && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">Hook Potential Analysis</h4>
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap font-medium">
                    {activeArticle.hook_potential_analysis}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <a
                  href={activeArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold py-3 border border-border/80 hover:bg-muted/50 text-foreground transition-all cursor-pointer"
                >
                  View Original Article
                  <ExternalLink className="w-4 h-4" />
                </a>
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
              <Button
                onClick={() => handleScoreArticle(activeArticle.id)}
                disabled={!!scoringIds[activeArticle.id]}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-xs cursor-pointer flex items-center gap-1.5"
              >
                {scoringIds[activeArticle.id] ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Scoring...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Re-Score
                  </>
                )}
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}

export default function SourcesPage() {
  const getLatestCurrents = useAction(api.actions.currentsNewsActions.getLatestNewsFromFirestore);
  const evaluateCurrents = useAction(api.actions.currentsNewsActions.evaluateNewsArticle);
  const getAvailableKeywordsCurrents = useAction(api.actions.currentsNewsActions.getAvailableKeywords);

  const getLatestNewsdata = useAction(api.actions.newsdataActions.getLatestNewsFromFirestore);
  const evaluateNewsdata = useAction(api.actions.newsdataActions.evaluateNewsArticle);
  const getAvailableKeywordsNewsdata = useAction(api.actions.newsdataActions.getAvailableKeywords);

  const [currentsKeywords, setCurrentsKeywords] = useState<KeywordItem[]>([]);
  const [newsdataKeywords, setNewsdataKeywords] = useState<KeywordItem[]>([]);

  useEffect(() => {
    getAvailableKeywordsCurrents().then(setCurrentsKeywords).catch(console.error);
    getAvailableKeywordsNewsdata().then(setNewsdataKeywords).catch(console.error);
  }, [getAvailableKeywordsCurrents, getAvailableKeywordsNewsdata]);

  return (
    <div className="flex-1 w-full bg-gradient-to-b from-background via-background/95 to-background/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/30 pb-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
                Sources
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage and view news content sources synced to your workspace by trending topic.
            </p>
          </div>
        </div>

        <Tabs defaultValue="currents" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="currents">Currents API</TabsTrigger>
            <TabsTrigger value="newsdata">NewsData API</TabsTrigger>
          </TabsList>
          
          <TabsContent value="currents" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
            <SourceDataGrid
              sourceId="currents"
              getLatestNewsAction={getLatestCurrents}
              evaluateArticleAction={evaluateCurrents}
              items={currentsKeywords}
            />
          </TabsContent>
          
          <TabsContent value="newsdata" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
            <SourceDataGrid
              sourceId="newsdata"
              getLatestNewsAction={getLatestNewsdata}
              evaluateArticleAction={evaluateNewsdata}
              items={newsdataKeywords}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
