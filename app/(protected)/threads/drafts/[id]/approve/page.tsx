"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, Sparkles, Trophy, Compass, ArrowLeft, CheckCircle2, Image as ImageIcon, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

function getImageQualityInfo(url: string) {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLowerCase();
    const search = parsedUrl.search.toLowerCase();
    
    // File type detection
    let type = "Image";
    if (pathname.endsWith(".png")) type = "PNG";
    else if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) type = "JPEG";
    else if (pathname.endsWith(".gif")) type = "GIF";
    else if (pathname.endsWith(".webp")) type = "WebP";
    else if (pathname.endsWith(".svg")) type = "SVG Vector";
    
    // Quality estimation heuristic
    let resolution = "Standard";
    let score: "High" | "Medium" | "Low" = "Medium";
    
    if (type === "SVG Vector") {
      resolution = "Scalable Vector Graphics (Lossless)";
      score = "High";
    } else if (
      pathname.includes("thumb") ||
      pathname.includes("preview") ||
      search.includes("thumb") ||
      /icon|avatar/i.test(pathname) ||
      /\b(w|h|width|height)[=_-]([1-9]\d|[1-2]\d\d)\b/i.test(url)
    ) {
      resolution = "Low Resolution (Thumbnail/Preview)";
      score = "Low";
    } else if (
      pathname.includes("large") ||
      pathname.includes("full") ||
      pathname.includes("original") ||
      search.includes("large") ||
      search.includes("full") ||
      search.includes("original") ||
      /\b(w|h|width|height)[=_-]([8-9]\d\d|1\d\d\d|2\d\d\d)\b/i.test(url) ||
      pathname.includes("1080") ||
      pathname.includes("2048") ||
      pathname.includes("4k")
    ) {
      resolution = "High Resolution (HD/Large)";
      score = "High";
    } else {
      resolution = "Standard Resolution";
      score = "Medium";
    }
    
    const host = parsedUrl.hostname;
    
    return {
      type,
      resolution,
      score,
      host
    };
  } catch (e) {
    return {
      type: "Image",
      resolution: "Unknown Resolution",
      score: "Unknown" as const,
      host: "External Domain"
    };
  }
}

