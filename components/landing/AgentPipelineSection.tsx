"use client";

import { Cpu, Search, FileText, Anchor, UserCheck, ShieldAlert, CheckCircle2 } from "lucide-react";

export function AgentPipelineSection() {
  const nodes = [
    {
      step: "01",
      name: "Context Researcher & Scraper",
      icon: Search,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
      description:
        "Extracts clean markdown from articles, newsletters, and URLs via Firecrawl & Jina. Deep-searches background context using Tavily and Brave Search.",
    },
    {
      step: "02",
      name: "Research Dossier Generator",
      icon: FileText,
      color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
      description:
        "Condenses long-form intelligence into a structured dossier containing key facts, verifiable statistics, impactful quotes, and contrarian perspectives.",
    },
    {
      step: "03",
      name: "Psychological Hook Strategist",
      icon: Anchor,
      color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
      description:
        "Generates 5 distinct viral hook candidates spanning proven frameworks: Curiosity Gap, Bold Claim, Contrarian Take, Story Lead, and Actionable Listicle.",
    },
    {
      step: "04",
      name: "Human-In-The-Loop Pause Node",
      icon: UserCheck,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      description:
        "Pauses execution via LangGraph checkpointers. You inspect candidate hooks, select your favorite, tweak wording, or write your own before resuming generation.",
    },
    {
      step: "05",
      name: "Thread Writer & Virality Critic",
      icon: ShieldAlert,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      description:
        "Drafts a multi-post sequence under 500-char limits. An adversarial critic node judges the thread on hook strength, flow, and pacing, providing actionable post critiques and iteration directives.",
    },
  ];

  return (
    <section id="pipeline" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-muted/5 relative">
      <div className="container max-w-6xl mx-auto space-y-12 sm:space-y-16">
        {/* Section Heading */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5" /> LangGraph Multi-Agent Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            How the 5-Node Agent Engine Crafts Viral Threads
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Generic AI wrappers generate repetitive, bland posts. Our cyclical multi-agent graph 
            separates research, psychology, human curation, and adversarial critique into dedicated specialized nodes.
          </p>
        </div>

        {/* Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            return (
              <div
                key={node.step}
                className={`relative p-6 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs hover:border-violet-500/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group ${
                  index === 4 ? "md:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl border ${node.color} group-hover:scale-105 transition-transform duration-300`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-muted-foreground/60">
                      NODE {node.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {node.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {node.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Fully Automated
                  </span>
                  {node.step === "04" && (
                    <span className="text-amber-500 font-bold uppercase tracking-wider text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Creator Checkpoint
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
