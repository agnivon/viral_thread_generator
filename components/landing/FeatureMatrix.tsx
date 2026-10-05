"use client";

import { Layers, TrendingUp, Anchor, ShieldCheck, Image as ImageIcon, Send, Sparkles } from "lucide-react";

export function FeatureMatrix() {
  const features = [
    {
      title: "Multi-Source Generation Studio",
      category: "Creation",
      icon: Layers,
      color: "text-violet-500 bg-violet-500/10",
      description:
        "Input article links, newsletters, or open-ended topic prompts. Queue up multiple thread generations in parallel with Convex background workers.",
      highlights: ["URL Scraping via Firecrawl", "Topic & Keyword Synthesis", "Parallel Background Queue"],
    },
    {
      title: "Real-Time Trend Radar",
      category: "Discovery",
      icon: TrendingUp,
      color: "text-cyan-500 bg-cyan-500/10",
      description:
        "Monitor live Google search trends across 8 creator niches (Tech & AI, Crypto & Finance, Business & Startups, Gaming). Detect surging velocity and generate drafts in 1 click.",
      highlights: ["Search Volume & Growth Velocity", "8 Niche Category Classifiers", "Velocity & Recency Sorting"],
    },
    {
      title: "Human-In-The-Loop Hook Curation",
      category: "Psychology",
      icon: Anchor,
      color: "text-amber-500 bg-amber-500/10",
      description:
        "Never compromise on your opening line. The generation pipeline pauses at the hook milestone, letting you review 5 distinct psychological frameworks or write your own.",
      highlights: ["5 Psychological Frameworks", "Live 500-Character Budgeting", "Instant Pipeline Resume"],
    },
    {
      title: "Adversarial Virality Critic",
      category: "Refinement",
      icon: ShieldCheck,
      color: "text-emerald-500 bg-emerald-500/10",
      description:
        "Every thread is scored against a rigorous 0–100 virality rubric. Receive granular post-by-post critiques and trigger guided iterative refinements with custom instructions.",
      highlights: ["0–100 Rubric Scoring", "Post-by-Post Feedback", "Guided Iteration Loops"],
    },
    {
      title: "Media & Link Previews",
      category: "Assets",
      icon: ImageIcon,
      color: "text-indigo-500 bg-indigo-500/10",
      description:
        "Attach visual media automatically extracted from source articles or enter direct image and video URLs. Preview OpenGraph link cards with client-cached metadata.",
      highlights: ["Extracted Article Media", "Custom Image & Video URLs", "Live URL Link Previews"],
    },
    {
      title: "Direct Meta Threads Publishing",
      category: "Distribution",
      icon: Send,
      color: "text-rose-500 bg-rose-500/10",
      description:
        "Connect your Meta Threads account via official OAuth. Publish complete multi-post sequences, carousels, and optional source links directly to your profile.",
      highlights: ["Official Threads OAuth", "Background Retry Workers", "Append Source URL Toggle"],
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 relative">
      <div className="container max-w-6xl mx-auto space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Complete Creator Toolkit
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Engineered for Maximum Virality &amp; Creative Control
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Everything you need to discover breakout ideas, research thoroughly, write compelling hooks, 
            and publish high-engagement Threads at scale.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative overflow-hidden p-6 sm:p-7 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-xs hover:border-violet-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Top Accent Gradient on Hover */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-linear-to-r from-violet-600 via-indigo-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-md">
                      {feature.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-2.5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    {feature.description}
                  </p>
                </div>

                {/* Highlights List */}
                <div className="pt-4 border-t border-border/40 space-y-2">
                  {feature.highlights.map((highlight) => (
                    <div key={highlight} className="flex items-center gap-2 text-xs text-foreground/80 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