export default function ApproveDraftPage() {
  const params = useParams();
  const id = params.id as Id<"threadDrafts">;
  const router = useRouter();

  const state = useQuery(api.queries.threadsQueries.getThreadDraft, { id });
  const enqueuePublication = useAction(api.actions.threadsActions.enqueueThreadPublication);
  const enqueueRegeneration = useAction(api.actions.threadsActions.enqueueThreadRegeneration);
  const resumeAction = useAction(api.actions.threadsActions.enqueueNewsThreadResume);

  const [isPublishing, setIsPublishing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newGuidance, setNewGuidance] = useState("");
  const [manualHookSelection, setManualHookSelection] = useState(false);

  const [selectedHookIdx, setSelectedHookIdx] = useState<number | null>(null);
  const [editedHookText, setEditedHookText] = useState("");
  const [hasInitializedHook, setHasInitializedHook] = useState(false);

  const [isEditingPosts, setIsEditingPosts] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Record<string, string>>({});
  const [activeImagePickerIdx, setActiveImagePickerIdx] = useState<number | null>(null);

  const { register, reset, watch, getValues } = useForm<{ posts: string[] }>({
    defaultValues: {
      posts: [],
    }
  });

  useEffect(() => {
    if (state?.thread_draft) {
      reset({ posts: state.thread_draft });
    }
  }, [state, reset]);

  const handleCancelEditing = () => {
    if (state?.thread_draft) {
      reset({ posts: state.thread_draft });
    }
    setSelectedImages({});
    setIsEditingPosts(false);
  };

  const genStatus = state?.generation_status ?? "success";

  useEffect(() => {
    if (state && genStatus === "hook selection" && !hasInitializedHook) {
      const hooks = state.core_hooks || [];
      const dbSelectedHook = state.selected_hook;
      
      let matchedIdx = -1;
      if (dbSelectedHook) {
        matchedIdx = hooks.indexOf(dbSelectedHook);
      }
      
      if (matchedIdx !== -1) {
        setSelectedHookIdx(matchedIdx);
        setEditedHookText(dbSelectedHook);
      } else if (dbSelectedHook) {
        setSelectedHookIdx(null);
        setEditedHookText(dbSelectedHook);
      } else if (hooks.length > 0) {
        setSelectedHookIdx(0);
        setEditedHookText(hooks[0]);
      }
      setHasInitializedHook(true);
    }
  }, [state, genStatus, hasInitializedHook]);

  const handleSelectHook = (index: number, text: string) => {
    setSelectedHookIdx(index);
    setEditedHookText(text);
  };

  const resumeMutation = useMutation({
    mutationFn: async ({ recordId, selected_hook }: { recordId: Id<"threadDrafts">; selected_hook: string }) => {
      return await resumeAction({ recordId, selected_hook });
    },
    onSuccess: () => {
      toast.success("Generation resumed! The thread draft is being generated.");
      router.push("/threads/drafts");
    },
    onError: (err: any) => {
      console.error("Failed to resume generation:", err);
      toast.error(`Failed to resume: ${err.message || "Unknown error"}`);
    }
  });

  const handleConfirmHook = async () => {
    if (!editedHookText.trim()) {
      toast.error("Please enter or select a hook");
      return;
    }
    resumeMutation.mutate({
      recordId: id,
      selected_hook: editedHookText.trim()
    });
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true);

      const formValues = getValues();
      const currentPosts = formValues.posts || [];

      // Validate 500-character limit
      const tooLongIndex = currentPosts.findIndex(p => p.length > 500);
      if (tooLongIndex !== -1) {
        toast.error(`Post ${tooLongIndex + 1} exceeds the 500 character limit! Please shorten it.`);
        setIsPublishing(false);
        return;
      }

      // Determine if modified
      let isModified = false;
      if (state && state.thread_draft) {
        if (currentPosts.length !== state.thread_draft.length) {
          isModified = true;
        } else {
          for (let i = 0; i < currentPosts.length; i++) {
            if (currentPosts[i] !== state.thread_draft[i]) {
              isModified = true;
              break;
            }
          }
        }
      }

      await enqueuePublication({
        requests: [
          {
            id,
            modified_thread: isModified ? currentPosts : undefined,
            images: Object.keys(selectedImages).length > 0 ? selectedImages : undefined,
          }
        ]
      });

      toast.success("Publication queued! The thread is being published to Threads.");
      setIsEditingPosts(false);
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
        guidance: newGuidance.trim() || undefined,
        manual_hook_selection: manualHookSelection,
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

  if (genStatus === "hook selection") {
    const hooks = state.core_hooks || [];
    return (
      <div className="relative min-h-screen bg-background overflow-hidden">
        {/* Background Mesh Decorative Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-gradient-to-b from-violet-500/5 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="container max-w-4xl mx-auto py-12 px-4 space-y-8">
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
          <div className="space-y-2 border-b border-border/30 pb-6">
            <h1 className="text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
                Choose Your Hook
              </span>
            </h1>
            <p className="text-sm text-muted-foreground break-all">
              Pipeline paused for:{" "}
              <a 
                href={state.url} 
                target="_blank" 
                rel="noreferrer" 
                className="underline hover:text-violet-600 dark:hover:text-violet-400 transition-colors break-all font-medium"
              >
                {state.url}
              </a>
            </p>
          </div>

          <div className="space-y-8">
            {/* Candidate Hooks Grid */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                Candidate Hooks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hooks.map((hook, index) => {
                  const isSelected = selectedHookIdx === index;
                  return (
                    <div
                      key={index}
                      onClick={() => handleSelectHook(index, hook)}
                      className={`group relative overflow-hidden p-5 rounded-xl border transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? "border-violet-500 bg-violet-500/5 shadow-md animate-in fade-in duration-200"
                          : "border-border/80 bg-card/40 backdrop-blur-xs hover:border-violet-500/30 hover:bg-muted/10"
                      }`}
                    >
                      <div className="flex gap-4 items-start">
                        <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-black shadow-xs select-none transition-colors ${
                          isSelected
                            ? "bg-violet-600 text-white"
                            : "bg-muted text-muted-foreground group-hover:bg-violet-100 group-hover:text-violet-800 dark:group-hover:bg-violet-950 dark:group-hover:text-violet-300"
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm leading-relaxed text-foreground font-medium flex-1">
                              {hook}
                            </p>
                            {state.selected_hook === hook && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400 border border-violet-500/20 shadow-xs uppercase tracking-wider select-none shrink-0 mt-0.5 animate-pulse">
                                Selected
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-medium block pt-2 select-none ${
                            hook.length > 500 ? "text-destructive font-semibold" : "text-muted-foreground"
                          }`}>
                            {hook.length} character{hook.length !== 1 ? 's' : ''} {hook.length > 500 && "(Exceeds 500 limit)"}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-violet-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
                {hooks.length === 0 && (
                  <Card className="col-span-full border-dashed border-border/80 bg-muted/5 p-8 text-center rounded-2xl">
                    <p className="text-sm text-muted-foreground italic">No candidate hooks found for this source.</p>
                  </Card>
                )}
              </div>
            </div>

            {/* Customizer & Action Card */}
            <Card className="border-border/80 bg-card/45 backdrop-blur-xs shadow-xs rounded-2xl overflow-hidden w-full">
              <CardHeader className="pb-3 border-b border-border/30">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground/90">
                  <Compass className="w-5 h-5 text-violet-500" />
                  Customize and Confirm Hook
                </CardTitle>
                <CardDescription>
                  Refine the selected hook text below to dictate the exact angle for the thread.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Hook Text
                  </label>
                  <textarea
                    value={editedHookText}
                    onChange={(e) => {
                      setEditedHookText(e.target.value);
                      setSelectedHookIdx(null); // Deselect cards if user types manually
                    }}
                    placeholder="Select a hook card or type a custom one..."
                    rows={8}
                    className="w-full text-base bg-muted/40 text-foreground p-5 rounded-xl border border-border focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 focus:outline-none resize-y leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                    <span className={editedHookText.length > 500 ? "text-destructive font-bold animate-pulse" : "font-medium"}>
                      {editedHookText.length} / 500 characters
                    </span>
                    {editedHookText.length > 500 ? (
                      <span className="text-destructive font-bold">Exceeds Threads limit (500)</span>
                    ) : (
                      <span>{500 - editedHookText.length} remaining</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleConfirmHook}
                    disabled={resumeMutation.isPending || !editedHookText.trim()}
                    className="w-full sm:w-auto sm:min-w-[280px] rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold py-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                    size="lg"
                  >
                    {resumeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Drafting Thread...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 text-white" /> Confirm & Draft Thread
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
              <CardHeader className="border-b border-border/30 pb-4 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-xl font-bold">Draft Posts</CardTitle>
                  <CardDescription>Review the generated thread sequence.</CardDescription>
                </div>
                {state.thread_draft && state.thread_draft.length > 0 && (
                  <div className="flex items-center gap-2">
                    {isEditingPosts && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setIsEditingPosts(false)}
                        className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-4 shadow-sm cursor-pointer"
                      >
                        Keep Edits
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (isEditingPosts) {
                          handleCancelEditing();
                        } else {
                          setIsEditingPosts(true);
                        }
                      }}
                      className="rounded-xl border-border hover:bg-violet-600/5 hover:text-violet-600 dark:hover:bg-violet-500/5 dark:hover:text-violet-400 hover:border-violet-500/30 transition-all duration-200 cursor-pointer"
                    >
                      {isEditingPosts ? "Discard" : "Edit Posts"}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {state.thread_draft.map((post, index) => {
                  const postCritique = state.post_critiques?.find((pc) => pc.post_index === index + 1);
                  
                  // react-hook-form watch values for live character count
                  const postName = `posts.${index}` as const;
                  const watchedValue = watch(postName) ?? post;
                  const charCount = watchedValue.length;

                  return (
                    <div 
                      key={index} 
                      className={`group relative overflow-hidden p-6 rounded-xl border transition-all duration-300 flex flex-col justify-between min-h-[120px] ${
                        isEditingPosts 
                          ? "border-violet-500 bg-violet-500/5 shadow-md animate-in fade-in duration-200" 
                          : "border-border/80 bg-card/40 backdrop-blur-xs hover:border-violet-500/30 hover:shadow-md"
                      }`}
                    >
                      <div className="absolute top-0 left-0 w-[4px] h-full bg-gradient-to-b from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="flex gap-4 items-start w-full">
                        <span className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shadow-md select-none mt-0.5">
                          {index + 1}
                        </span>
                        
                        {isEditingPosts ? (
                          <div className="flex-1 space-y-2">
                            <textarea
                              {...register(`posts.${index}` as any)}
                              rows={4}
                              className="w-full text-sm bg-background border border-border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none rounded-lg p-3.5 resize-y leading-relaxed"
                            />
                            {/* Selected image or Add Image button in edit mode */}
                            {selectedImages[index.toString()] ? (
                              <div className="relative mt-3 rounded-xl overflow-hidden border border-border/80 group/image max-w-md bg-muted/20 animate-in fade-in duration-200">
                                <img 
                                  src={selectedImages[index.toString()]} 
                                  alt={`Post ${index + 1} image`} 
                                  className="w-full h-auto max-h-60 object-cover" 
                                />
                                <div className="absolute top-2 right-2 flex gap-2">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setActiveImagePickerIdx(index)}
                                    className="rounded-lg h-8 px-2.5 bg-background/80 hover:bg-background backdrop-blur-xs text-xs font-semibold shadow-xs"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5 mr-1" />
                                    Change
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedImages(prev => {
                                        const updated = { ...prev };
                                        delete updated[index.toString()];
                                        return updated;
                                      });
                                    }}
                                    className="rounded-lg h-8 w-8 p-0 bg-red-600/90 hover:bg-red-600 backdrop-blur-xs shadow-xs"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              (state?.images && state.images.length > 0) && (
                                <div className="mt-3">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActiveImagePickerIdx(index)}
                                    className="rounded-lg border-dashed border-border hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/5 transition-all duration-200"
                                  >
                                    <ImageIcon className="w-4 h-4 mr-1.5 text-violet-500" />
                                    Attach Image
                                  </Button>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 space-y-2">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground flex-1 pt-0.5">{watchedValue}</p>
                            {/* Selected image preview in non-edit mode */}
                            {selectedImages[index.toString()] && (
                              <div className="relative mt-3 rounded-xl overflow-hidden border border-border/80 max-w-md bg-muted/20">
                                <img 
                                  src={selectedImages[index.toString()]} 
                                  alt={`Post ${index + 1} image`} 
                                  className="w-full h-auto max-h-60 object-cover" 
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {postCritique?.critique?.trim() && !isEditingPosts && (
                        <div className="mt-4 p-4.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                          <span className="font-bold flex items-center gap-1.5 mb-1.5 text-amber-900 dark:text-amber-400">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Post Critique:
                          </span>
                          <p className="leading-relaxed font-medium">{postCritique.critique}</p>
                        </div>
                      )}
                      
                      <div className="mt-5 pt-3 border-t border-border/40 flex justify-between items-center text-xs text-muted-foreground select-none">
                        <span className={`font-medium ${charCount > 500 ? "text-destructive font-bold" : ""}`}>
                          {charCount} character{charCount !== 1 ? 's' : ''}
                        </span>
                        {charCount > 500 ? (
                          <span className="text-destructive font-semibold">Exceeds Threads limit (500)</span>
                        ) : (
                          <span className="font-medium">{500 - charCount} remaining</span>
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
                  setNewGuidance(state?.guidance || "");
                  setManualHookSelection(state?.manual_hook_selection || false);
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
                  {state.selected_hook && (
                    <span className="text-[10px] text-muted-foreground font-medium block pt-1 select-none text-right">
                      {state.selected_hook.length} characters
                    </span>
                  )}
                </div>
                {state.core_hooks.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 select-none">Other Hooks Considered</h4>
                    <ul className="space-y-2">
                      {state.core_hooks.map((hook, i) => (
                        <li key={i} className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40 flex flex-col gap-1 leading-relaxed">
                          <div className="flex items-start gap-2">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                            <span>{hook}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground/80 font-medium self-end select-none">
                            {hook.length} characters
                          </span>
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

              {/* Choose Hooks Manually Checkbox */}
              <div className="flex items-start space-x-3 pt-2 bg-muted/10 p-3.5 rounded-xl border border-border/30">
                <Checkbox
                  id="manual-hook-regenerate"
                  checked={manualHookSelection}
                  onCheckedChange={(checked) => setManualHookSelection(!!checked)}
                  disabled={isRegenerating}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="manual-hook-regenerate"
                    className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-75 cursor-pointer text-foreground"
                  >
                    Choose hooks manually
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Pause the generation pipeline to choose and edit your hook before generating the full thread.
                  </p>
                </div>
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

      {/* Select Post Image Dialog Modal */}
      {activeImagePickerIdx !== null && state?.images && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl overflow-hidden border border-border/80 bg-card/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 space-y-6 flex flex-col max-h-[85vh]">
            <div className="space-y-2 flex-shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <ImageIcon className="w-5 h-5 text-violet-500" />
                Select Image for Post {activeImagePickerIdx + 1}
              </h2>
              <p className="text-xs text-muted-foreground">
                Choose an image extracted from the source URL. Quality metrics and source domain details are listed below.
              </p>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {state.images.map((url, idx) => {
                  const quality = getImageQualityInfo(url);
                  const isSelected = selectedImages[activeImagePickerIdx.toString()] === url;
                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setSelectedImages(prev => ({
                          ...prev,
                          [activeImagePickerIdx.toString()]: url
                        }));
                        setActiveImagePickerIdx(null);
                      }}
                      className={`group relative overflow-hidden rounded-xl border p-3 flex flex-col justify-between gap-3 cursor-pointer transition-all duration-300 hover:shadow-md ${
                        isSelected 
                          ? "border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/50" 
                          : "border-border/60 bg-muted/20 hover:border-violet-500/30 hover:bg-muted/40"
                      }`}
                    >
                      <div className="aspect-video w-full rounded-lg overflow-hidden border border-border/40 bg-black/5 dark:bg-white/5 flex items-center justify-center relative">
                        <img 
                          src={url} 
                          alt={`scraped image ${idx + 1}`} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-violet-600/10 backdrop-blur-xs flex items-center justify-center">
                            <span className="bg-violet-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider animate-in zoom-in duration-200">
                              Selected
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 text-xs flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground/90">{quality.type} format</span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                              quality.score === "High" 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                : quality.score === "Medium"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            }`}>
                              {quality.score} Quality
                            </span>
                          </div>
                          <p className="text-muted-foreground font-medium truncate">{quality.resolution}</p>
                        </div>

                        <div className="pt-2 border-t border-border/40 flex justify-between items-center text-[10px] text-muted-foreground">
                          <span className="truncate max-w-[120px] font-mono">{quality.host}</span>
                          <Button
                            type="button"
                            variant={isSelected ? "secondary" : "default"}
                            size="xs"
                            className="h-7 rounded-lg text-[11px] px-3 font-semibold pointer-events-none"
                          >
                            {isSelected ? "Active" : "Choose"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/30 flex-shrink-0">
              {selectedImages[activeImagePickerIdx.toString()] && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedImages(prev => {
                      const updated = { ...prev };
                      delete updated[activeImagePickerIdx.toString()];
                      return updated;
                    });
                    setActiveImagePickerIdx(null);
                  }}
                  className="rounded-xl border-red-500/30 text-red-600 hover:bg-red-500/5 hover:border-red-500/50 px-5 mr-auto font-semibold"
                >
                  Deselect Image
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setActiveImagePickerIdx(null)}
                className="rounded-xl border-border px-5"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
