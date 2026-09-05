"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "@tanstack/react-query";
import { useAction, useQuery } from "convex/react";
import { ArrowLeft, Loader2, Sparkles, AlertCircle, Copy, Check, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { DraftPostsList } from "./components/DraftPostsList";
import { HookSelectionScreen } from "./components/HookSelectionScreen";
import { ImagePickerDialog } from "./components/ImagePickerDialog";
import { VideoPickerDialog } from "./components/VideoPickerDialog";
import { RegenerateDialog } from "./components/RegenerateDialog";
import { SidebarHookCard } from "./components/SidebarHookCard";
import { ViralityCard } from "./components/ViralityCard";
import { ResearchDossierDialog } from "./components/ResearchDossierDialog";
import { SearchQueriesDialog } from "./components/SearchQueriesDialog";

export default function ApproveDraftPage() {
  const params = useParams();
  const id = params.id as Id<"threadDrafts">;
  const router = useRouter();

  const state = useQuery(api.queries.threadsQueries.getThreadDraft, { id });
  const enqueuePublication = useAction(api.actions.threadsActions.enqueueThreadPublication);
  const enqueueRegeneration = useAction(api.actions.threadsActions.enqueueThreadRegeneration);
  const retryGeneration = useAction(api.actions.threadsActions.enqueueThreadRetry);
  const resumeAction = useAction(api.actions.threadsActions.enqueueThreadResume);

  const [isPublishing, setIsPublishing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [selectedHookIdx, setSelectedHookIdx] = useState<number | null>(null);
  const [editedHookText, setEditedHookText] = useState("");
  const [hasInitializedHook, setHasInitializedHook] = useState(false);

  const [isEditingPosts, setIsEditingPosts] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Record<string, string>>({});
  const [activeImagePickerIdx, setActiveImagePickerIdx] = useState<number | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Record<string, string>>({});
  const [activeVideoPickerIdx, setActiveVideoPickerIdx] = useState<number | null>(null);


  const { register, reset, control, getValues } = useForm<{ posts: { content: string }[] }>({
    defaultValues: {
      posts: [],
    }
  });

  useEffect(() => {
    if (state?.thread_draft) {
      reset({ posts: state.thread_draft.map(p => ({ content: p })) });
    }
  }, [state, reset]);

  const handleCancelEditing = () => {
    if (state?.thread_draft) {
      reset({ posts: state.thread_draft.map(p => ({ content: p })) });
    }
    setSelectedImages({});
    setSelectedVideos({});
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
    onError: (err: Error) => {
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
      const currentPosts = (formValues.posts || []).map(p => p.content);

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
            videos: Object.keys(selectedVideos).length > 0 ? selectedVideos : undefined,
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



  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      await retryGeneration({ ids: [id] });
      toast.success("Thread generation retry enqueued!");
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to retry generation: ${err.message || "Unknown error"}`);
    } finally {
      setIsRetrying(false);
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
    return (
      <HookSelectionScreen
        isTopic={state.input_field?.agent === "topic"}
        url={
          state.input_field?.agent === "topic"
            ? state.input_field.topic
            : state.input_field?.url || "Unknown Source"
        }
        coreHooks={state.core_hooks || []}
        selectedHook={state.selected_hook}
        selectedHookIdx={selectedHookIdx}
        editedHookText={editedHookText}
        isResuming={resumeMutation.isPending}
        onSelectHook={handleSelectHook}
        onEditHookTextChange={(text) => {
          setEditedHookText(text);
          setSelectedHookIdx(null);
        }}
        onConfirmHook={handleConfirmHook}
      />
    );
  }

  if (genStatus === "processing" || genStatus === "queued") {
    return (
      <div className="relative min-h-[50vh] flex flex-col items-center justify-center bg-background overflow-hidden p-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[300px] bg-gradient-to-b from-violet-500/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600 dark:text-violet-400" />
          <p className="text-muted-foreground font-semibold animate-pulse">This thread draft is {genStatus === "queued" ? "queued for generation" : "generating"}. Please wait...</p>
        </div>
      </div>
    );
  }

  if (genStatus === "failed") {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden p-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-rose-500/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
        <Card className="max-w-lg w-full border-border/80 bg-card/60 backdrop-blur-md shadow-xl rounded-2xl border-rose-500/20">
          <CardHeader className="space-y-2 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-1">
              <XCircle className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Thread Generation Failed
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              The AI agent pipeline was unable to complete thread creation for this source.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {state.failure_reason && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs font-semibold text-destructive">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Error Diagnostic
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (state.failure_reason) {
                        navigator.clipboard.writeText(state.failure_reason);
                        setHasCopied(true);
                        toast.success("Error copied to clipboard");
                        setTimeout(() => setHasCopied(false), 2000);
                      }
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded-md hover:bg-muted"
                  >
                    {hasCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {hasCopied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-xs font-mono text-muted-foreground break-words leading-relaxed max-h-40 overflow-y-auto pr-1">
                  {state.failure_reason}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full sm:flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-5 shadow-md cursor-pointer transition-all"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Retrying...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" /> Retry Generation
                  </>
                )}
              </Button>
              <Link
                href="/threads/drafts"
                className={`${buttonVariants({ variant: "outline" })} w-full sm:w-auto rounded-xl py-5 font-medium border-border/80 hover:bg-muted/50 cursor-pointer`}
              >
                Drafts List
              </Link>
            </div>
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
              {state.input_field?.agent === "topic" ? (
                <span className="font-medium text-foreground">
                  {state.input_field.topic}
                </span>
              ) : (
                <a
                  href={state.input_field?.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-violet-600 dark:hover:text-violet-400 transition-colors break-all font-medium"
                >
                  {state.input_field?.url || "Unknown Source"}
                </a>
              )}
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
              : state.publication_status === "queued"
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
              : state.publication_status === "publishing"
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse'
                : state.publication_status === "failed"
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                  : state.is_approved
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
              {state.is_published
                ? "Published"
                : state.publication_status === "queued"
                  ? "Queued for Publishing"
                : state.publication_status === "publishing"
                  ? "Publishing..."
                  : state.publication_status === "failed"
                    ? "Publish Failed"
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

        {/* Publication Failure Banner */}
        {state.publication_status === "failed" && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 p-4.5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in-50 duration-300">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  Publication to Meta Threads Failed
                </p>
                <p className="text-xs text-muted-foreground font-mono break-words leading-relaxed">
                  {state.publication_error || "The Threads API rejected the publishing request. Please verify your Threads connection, permissions, or image URLs."}
                </p>
              </div>
            </div>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              size="sm"
              className="shrink-0 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-sm cursor-pointer"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Publishing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry Publication
                </>
              )}
            </Button>
          </div>
        )}

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
                        disabled={isPublishing || isRegenerating}
                        onClick={() => setIsEditingPosts(false)}
                        className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-4 shadow-sm cursor-pointer"
                      >
                        Keep Edits
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPublishing || isRegenerating}
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
              <DraftPostsList
                posts={state.thread_draft}
                isEditingPosts={isEditingPosts}
                register={register}
                control={control}
                selectedImages={selectedImages}
                selectedVideos={selectedVideos}
                postCritiques={state.post_critiques}
                onAttachImage={(index) => setActiveImagePickerIdx(index)}
                onRemoveImage={(index) => {
                  setSelectedImages(prev => {
                    const updated = { ...prev };
                    delete updated[index.toString()];
                    return updated;
                  });
                }}
                onAttachVideo={(index) => setActiveVideoPickerIdx(index)}
                onRemoveVideo={(index) => {
                  setSelectedVideos(prev => {
                    const updated = { ...prev };
                    delete updated[index.toString()];
                    return updated;
                  });
                }}
              />
            </Card>
          </div>

          {/* Sidebar controls */}
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <Button
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold py-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                size="lg"
                disabled={isPublishing || isRegenerating || state.is_published || state.publication_status === "publishing" || state.publication_status === "queued"}
                onClick={handlePublish}
              >
                {isPublishing || state.publication_status === "publishing" || state.publication_status === "queued" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {state.publication_status === "queued" ? "Queued..." : "Publishing..."}
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
                disabled={isPublishing || isRegenerating || state.is_published || state.publication_status === "publishing" || state.publication_status === "queued" || state.generation_status === "processing" || state.generation_status === "queued"}
                onClick={() => {
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
              <ViralityCard score={state.virality_score} />
            )}

            {/* Hook Selection Card */}
            <SidebarHookCard
              selectedHook={state.selected_hook}
              coreHooks={state.core_hooks || []}
            />

            {/* Research Dossier Dialog */}
            {state.research_context && (
              <ResearchDossierDialog researchContext={state.research_context} />
            )}

            {/* Search Queries Dialog */}
            {state.search_queries && (
              <SearchQueriesDialog searchQueries={state.search_queries} />
            )}

          </div>
        </div>
      </div>

      {/* Guidance Regeneration Dialog Modal */}
      <RegenerateDialog
        isOpen={isDialogOpen}
        initialGuidance={state?.guidance || ""}
        initialManualHookSelection={state?.manual_hook_selection || false}
        initialSearchQueryGeneration={state?.search_query_generation || false}
        isRegenerating={isRegenerating}
        onClose={() => setIsDialogOpen(false)}
        onRegenerate={async (guidance, manualHook, searchQueryGeneration) => {
          try {
            setIsRegenerating(true);
            setIsDialogOpen(false);
            await enqueueRegeneration({
              ids: [id],
              guidance: guidance.trim() || undefined,
              manual_hook_selection: manualHook,
              search_query_generation: searchQueryGeneration,
            });
            toast.success("Regeneration queued! The thread is being regenerated.");
            router.push("/threads/drafts");
          } catch (e: any) {
            console.error(e);
            toast.error(`Failed to regenerate: ${e.message || "Unknown error"}`);
          } finally {
            setIsRegenerating(false);
          }
        }}
      />

      {/* Select Post Image Dialog Modal */}
      <ImagePickerDialog
        activeImagePickerIdx={activeImagePickerIdx}
        images={state.images}
        selectedImages={selectedImages}
        onSelectImage={(index, url) => {
          setSelectedImages(prev => ({
            ...prev,
            [index.toString()]: url
          }));
        }}
        onDeselectImage={(index) => {
          setSelectedImages(prev => {
            const updated = { ...prev };
            delete updated[index.toString()];
            return updated;
          });
        }}
        onClose={() => setActiveImagePickerIdx(null)}
      />

      {/* Select Post Video Dialog Modal */}
      <VideoPickerDialog
        activeVideoPickerIdx={activeVideoPickerIdx}
        selectedVideos={selectedVideos}
        onSelectVideo={(index, url) => {
          setSelectedVideos(prev => ({
            ...prev,
            [index.toString()]: url
          }));
        }}
        onDeselectVideo={(index) => {
          setSelectedVideos(prev => {
            const updated = { ...prev };
            delete updated[index.toString()];
            return updated;
          });
        }}
        onClose={() => setActiveVideoPickerIdx(null)}
      />
    </div>
  );
}
