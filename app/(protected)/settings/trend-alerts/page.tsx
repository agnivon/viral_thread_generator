"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery as useConvexQuery, useMutation as useConvexMutation, useAction } from "convex/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Bell,
  Bot,
  Briefcase,
  Check,
  Coins,
  Dna,
  Film,
  Gamepad2,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sliders,
  Sparkles,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ActiveTrend } from "@/convex/actions/googleTrendsNewsActions";
import { classifyTrendNiches, matchesUserPreferences } from "@/convex/lib/nicheClassifier";
import { sourcesQueryKeys } from "@/app/(protected)/sources/page";

export const trendAlertsQueryKeys = {
  all: ["trendAlerts"] as const,
  settings: () => ["trendAlerts", "settings"] as const,
  liveTrends: (_geo: string = "US") => sourcesQueryKeys.keywords("googleTrends"),
  preview: (filters: {
    minGrowthRate: number;
    selectedNiches: string[];
    whitelistKeywords: string[];
    blacklistKeywords: string[];
  }) => ["trendAlerts", "preview", filters] as const,
};

const NICHE_ICONS: Record<string, React.ElementType> = {
  tech_ai: Bot,
  finance_crypto: Coins,
  business_startups: Briefcase,
  entertainment: Film,
  gaming: Gamepad2,
  sports: Trophy,
  science_health: Dna,
  politics_world: Landmark,
};

