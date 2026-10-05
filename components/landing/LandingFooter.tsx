"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingFooter() {
  return (
    <footer className="relative border-t border-border/40 bg-background overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-linear-to-t from-violet-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* High-Impact Pre-Footer CTA Banner */}
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16">
        <div className="relative rounded-3xl p-8 sm:p-12 lg:p-16 border border-violet-500/30 bg-linear-to-br from-violet-950/20 via-indigo-950/10 to-card overflow-hidden text-center space-y-6 sm:space-y-8 shadow-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Start Free Today
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Ready to Supercharge Your Audience on{" "}
            <span className="bg-linear-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
              Meta Threads
            </span>
            ?
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Turn breaking news, research dossiers, and Google Trends into high-engagement thread sequences in under a minute.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto rounded-xl bg-linear-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-700 hover:via-indigo-700 hover:to-cyan-700 text-white font-bold h-13 px-8 text-base shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer gap-2"
              >
                Launch Creator Studio
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Copyright */}
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-linear-to-br from-violet-600 to-indigo-600 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold text-foreground">Viral Thread Generator</span>
          <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Operational</span>
          </div>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Login
          </Link>
          <a href="#pipeline" className="hover:text-foreground transition-colors">
            Agent Graph
          </a>
          <a href="#trends" className="hover:text-foreground transition-colors">
            Trend Radar
          </a>
        </div>
      </div>
    </footer>
  );
}
