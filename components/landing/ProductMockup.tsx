"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Trophy,
  Compass,
  FileText,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function ProductMockup() {
  const [isHooksExpanded, setIsHooksExpanded] = useState(false);
  const [appendUrlChecked, setAppendUrlChecked] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const posts = [
    {
      index: 1,
      content:
        "China just gave Iran an ultimatum that could reshape the entire Red Sea conflict—and nobody is talking about the real reason why.\n\nHere is what Beijing actually demanded behind closed doors 🧵👇",
      charCount: 186,
      critique: "High-tension curiosity gap. Opening line establishes high stakes immediately.",
      fixDirective: "Ensure post 2 directly reveals what Beijing's economic leverage consists of.",
    },
    {
      index: 2,
      content:
        "1. China buys 90% of Iranian crude oil exports—giving Beijing massive leverage over Tehran's economy.\n2. Over $1.2B in Chinese container shipping is diverted weekly around Africa.\n3. Beijing explicitly warned: if attacks disrupt Chinese commercial vessels, bilateral trade relations will suffer.",
      charCount: 248,
      hasMedia: true,
    },
    {
      index: 3,
      content:
        "The diplomatic nuance most analysts missed: China refused to join the US-led naval coalition, choosing back-channel economic pressure instead.\n\nThey protect their trade lanes while keeping distance from Western military operations.",
      charCount: 212,
    },
    {
      index: 4,
      content:
        "Will economic pressure from Beijing actually force Tehran to restrain regional proxies, or will shipping reroutes become permanent?\n\nWhat's your take? Let's discuss.",
      charCount: 164,
    },
  ];

  const candidateHooks = [
    "Why Beijing's quiet threat to Iran matters more than naval warships in the Red Sea.",
    "The economics of the Red Sea crisis: 90% of Iranian oil vs $1.2B in Chinese shipping throughput.",
  ];

  return (
    <section className="relative pb-20 sm:pb-32 px-3 sm:px-6 lg:px-8 overflow-hidden">
      <div className="container max-w-6xl mx-auto">
        {/* Glow Ring Behind Window */}
        <div className="relative rounded-3xl p-1 sm:p-2.5 bg-linear-to-b from-violet-500/25 via-indigo-500/10 to-transparent shadow-2xl">
          <div className="rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden text-left">
            {/* Window Top Bar / Simulated Browser Chrome */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <div className="hidden sm:flex items-center gap-1.5 ml-3 px-3 py-1 rounded-md bg-background/70 border border-border/50 text-[11px] font-mono text-muted-foreground">
                  <span className="text-violet-500 font-semibold">https://</span>
                  <span>viralthreadgen.app/threads/drafts/k829.../approve</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
                  Live Review Workspace
                </span>
              </div>
            </div>

            {/* Authentic Approve Page Content */}
            <div className="p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
              {/* Navigation Link */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-muted-foreground select-none">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Drafts
                </div>
              </div>

              {/* Header Section */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border/30 pb-4 sm:pb-6">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    <span className="bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
                      Review Thread Draft
                    </span>
                  </h1>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
                    <span className="shrink-0 sm:pt-0.5 font-medium">Generated from:</span>
                    <div className="min-w-0 flex flex-col">
                      <span className="font-semibold text-foreground truncate">
                        China Presses Iran to Rein in Houthi Red Sea Attacks
                      </span>
                      <span className="text-[11px] text-muted-foreground/75 truncate font-mono">
                        https://www.reuters.com/world/china/china-presses-iran-to-help-rein-in-houthi-attacks-2024-01-26/
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground bg-muted/60 px-3.5 py-2 rounded-xl border border-border/40 flex items-start gap-1.5 max-w-2xl">
                      <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <span className="font-semibold text-foreground">Guidance:</span> Highlight diplomatic pressure and shipping cost impacts on global supply chains.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-start pt-0.5">
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    Pending Review
                  </span>
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground whitespace-nowrap border border-border/50 shadow-xs">
                    1 Iteration
                  </span>
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Virality: 92/100
                  </span>
                </div>
              </div>

              {/* AI Critique card */}
              <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-xs rounded-2xl shadow-xs">
                <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-2 space-y-0">
                  <CardTitle className="text-amber-800 dark:text-amber-400 flex items-center gap-2 text-sm sm:text-base font-bold">
                    <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-amber-500 shrink-0" />
                    AI Critique
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0">
                  <p className="text-xs sm:text-sm whitespace-pre-wrap text-amber-950 dark:text-amber-100 leading-relaxed font-medium italic pl-3 border-l-2 border-amber-500/40">
                    &ldquo;Strong opening hook tension and clear breakdown of bilateral leverage. Tighten post 3&apos;s transition to maintain high momentum into the closing question.&rdquo;
                  </p>
                </CardContent>
              </Card>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Main Draft Content */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-border/80 bg-card/45 backdrop-blur-xs shadow-xs rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-border/30 p-4 sm:p-6 pb-4 flex flex-row items-center justify-between gap-3 space-y-0">
                      <div>
                        <CardTitle className="text-lg sm:text-xl font-bold">Draft Posts</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Review the generated thread sequence.</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(!isEditing)}
                          className="rounded-xl border-border hover:bg-violet-600/5 hover:text-violet-600 dark:hover:bg-violet-500/5 dark:hover:text-violet-400 hover:border-violet-500/30 transition-all text-xs font-semibold cursor-pointer"
                        >
                          {isEditing ? "Done Editing" : "Edit Posts"}
                        </Button>
                      </div>
                    </CardHeader>

                    {/* Posts List */}
                    <div className="p-4 sm:p-6 space-y-4">
                      {posts.map((post) => (
                        <div
                          key={post.index}
                          className="group relative overflow-hidden p-3.5 sm:p-5 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-xs transition-all duration-300 flex flex-col space-y-3.5 hover:border-violet-500/30 hover:shadow-xs"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          {/* Top Header Bar */}
                          <div className="flex items-center justify-between gap-2 w-full pb-2 border-b border-border/30">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-linear-to-r from-violet-600/15 to-indigo-600/15 border border-violet-500/30 text-violet-700 dark:text-violet-300 text-xs font-bold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400 animate-pulse" />
                              <span>Post {post.index}</span>
                              <span className="text-muted-foreground/60 font-normal">of 4</span>
                            </div>
                            <span className="text-[11px] font-mono font-medium text-muted-foreground">
                              {post.charCount} / 500 chars
                            </span>
                          </div>

                          {/* Post Content */}
                          <div className="w-full space-y-3">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground pt-0.5">
                              {post.content}
                            </p>

                            {/* Attached Image Preview on Post 2 */}
                            {post.hasMedia && (
                              <div className="relative mt-2 rounded-xl overflow-hidden border border-border/80 max-w-lg bg-muted/20">
                                <div className="h-44 sm:h-52 w-full bg-linear-to-br from-slate-900 via-indigo-950 to-slate-800 flex flex-col justify-end p-4 text-white relative">
                                  <div className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-overlay" />
                                  <div className="relative z-10 space-y-1">
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                                      <ImageIcon className="w-3 h-3 text-cyan-400" />
                                      Source Visual Asset · Reuters Graphics
                                    </div>
                                    <p className="text-xs font-medium text-slate-200">
                                      Container vessel traffic reroutes via Cape of Good Hope (+10 to 14 days transit)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Post AI Critique Directive (Post 1) */}
                          {post.critique && (
                            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs mt-1 space-y-1.5">
                              <span className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-400">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                AI Critique
                              </span>
                              <p className="leading-relaxed font-medium pl-5">{post.critique}</p>
                              {post.fixDirective && (
                                <p className="leading-relaxed font-medium pl-5 text-amber-700/90 dark:text-amber-300/90">
                                  <span className="font-semibold text-amber-900 dark:text-amber-200">
                                    Fix Directive:
                                  </span>{" "}
                                  {post.fixDirective}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-4 sm:space-y-6">
                  {/* Append Source URL Checkbox */}
                  <div className="flex items-start space-x-2.5 p-3 rounded-xl border border-border/60 bg-card/45 backdrop-blur-xs shadow-xs">
                    <Checkbox
                      id="mockup-append-url"
                      checked={appendUrlChecked}
                      onCheckedChange={(checked) => setAppendUrlChecked(!!checked)}
                      className="mt-0.5 cursor-pointer"
                    />
                    <div className="grid gap-1 leading-none min-w-0">
                      <Label
                        htmlFor="mockup-append-url"
                        className="text-xs font-semibold leading-none cursor-pointer text-foreground"
                      >
                        Append source URL on publish
                      </Label>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground/85 truncate max-w-[220px]">
                          China Presses Iran to Rein in Houthi Red Sea Attacks
                        </div>
                        <div className="text-[10px] text-muted-foreground/75 truncate font-mono max-w-[220px]">
                          reuters.com/world/china/china-presses-iran...
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="flex flex-col gap-2.5">
                    <Button
                      className="w-full rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold h-12 shadow-md cursor-pointer"
                      size="lg"
                    >
                      Publish Thread
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300 font-semibold h-11 hover:bg-violet-500/10 cursor-pointer shadow-xs"
                    >
                      <RefreshCw className="mr-2 h-4 w-4 text-violet-500" /> Run Additional Iteration
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-border/80 text-foreground font-semibold h-11 hover:bg-violet-600/5 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="mr-2 h-4 w-4 text-violet-500" /> Regenerate
                    </Button>
                  </div>

                  {/* Virality Sidebar Card */}
                  <Card className="border-border/80 bg-card/45 backdrop-blur-xs shadow-xs hover:border-violet-500/20 transition-all duration-300 rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        Virality Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="space-y-4">
                        <div className="flex items-end justify-between">
                          <span className="text-4xl font-black bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
                            92
                          </span>
                          <span className="text-xs text-muted-foreground pb-1 font-semibold">out of 100</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border/50">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                            style={{ width: "92%" }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                          Excellent virality potential! This thread is highly engaging and ready to perform.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hook Selection Card */}
                  <Card className="border-border/80 bg-card/45 backdrop-blur-xs shadow-xs hover:border-violet-500/20 transition-all duration-300 rounded-2xl">
                    <CardHeader className="p-4 sm:p-5 pb-2.5">
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
                        <Compass className="w-4 h-4 text-violet-500" />
                        Hook Selection
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5 pt-0 space-y-3.5">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                            Active Hook (Post 1)
                          </h4>
                          <span className="text-[10px] text-muted-foreground font-medium select-none">
                            186 chars
                          </span>
                        </div>
                        <p className="text-xs bg-muted/60 p-3 rounded-xl border border-border/60 font-medium text-foreground leading-relaxed">
                          China just gave Iran an ultimatum that could reshape the entire Red Sea conflict—and nobody is talking about the real reason why.
                        </p>
                      </div>

                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => setIsHooksExpanded(!isHooksExpanded)}
                          className="w-full flex items-center justify-between text-xs font-semibold text-violet-700 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200 bg-violet-500/5 hover:bg-violet-500/10 p-2.5 rounded-xl border border-violet-500/20 transition-all cursor-pointer select-none"
                          aria-expanded={isHooksExpanded}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>Other Candidate Hooks</span>
                            <span className="text-[10px] bg-violet-500/20 px-1.5 py-0.5 rounded-full font-bold">
                              {candidateHooks.length}
                            </span>
                          </span>
                          {isHooksExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isHooksExpanded && (
                          <ul className="space-y-2 mt-2.5 animate-in fade-in-50 duration-200">
                            {candidateHooks.map((hook, i) => (
                              <li
                                key={i}
                                className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40 flex flex-col gap-1 leading-relaxed"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                                  <span>{hook}</span>
                                </div>
                                <span className="text-[9px] text-muted-foreground/80 font-medium self-end select-none">
                                  {hook.length} characters
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Secondary Intelligence Dialog Buttons */}
                  <div className="grid grid-cols-1 gap-2.5">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-border/80 text-foreground font-semibold h-11 px-3 text-xs sm:text-sm hover:bg-violet-600/5 hover:text-violet-600 dark:hover:bg-violet-500/5 dark:hover:text-violet-400 hover:border-violet-500/30 transition-all duration-200 cursor-pointer shadow-xs"
                    >
                      <FileText className="w-4 h-4 mr-2 text-violet-500 shrink-0" />
                      View Research Dossier
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-border/80 text-foreground font-semibold h-11 px-3 text-xs sm:text-sm hover:bg-violet-600/5 hover:text-violet-600 dark:hover:bg-violet-500/5 dark:hover:text-violet-400 hover:border-violet-500/30 transition-all duration-200 cursor-pointer shadow-xs"
                    >
                      <Search className="w-4 h-4 mr-2 text-violet-500 shrink-0" />
                      View Search Queries
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
