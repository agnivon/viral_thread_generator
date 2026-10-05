"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, TrendingUp, Cpu, Award, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const metrics = [
    { label: "Virality Quality Gate", value: "85+", icon: Award, color: "text-emerald-500" },
    { label: "Multi-Agent Graph", value: "5-Node", icon: Cpu, color: "text-violet-500" },
    { label: "Google Trends Radar", value: "8 Niches", icon: TrendingUp, color: "text-cyan-500" },
    { label: "Meta Threads API", value: "Direct", icon: Zap, color: "text-indigo-500" },
  ];

  return (
    <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden text-center">
      {/* Background Ambient Glow Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-linear-to-b from-violet-500/15 via-indigo-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Announcement Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs sm:text-sm font-semibold tracking-wide shadow-xs animate-in fade-in duration-500">
          <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
          <span>Multi-Agent LangGraph + Real-Time Google Trends</span>
        </div>

        {/* Main Hero Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl min-[400px]:text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]">
            Turn Any Link, Topic, or Trend into{" "}
            <span className="bg-linear-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400 block sm:inline pb-1">
              Viral Threads
            </span>
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            The AI creator studio for Meta Threads. Extract deep research dossiers, craft 
            proven psychological hooks, audit with an adversarial virality critic, and publish 
            directly via official Meta APIs.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link href="/login" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto rounded-xl bg-linear-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-700 hover:via-indigo-700 hover:to-cyan-700 text-white font-bold h-13 px-8 text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer gap-2"
            >
              Start Generating Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <a href="#trends" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto rounded-xl border-border/80 bg-background/50 hover:bg-muted/50 font-semibold h-13 px-6 text-base transition-colors cursor-pointer gap-2"
            >
              <TrendingUp className="w-4 h-4 text-cyan-500" />
              Explore Trend Radar
            </Button>
          </a>
        </div>

        {/* Key Truthful Metrics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-8 max-w-4xl mx-auto">
          {metrics.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="p-4 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xs shadow-xs flex flex-col items-center justify-center text-center group hover:border-violet-500/30 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    {item.value}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
