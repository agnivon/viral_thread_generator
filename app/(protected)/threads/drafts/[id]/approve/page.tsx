"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, Sparkles, Trophy, Compass, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export default function ApproveDraftPage() {
  const params = useParams();
  const id = params.id as Id<"threadDrafts">;
  const router = useRouter();

  const state = useQuery(api.queries.threadsQueries.getThreadDraft, { id });
  const enqueuePublication = useAction(api.actions.threadsActions.enqueueThreadPublication);
  const enqueueRegeneration = useAction(api.actions.threadsActions.enqueueThreadRegeneration);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newGuidance, setNewGuidance] = useState("");

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      await enqueuePublication({ ids: [id] });
      toast.success("Publication queued! The thread is being published to Threads.");
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to publish: ${e.message || "Unknown error"}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true);
      setIsDialogOpen(false);
      await enqueueRegeneration({ 
        ids: [id], 
        guidance: newGuidance.trim() || undefined 
      });
      toast.success("Regeneration queued! The thread is being regenerated.");
      router.push("/threads/drafts");
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to regenerate: ${e.message || "Unknown error"}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (state === undefined) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden p-4">
        {/* Background Mesh Decorative Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-violet-500/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600 dark:text-violet-400" />
          <p className="text-muted-foreground font-semibold animate-pulse">Loading thread draft...</p>
        </div>
      </div>
    );
  }

  if (state === null) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden p-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-violet-500/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
        <Card className="max-w-md w-full border-border/80 bg-card/45 backdrop-blur-xs shadow-xs rounded-2xl">
          <CardHeader>
            <CardTitle className="text-destructive font-black">Draft Not Found</CardTitle>
            <CardDescription>We couldn't find the requested thread draft.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/threads/create" 
              className={`${buttonVariants({ className: "w-full" })} rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-6 shadow-md hover:shadow-lg transition-all duration-300`}
            >
              Create a New Thread
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const genStatus = state.generation_status ?? "success";

  if (genStatus === "processing") {
    return (
      <div className="relative min-h-[50vh] flex flex-col items-center justify-center bg-background overflow-hidden p-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[300px] bg-gradient-to-b from-violet-500/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600 dark:text-violet-400" />
          <p className="text-muted-foreground font-semibold animate-pulse">This thread draft is still generating. Please wait...</p>
        </div>
      </div>
    );
  }

  if (genStatus === "failed") {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden p-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-violet-500/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
        <Card className="max-w-md w-full border-border/80 bg-card/45 backdrop-blur-xs shadow-xs rounded-2xl">
          <CardHeader>
            <CardTitle className="text-destructive font-black">Generation Failed</CardTitle>
            <CardDescription>We encountered an error while generating this thread.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can try generating a new thread from the dashboard.
            </p>
            <Link 
              href="/threads/create" 
              className={`${buttonVariants({ className: "w-full" })} rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-6 shadow-md hover:shadow-lg transition-all duration-300`}
            >
              Create a New Thread
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background Mesh Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-gradient-to-b from-violet-500/5 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="container max-w-5xl mx-auto py-12 px-4 space-y-8">
        {/* Navigation Link */}
        <div className="flex items-center gap-2">
          <Link 
            href="/threads/drafts" 
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Drafts
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-border/30 pb-6">
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
                Review Thread Draft
              </span>
            </h1>
            <p className="text-sm text-muted-foreground break-all">
              Generated from:{" "}
              <a 
                href={state.url} 
                target="_blank" 
                rel="noreferrer" 
                className="underline hover:text-violet-600 dark:hover:text-violet-400 transition-colors break-all font-medium"
              >
                {state.url}
              </a>
            </p>
            {state.guidance && (
              <div className="mt-2.5">
                <p className="text-xs text-muted-foreground bg-muted/60 px-3.5 py-2 rounded-xl border border-border/40 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  <span className="font-semibold text-foreground">Guidance:</span> {state.guidance}
                </p>
              </div>
            )}
          </div>
          
          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-start pt-1">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-xs ${state.is_published
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                : state.publication_status === "publishing"
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse'
                  : state.is_approved
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
              {state.is_published
                ? "Published"
                : state.publication_status === "publishing"
                  ? "Publishing..."
                  : state.is_approved
                    ? "Approved"
                    : "Pending Review"}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground whitespace-nowrap border border-border/50 shadow-xs">
              {state.iterations} Iteration{state.iterations !== 1 ? 's' : ''}
            </span>
            {state.virality_score !== undefined && (
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-xs ${state.virality_score >= 85
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : state.virality_score >= 70
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                }`}>
                Virality: {state.virality_score}/100
              </span>
            )}
          </div>
        </div>

        {/* AI Critique card */}
        {state.critique?.trim() && (
          <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-xs rounded-2xl shadow-xs hover:border-amber-500/30 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-800 dark:text-amber-400 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                AI Critique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-amber-950 dark:text-amber-100 leading-relaxed font-medium italic pl-3 border-l-2 border-amber-500/40">
                "{state.critique}"
              </p>
            </CardContent>
          </Card>
        )}

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Draft Content */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-border/80 bg-card/45 backdrop-blur-xs shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/30 pb-4">
                <CardTitle className="text-xl font-bold">Draft Posts</CardTitle>
                <CardDescription>Review the generated thread sequence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {state.thread_draft.map((post, index) => {
                  const postCritique = state.post_critiques?.find((pc) => pc.post_index === index + 1);
                  return (
                    <div 
                      key={index} 
                      className="group relative overflow-hidden p-6 rounded-xl border border-border/80 bg-card/40 backdrop-blur-xs hover:border-violet-500/30 hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[120px]"
                    >
                      <div className="absolute top-0 left-0 w-[4px] h-full bg-gradient-to-b from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="flex gap-4 items-start">
                        <span className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shadow-md select-none">
                          {index + 1}
                        </span>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground flex-1 pt-0.5">{post}</p>
                      </div>
                      
                      {postCritique?.critique?.trim() && (
                        <div className="mt-4 p-4.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                          <span className="font-bold flex items-center gap-1.5 mb-1.5 text-amber-900 dark:text-amber-400">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Post Critique:
                          </span>
                          <p className="leading-relaxed font-medium">{postCritique.critique}</p>
                        </div>
                      )}
                      
                      <div className="mt-5 pt-3 border-t border-border/40 flex justify-between items-center text-xs text-muted-foreground select-none">
                        <span className="font-medium">{post.length} character{post.length !== 1 ? 's' : ''}</span>
                        {post.length > 500 ? (
                          <span className="text-destructive font-semibold">Exceeds Threads limit (500)</span>
                        ) : (
                          <span className="font-medium">{500 - post.length} remaining</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {state.thread_draft.length === 0 && (
                  <p className="text-muted-foreground italic text-center py-6">No draft content generated yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar controls */}
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <Button
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold py-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                size="lg"
                disabled={isPublishing || isRegenerating || state.is_published || state.publication_status === "publishing"}
                onClick={handlePublish}
              >
                {isPublishing || state.publication_status === "publishing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...
                  </>
                ) : state.is_published ? (
                  "Published"
                ) : (
                  "Publish Thread"
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl border-border/80 text-foreground font-bold py-6 hover:bg-violet-600/5 hover:text-violet-600 dark:hover:bg-violet-500/5 dark:hover:text-violet-400 hover:border-violet-500/30 transition-all duration-300 cursor-pointer"
                size="lg"
                disabled={isPublishing || isRegenerating || state.is_published || state.publication_status === "publishing"}
                onClick={() => {
                  setNewGuidance(state.guidance || "");
                  setIsDialogOpen(true);
                }}
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin mr-2" /> Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 text-violet-500" /> Regenerate
                  </>
                )}
              </Button>
            </div>

            {/* Virality Sidebar Card */}
            {state.virality_score !== undefined && (
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
                      <span className="text-4xl font-black text-foreground bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
                        {state.virality_score}
                      </span>
                      <span className="text-xs text-muted-foreground pb-1 font-semibold">out of 100</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${state.virality_score >= 85
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : state.virality_score >= 70
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                              : 'bg-gradient-to-r from-rose-500 to-red-500'
                          }`}
                        style={{ width: `${state.virality_score}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                      {state.virality_score >= 85
                        ? "Excellent virality potential! This thread is highly engaging and ready to perform."
                        : state.virality_score >= 70
                          ? "Good potential. Meets baseline engagement criteria but could be tweaked."
                          : "Low potential. Consider reviewing recommendations or generating a new thread."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hook Selection Card */}
            <Card className="border-border/80 bg-card/45 backdrop-blur-xs shadow-xs hover:border-violet-500/20 transition-all duration-300 rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
                  <Compass className="w-4 h-4 text-violet-500" />
                  Hook Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-1">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 select-none">Selected Hook</h4>
                  <p className="text-xs bg-muted/60 p-3.5 rounded-xl border border-border/60 font-medium text-foreground leading-relaxed">
                    {state.selected_hook || "None selected"}
                  </p>
                </div>
                {state.core_hooks.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 select-none">Other Hooks Considered</h4>
                    <ul className="space-y-2">
                      {state.core_hooks.map((hook, i) => (
                        <li key={i} className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40 flex items-start gap-2 leading-relaxed">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                          <span>{hook}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Custom Dialog Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden border border-border/80 bg-card/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="w-5 h-5 text-violet-500" />
                Regenerate Thread
              </h2>
              <p className="text-xs text-muted-foreground">
                Input or modify the existing guidance to direct the AI thread generator.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Generation Guidance
                </label>
                <textarea
                  value={newGuidance}
                  onChange={(e) => setNewGuidance(e.target.value)}
                  placeholder="e.g. Focus on hooks, explain the technical strategy step-by-step, use bullet points..."
                  rows={4}
                  className="w-full text-sm bg-muted/40 text-foreground p-3.5 rounded-xl border border-border focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isRegenerating}
                className="rounded-xl border-border px-5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold px-6 shadow-md hover:shadow-lg transition-all duration-300"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Regenerating...
                  </>
                ) : (
                  "Submit & Regenerate"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
