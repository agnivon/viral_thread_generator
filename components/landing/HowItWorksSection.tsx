"use client";

import { Link as LinkIcon, UserCheck, Send, Check } from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Input Source or Discover Trend",
      icon: LinkIcon,
      color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
      description:
        "Paste any article, newsletter, or documentation link, enter a raw topic prompt, or pick a trending keyword directly from Google Trends Radar.",
      badge: "Flexible Input",
    },
    {
      step: "02",
      title: "Curate Hook & Polish with AI Critic",
      icon: UserCheck,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      description:
        "The multi-agent pipeline pauses at the hook milestone. Pick your favorite hook angle, customize copy, and let the virality critic audit flow and retention.",
      badge: "Human-In-The-Loop",
    },
    {
      step: "03",
      title: "Publish to Meta Threads",
      icon: Send,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      description:
        "Attach visual media extracted from the source or custom media URLs, verify character limits, and publish directly to your Meta Threads profile with automatic retry support.",
      badge: "Official Meta API",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 relative">
      <div className="container max-w-6xl mx-auto space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400 text-xs font-semibold uppercase tracking-wider">
            Simple 3-Step Flow
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            From Raw Link to Published Thread in Minutes
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            A seamless bridge between autonomous AI power and creator discretion. You stay in the driver&apos;s seat without doing the tedious manual work.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="relative p-7 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-xs hover:border-violet-500/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`p-3 rounded-xl border ${step.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-muted-foreground/60 bg-muted px-2.5 py-1 rounded-md">
                      STEP {step.step}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1.5 block">
                    {step.badge}
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-border/30 flex items-center gap-2 text-xs font-medium text-foreground/80">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{idx === 0 ? "Zero manual note-taking" : idx === 1 ? "Full creative control" : "Direct API distribution"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
