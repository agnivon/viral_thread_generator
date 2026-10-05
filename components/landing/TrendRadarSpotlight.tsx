"use client";

import Link from "next/link";
import { TrendingUp, Bell, Flame, ArrowRight, Zap, Bot, Coins, Briefcase, Gamepad2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TrendRadarSpotlight() {
  const niches = [
    { name: "Tech & AI", icon: Bot, active: true },
    { name: "Crypto & Finance", icon: Coins, active: false },
    { name: "Business & Startups", icon: Briefcase, active: false },
    { name: "Gaming & Esports", icon: Gamepad2, active: false },
  ];

  const sampleTrends = [
    {
      keyword: "Nvidia Blackwell Architecture",
      volume: "100K+ Searches",
      growth: "+500%",
      niche: "Tech & AI",
      startedAgo: "Started 2 hours ago",
      isBreakout: true,
    },
    {
      keyword: "DeepSeek Reasoning Models",
      volume: "50K+ Searches",
      growth: "+380%",
      niche: "Tech & AI",
      startedAgo: "Started 4 hours ago",
      isBreakout: true,
    },
    {
      keyword: "Federal Reserve Rate Cut Expectation",
      volume: "100K+ Searches",
      growth: "+240%",
      niche: "Crypto & Finance",
      startedAgo: "Started 6 hours ago",
      isBreakout: false,
    },
  ];

  return (
    <section id="trends" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-muted/5 relative">
      <div className="container max-w-6xl mx-auto space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" /> Google Trends Intelligence
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Trend Radar: Catch Topics Before They Peak
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Never run out of high-relevance topics. Trend Radar monitors real-time Google search trends across 
            8 creator niches, tracks breakout velocity, and queues up research-backed thread drafts with one click.
          </p>
        </div>

        {/* Interactive Mock Trend Radar Dashboard */}
        <div className="rounded-3xl border border-border/80 bg-card/70 backdrop-blur-md p-6 sm:p-8 shadow-xl space-y-6">
          {/* Top Bar: Niche Filters & Alert Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
            <div className="flex flex-wrap items-center gap-2">
              {niches.map((niche) => {
                const Icon = niche.icon;
                return (
                  <button
                    key={niche.name}
                    type="button"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      niche.active
                        ? "bg-violet-600 text-white shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {niche.name}
                  </button>
                );
              })}
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border border-border/40">
              <Bell className="w-3.5 h-3.5 text-cyan-500" />
              <span>Niche Keyword Filtering &amp; Velocity Sorting</span>
            </div>
          </div>

          {/* Sample Trend Cards */}
          <div className="space-y-3">
            {sampleTrends.map((trend) => (
              <div
                key={trend.keyword}
                className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-background/60 hover:border-violet-500/40 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md">
                      {trend.niche}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      <Flame className="w-3 h-3 text-amber-500" />
                      {trend.growth} Velocity
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {trend.volume}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      · {trend.startedAgo}
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-foreground">
                    {trend.keyword}
                  </h4>
                </div>

                <Link href="/login" className="shrink-0">
                  <Button
                    size="sm"
                    className="rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-xs cursor-pointer gap-1.5 w-full sm:w-auto"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Generate Thread
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Bottom Banner inside radar */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
              Clicking &ldquo;Generate Thread&rdquo; runs research scraping, hook synthesis, and thread drafting automatically.
            </span>
            <Link href="/login" className="font-semibold text-violet-600 dark:text-violet-400 hover:underline">
              Explore live Google Trends &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