export default function TrendAlertsSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useConvexQuery(api.trendFilterSettings.getSettings);
  const nichesList = useConvexQuery(api.trendFilterSettings.getNichesList);
  const updateSettingsConvex = useConvexMutation(api.trendFilterSettings.updateSettings);
  const getTrendingKeywordsAction = useAction(api.actions.googleTrendsNewsActions.getTrendingKeywords);

  const [enabled, setEnabled] = useState<boolean>(false);
  const [minGrowthRate, setMinGrowthRate] = useState<number>(150);
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [whitelistKeywords, setWhitelistKeywords] = useState<string[]>([]);
  const [blacklistKeywords, setBlacklistKeywords] = useState<string[]>([]);
  const [newWhitelistTag, setNewWhitelistTag] = useState<string>("");
  const [newBlacklistTag, setNewBlacklistTag] = useState<string>("");

  // Sync state from server settings
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled ?? false);
      setMinGrowthRate(settings.minGrowthRate ?? 150);
      setSelectedNiches(settings.selectedNiches ?? []);
      setWhitelistKeywords(settings.whitelistKeywords ?? []);
      setBlacklistKeywords(settings.blacklistKeywords ?? []);
    }
  }, [settings]);

  // TanStack Query: Fetch & cache active Google Trends keywords
  const {
    data: liveTrends = [],
    isLoading: isLiveTrendsLoading,
    isFetching: isLiveTrendsFetching,
    refetch: refetchLiveTrends,
  } = useQuery<ActiveTrend[]>({
    queryKey: trendAlertsQueryKeys.liveTrends("US"),
    queryFn: async () => {
      const results = await getTrendingKeywordsAction({ geo: "US" });
      return results ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Compute live matching trends synchronously from TanStack Query cached trends
  const liveMatches = useMemo(() => {
    if (!liveTrends || liveTrends.length === 0) {
      return null;
    }

    const matches: Array<{
      _id: string;
      keyword: string;
      traffic: number;
      trafficGrowthRate: number;
      classifiedNiches: string[];
    }> = [];

    for (const trend of liveTrends) {
      const classifiedNiches = classifyTrendNiches(
        trend.keyword,
        trend.relatedKeywords || []
      );

      const isMatch = matchesUserPreferences(
        {
          keyword: trend.keyword,
          trafficGrowthRate: trend.trafficGrowthRate,
          relatedKeywords: trend.relatedKeywords,
          classifiedNiches,
        },
        {
          enabled: true, // evaluate filtering rules for preview regardless of master toggle
          minGrowthRate,
          selectedNiches,
          whitelistKeywords,
          blacklistKeywords,
        }
      );

      if (isMatch) {
        matches.push({
          _id: trend.id,
          keyword: trend.keyword,
          traffic: trend.traffic,
          trafficGrowthRate: trend.trafficGrowthRate,
          classifiedNiches,
        });
      }
    }

    return {
      totalTracked: liveTrends.length,
      matchedCount: matches.length,
      matches: matches.slice(0, 15),
    };
  }, [
    liveTrends,
    minGrowthRate,
    selectedNiches,
    whitelistKeywords,
    blacklistKeywords,
  ]);

  // TanStack Query: Mutation for saving trend filter preferences
  const { mutate: saveSettings, isPending: isSaving } = useMutation({
    mutationFn: async (payload: {
      enabled: boolean;
      minGrowthRate: number;
      selectedNiches: string[];
      whitelistKeywords: string[];
      blacklistKeywords: string[];
      desktopPushEnabled?: boolean;
      quietHoursEnabled?: boolean;
    }) => {
      return await updateSettingsConvex(payload);
    },
    onSuccess: () => {
      toast.success("Trend alert preferences saved successfully!");
      void queryClient.invalidateQueries({
        queryKey: trendAlertsQueryKeys.all,
      });
    },
    onError: (err: Error) => {
      console.error("Failed to save settings:", err);
      toast.error(err.message || "Failed to save settings. Please try again.");
    },
  });

  const handleToggleNiche = (nicheId: string) => {
    setSelectedNiches((prev) =>
      prev.includes(nicheId) ? prev.filter((id) => id !== nicheId) : [...prev, nicheId]
    );
  };

  const handleSelectAllNiches = () => {
    if (!nichesList) return;
    setSelectedNiches(nichesList.map((n) => n.id));
  };

  const handleClearAllNiches = () => {
    setSelectedNiches([]);
  };

  const handleAddWhitelistTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = newWhitelistTag.trim().toLowerCase();
    if (!raw) return;
    const splitTags = raw.split(",").map((t) => t.trim()).filter(Boolean);
    const updated = [...whitelistKeywords];
    for (const tag of splitTags) {
      if (!updated.includes(tag)) {
        updated.push(tag);
      }
    }
    setWhitelistKeywords(updated);
    setNewWhitelistTag("");
  };

  const handleRemoveWhitelistTag = (tag: string) => {
    setWhitelistKeywords(whitelistKeywords.filter((t) => t !== tag));
  };

  const handleAddBlacklistTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = newBlacklistTag.trim().toLowerCase();
    if (!raw) return;
    const splitTags = raw.split(",").map((t) => t.trim()).filter(Boolean);
    const updated = [...blacklistKeywords];
    for (const tag of splitTags) {
      if (!updated.includes(tag)) {
        updated.push(tag);
      }
    }
    setBlacklistKeywords(updated);
    setNewBlacklistTag("");
  };

  const handleRemoveBlacklistTag = (tag: string) => {
    setBlacklistKeywords(blacklistKeywords.filter((t) => t !== tag));
  };

  const handleSave = () => {
    // Flush any pending tag in input fields before saving
    let finalWhitelist = [...whitelistKeywords];
    if (newWhitelistTag.trim()) {
      const pendingTags = newWhitelistTag
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      for (const t of pendingTags) {
        if (!finalWhitelist.includes(t)) {
          finalWhitelist.push(t);
        }
      }
      setWhitelistKeywords(finalWhitelist);
      setNewWhitelistTag("");
    }

    let finalBlacklist = [...blacklistKeywords];
    if (newBlacklistTag.trim()) {
      const pendingTags = newBlacklistTag
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      for (const t of pendingTags) {
        if (!finalBlacklist.includes(t)) {
          finalBlacklist.push(t);
        }
      }
      setBlacklistKeywords(finalBlacklist);
      setNewBlacklistTag("");
    }

    saveSettings({
      enabled,
      minGrowthRate,
      selectedNiches,
      whitelistKeywords: finalWhitelist,
      blacklistKeywords: finalBlacklist,
    });
  };

  if (!settings || !nichesList) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500 mr-2" />
        <span className="text-sm font-medium">Loading alert preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Master Alert Activation Card */}
      <Card className="relative overflow-hidden bg-card/45 backdrop-blur-xs border-border/80 shadow-xs">
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  enabled
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Bell className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Real-Time Trend Notifications
              </h2>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border",
                  enabled
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border/50"
                )}
              >
                {enabled ? "ACTIVE" : "PAUSED"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl pt-1">
              When activated, our background scanner evaluates Google Trends every 15 minutes and
              dispatches high-priority in-app and desktop alerts matching your custom niches.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={cn(
                "relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500",
                enabled ? "bg-violet-600" : "bg-muted/80"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                  enabled ? "translate-x-6" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* 2. Target Creator Niches Selection */}
      <Card className="bg-card/45 backdrop-blur-xs border-border/80 shadow-xs">
        <CardHeader className="p-6 pb-4 border-b border-border/30 bg-muted/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span>Target Focus Niches</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Select the topics and industries relevant to your audience. Only trends classified
                into these niches will trigger notifications.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllNiches}
                className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllNiches}
                className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {nichesList.map((niche) => {
              const Icon = NICHE_ICONS[niche.id] || Sparkles;
              const isSelected = selectedNiches.includes(niche.id);

              return (
                <button
                  key={niche.id}
                  type="button"
                  onClick={() => handleToggleNiche(niche.id)}
                  className={cn(
                    "flex flex-col p-4 rounded-xl text-left border transition-all cursor-pointer relative group overflow-hidden",
                    isSelected
                      ? "bg-violet-500/10 border-violet-500/60 text-foreground ring-1 ring-violet-500/30 shadow-xs dark:bg-violet-950/30"
                      : "bg-background/40 border-border/60 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        isSelected
                          ? "bg-violet-600 text-white"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div
                      className={cn(
                        "h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-violet-600 border-violet-600 text-white"
                          : "border-border/80 bg-background/50"
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  <span className="font-bold text-sm text-foreground mb-1 leading-snug">
                    {niche.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {niche.description}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. Velocity & Momentum Sensitivity */}
      <Card className="bg-card/45 backdrop-blur-xs border-border/80 shadow-xs">
        <CardHeader className="p-6 pb-4 border-b border-border/30 bg-muted/10">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <span>Spike Velocity Sensitivity</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Choose whether to receive alerts for emerging steady momentum or only explosive breakouts.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option A: Moderate Momentum */}
            <div
              onClick={() => setMinGrowthRate(150)}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
                minGrowthRate <= 150
                  ? "bg-violet-500/10 border-violet-500/60 ring-1 ring-violet-500/30"
                  : "bg-background/40 border-border/60 hover:bg-muted/40"
              )}
            >
              <div
                className={cn(
                  "h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0",
                  minGrowthRate <= 150 ? "border-violet-600 bg-violet-600" : "border-border"
                )}
              >
                {minGrowthRate <= 150 && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">
                    Moderate Momentum & Breakouts
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Alerts on search volume spikes of +150% or higher. Catches trends early before peak
                  virality occurs.
                </p>
              </div>
            </div>

            {/* Option B: Breakouts Only */}
            <div
              onClick={() => setMinGrowthRate(500)}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
                minGrowthRate > 150
                  ? "bg-violet-500/10 border-violet-500/60 ring-1 ring-violet-500/30"
                  : "bg-background/40 border-border/60 hover:bg-muted/40"
              )}
            >
              <div
                className={cn(
                  "h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0",
                  minGrowthRate > 150 ? "border-violet-600 bg-violet-600" : "border-border"
                )}
              >
                {minGrowthRate > 150 && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div className="space-y-1">
                <span className="font-bold text-sm text-foreground">
                  Explosive Breakouts Only
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Only notifies on +500% velocity surges or Google "Breakout" spikes. Very low alert
                  volume, strictly top-tier spikes.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Keyword Whitelist & Blacklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Whitelist Card */}
        <Card className="bg-card/45 backdrop-blur-xs border-border/80 shadow-xs">
          <CardHeader className="p-5 border-b border-border/30 bg-muted/10">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Must-Have Keywords (Whitelist)</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Always alert when these terms appear, regardless of category.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <form onSubmit={handleAddWhitelistTag} className="flex gap-2">
              <Input
                placeholder="e.g. deepseek, nvidia, solana"
                value={newWhitelistTag}
                onChange={(e) => setNewWhitelistTag(e.target.value)}
                className="h-9 text-xs bg-background/60 rounded-xl"
              />
              <Button type="submit" size="sm" className="h-9 rounded-xl px-3 cursor-pointer shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </form>

            <div className="flex flex-wrap gap-1.5 min-h-12 pt-1">
              {whitelistKeywords.length === 0 ? (
                <span className="text-xs text-muted-foreground/60 italic self-center">
                  No priority keywords added yet.
                </span>
              ) : (
                whitelistKeywords.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWhitelistTag(tag)}
                      className="hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Blacklist Card */}
        <Card className="bg-card/45 backdrop-blur-xs border-border/80 shadow-xs">
          <CardHeader className="p-5 border-b border-border/30 bg-muted/10">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Muted Topics (Blacklist)</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Never alert on trends containing these negative keywords.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <form onSubmit={handleAddBlacklistTag} className="flex gap-2">
              <Input
                placeholder="e.g. horoscope, lottery, reality tv"
                value={newBlacklistTag}
                onChange={(e) => setNewBlacklistTag(e.target.value)}
                className="h-9 text-xs bg-background/60 rounded-xl"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="h-9 rounded-xl px-3 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </form>

            <div className="flex flex-wrap gap-1.5 min-h-12 pt-1">
              {blacklistKeywords.length === 0 ? (
                <span className="text-xs text-muted-foreground/60 italic self-center">
                  No muted topics added yet.
                </span>
              ) : (
                blacklistKeywords.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlacklistTag(tag)}
                      className="hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Live Matching Trends Preview */}
      <Card className="bg-card/45 backdrop-blur-xs border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-border/30 bg-muted/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-violet-500" />
              <span>Live Rule Preview</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Current real-time trends that match your configured niches and keywords.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {liveMatches && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                {liveMatches.matchedCount} of {liveMatches.totalTracked} Trends Matched
              </span>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void refetchLiveTrends();
                toast.success("Refreshing active trends...");
              }}
              disabled={isLiveTrendsFetching}
              className="h-7 text-xs rounded-lg px-2.5 cursor-pointer"
            >
              <RefreshCw className={cn("w-3 h-3 mr-1", isLiveTrendsFetching && "animate-spin text-violet-500")} />
              <span>Refresh</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {!liveMatches || (isLiveTrendsLoading && liveTrends.length === 0) ? (
            <div className="py-8 flex items-center justify-center text-muted-foreground text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Evaluating active trends...
            </div>
          ) : liveMatches.matches.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No active Google Trends match your current filter rules. Try adding more niches or
              adjusting minimum spike velocity.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveMatches.matches.map((item) => (
                <div
                  key={item._id}
                  className="p-3.5 rounded-xl border border-border/50 bg-background/50 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs capitalize text-foreground truncate">
                      {item.keyword}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 shrink-0">
                      +{item.trafficGrowthRate}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.classifiedNiches.map((nicheId) => {
                      const nDef = nichesList.find((n) => n.id === nicheId);
                      return (
                        <span
                          key={nicheId}
                          className="text-[10px] px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/40 font-medium"
                        >
                          {nDef?.name || nicheId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Sticky Save Footer */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-card/80 backdrop-blur-md border border-border/80 sticky bottom-4 shadow-xl">
        <div className="text-xs text-muted-foreground">
          {enabled ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Notifications will fire when matching trends emerge.
            </span>
          ) : (
            <span className="text-muted-foreground">
              Alerts are currently paused. Toggle on above to activate.
            </span>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-xl px-6 bg-linear-to-r from-violet-600 to-indigo-600 text-white font-semibold cursor-pointer shadow-md hover:shadow-lg transition-all"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Preferences
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
