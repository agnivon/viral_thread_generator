"use client";

import { useState } from "react";
import { usePaginatedQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UpdateIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  FileTextIcon,
  ExternalLinkIcon,
  TrashIcon,
  ClockIcon
} from "@radix-ui/react-icons";

export default function DraftsPage() {
  const { results: drafts, status, loadMore } = usePaginatedQuery(
    api.queries.threadsQueries.getPaginatedThreadDrafts,
    {},
    { initialNumItems: 10 }
  );

  const enqueuePublication = useAction(api.actions.threadsActions.enqueueThreadPublication);
  const deleteDraft = useAction(api.actions.threadsActions.deleteThreadDraft);
  const retryGeneration = useAction(api.actions.threadsActions.enqueueThreadRetry);

  const [selectedDrafts, setSelectedDrafts] = useState<Set<Id<"threadDrafts">>>(new Set());
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Set<Id<"threadDrafts">>>(new Set());

  const handleRetry = async (id: Id<"threadDrafts">) => {
    try {
      setRetryingIds(prev => new Set(prev).add(id));
      await retryGeneration({ ids: [id] });
      toast.success("Generation retry enqueued!");
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to retry generation: ${err.message || "Unknown error"}`);
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleSelection = (id: Id<"threadDrafts">) => {
    const newSelection = new Set(selectedDrafts);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedDrafts(newSelection);
  };

  const publishableDraftsCount = Array.from(selectedDrafts).filter(id => {
    const d = drafts.find(draft => draft._id === id);
    return d && !d.is_published && d.publication_status !== "publishing" && d.publication_status !== "queued" && (d.generation_status ?? "success") === "success";
  }).length;

  const toggleAll = () => {
    if (selectedDrafts.size === drafts.length && drafts.length > 0) {
      setSelectedDrafts(new Set());
    } else {
      setSelectedDrafts(new Set(drafts.map(d => d._id)));
    }
  };

  const handleBulkPublish = async () => {
    const validIds = Array.from(selectedDrafts).filter(id => {
      const draft = drafts.find(d => d._id === id);
      return draft && !draft.is_published && draft.publication_status !== "publishing" && draft.publication_status !== "queued" && (draft.generation_status ?? "success") === "success";
    });

    if (validIds.length === 0) {
      toast.error("None of the selected drafts are eligible for publishing.");
      return;
    }

    try {
      setIsPublishing(true);
      await enqueuePublication({ requests: validIds.map(id => ({ id })) });
      toast.success(`Publication queued for ${validIds.length} threads!`);
      setSelectedDrafts(new Set());
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to publish: ${err.message || "Unknown error"}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDrafts.size === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the ${selectedDrafts.size} selected thread draft(s)?`
    );
    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      const idsToDelete = Array.from(selectedDrafts);

      await Promise.all(
        idsToDelete.map((id) => deleteDraft({ id }))
      );

      toast.success(`Successfully deleted ${idsToDelete.length} thread draft(s).`);
      setSelectedDrafts(new Set());
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to delete: ${err.message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isLoadingInitial = status === "LoadingFirstPage";

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/30 pb-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
              Thread Drafts
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage, evaluate, and publish your generated thread sequences.
          </p>
        </div>
        {selectedDrafts.size > 0 && (
          <div className="flex items-center gap-3">
            <Button
              onClick={handleBulkPublish}
              disabled={isPublishing || isDeleting || publishableDraftsCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer disabled:opacity-50"
            >
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Publish ({publishableDraftsCount})
            </Button>
            <Button
              onClick={handleBulkDelete}
              disabled={isPublishing || isDeleting}
              variant="destructive"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrashIcon className="w-4 h-4" />}
              Delete ({selectedDrafts.size})
            </Button>
          </div>
        )}
      </div>

      {isLoadingInitial ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-violet-600 dark:text-violet-400" />
          <p className="animate-pulse">Loading your drafts...</p>
        </div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/5 max-w-md mx-auto w-full p-8 space-y-4">
          <p className="text-muted-foreground font-semibold">You don't have any thread drafts yet.</p>
          <Link
            href="/threads/create"
            className={`${buttonVariants()} rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300`}
          >
            Create your first thread
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-border/80 rounded-xl bg-card/45 backdrop-blur-xs shadow-xs w-full">
            <table className="w-full text-sm text-left border-collapse min-w-[650px]">
              <thead className="bg-muted/30 text-muted-foreground/80 text-xs font-bold uppercase border-b border-border/50">
                <tr>
                  <th className="px-4 py-4 font-semibold w-10 text-center">
                    <Checkbox
                      checked={drafts.length > 0 && selectedDrafts.size === drafts.length}
                      onCheckedChange={toggleAll}
                      disabled={drafts.length === 0 || isPublishing || isDeleting}
                      aria-label="Select all"
                      className="border-muted-foreground/45 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                    />
                  </th>
                  <th className="px-4 py-4 font-semibold">Input Source</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold text-center">Virality</th>
                  <th className="px-4 py-4 font-semibold">Created At</th>
                  <th className="px-4 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {drafts.map((draft) => {
                  const isTopic = draft.input_field?.agent === "topic";
                  // @ts-ignore - union type narrowing
                  const title = isTopic ? draft.input_field?.topic : draft.input_field?.url || "Unknown Source";
                  const externalUrl = !isTopic && title?.startsWith("http") ? title : `https://${title}`;
                  const genStatus = draft.generation_status ?? "success";
                  const isPublishable = !draft.is_published && draft.publication_status !== "publishing" && draft.publication_status !== "queued" && genStatus === "success";
                  return (
                    <tr key={draft._id} className="hover:bg-muted/20 transition-colors duration-150">
                      <td className="px-4 py-4.5 text-center">
                        <Checkbox
                          checked={selectedDrafts.has(draft._id)}
                          onCheckedChange={() => toggleSelection(draft._id)}
                          disabled={isPublishing || isDeleting}
                          aria-label={`Select ${title}`}
                          className="border-muted-foreground/45 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                        />
                      </td>
                      <td className="px-4 py-4.5">
                        {isTopic ? (
                          <span className="flex items-center gap-1.5 font-semibold text-foreground max-w-[180px] sm:max-w-xs md:max-w-md" title={title}>
                            <span className="truncate">{title}</span>
                          </span>
                        ) : (
                          <a
                            href={externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-violet-600 dark:hover:text-violet-400 hover:underline flex items-center gap-1.5 font-semibold text-foreground max-w-[180px] sm:max-w-xs md:max-w-md transition-colors"
                            title={title}
                          >
                            <span className="truncate">{title}</span>
                            <ExternalLinkIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-4.5">
                        {genStatus === "queued" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                            <ClockIcon className="w-3 h-3" /> Queued
                          </span>
                        ) : genStatus === "processing" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 animate-pulse">
                            <UpdateIcon className="w-3 h-3 animate-spin" /> Generating
                          </span>
                        ) : genStatus === "hook selection" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Sparkles className="w-3 h-3 text-indigo-500" /> Hook Selection
                          </span>
                        ) : genStatus === "failed" ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger
                                render={<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-destructive/10 text-destructive cursor-help hover:bg-destructive/15 transition-colors" />}
                              >
                                <CrossCircledIcon className="w-3 h-3 shrink-0" /> Failed
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-popover text-popover-foreground border border-border shadow-xl rounded-xl space-y-1.5">
                                <div className="font-semibold text-destructive flex items-center gap-1.5 text-xs">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Generation Error
                                </div>
                                <p className="text-muted-foreground text-[11px] leading-relaxed break-words font-mono line-clamp-4">
                                  {draft.failure_reason || "AI agent generation failed after trying all fallback models."}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : draft.publication_status === "queued" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                            <ClockIcon className="w-3 h-3" /> Queued
                          </span>
                        ) : draft.publication_status === "publishing" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse">
                            <UpdateIcon className="w-3 h-3 animate-spin" /> Publishing
                          </span>
                        ) : draft.publication_status === "failed" ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger
                                render={<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-help hover:bg-rose-500/15 transition-colors" />}
                              >
                                <CrossCircledIcon className="w-3 h-3 shrink-0" /> Publish Failed
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-popover text-popover-foreground border border-border shadow-xl rounded-xl space-y-1.5">
                                <div className="font-semibold text-rose-500 flex items-center gap-1.5 text-xs">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Publication Error
                                </div>
                                <p className="text-muted-foreground text-[11px] leading-relaxed break-words font-mono line-clamp-4">
                                  {draft.publication_error || "Failed to publish to Threads. Please verify your Threads connection and permissions."}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : draft.is_published ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <CheckCircledIcon className="w-3 h-3" /> Published
                          </span>
                        ) : draft.is_approved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                            <CheckCircledIcon className="w-3 h-3" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-muted text-muted-foreground">
                            <FileTextIcon className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4.5 text-center">
                        {genStatus === "success" && draft.virality_score !== undefined ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${draft.virality_score >= 85
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : draft.virality_score >= 70
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                            }`}>
                            {draft.virality_score}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4.5 whitespace-nowrap">
                        <span className="text-muted-foreground text-xs font-medium">
                          {formatDate(draft._creationTime)}
                        </span>
                      </td>
                      <td className="px-4 py-4.5 text-right">
                        {genStatus === "failed" ? (
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="rounded-lg bg-rose-500 hover:bg-rose-600 text-white cursor-pointer w-24 justify-center"
                            onClick={() => handleRetry(draft._id)}
                            disabled={retryingIds.has(draft._id)}
                          >
                            {retryingIds.has(draft._id) ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 inline" /> Retrying
                              </>
                            ) : (
                              "Retry"
                            )}
                          </Button>
                        ) : genStatus === "queued" || genStatus === "processing" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="rounded-lg text-muted-foreground border-border/60 w-24 justify-center opacity-70 cursor-not-allowed"
                          >
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 inline" />
                            {genStatus === "queued" ? "Queued" : "Working"}
                          </Button>
                        ) : (
                          <Link
                            href={`/threads/drafts/${draft._id}/approve`}
                            className={`${buttonVariants({ variant: "outline", size: "sm" })} rounded-lg hover:bg-violet-600/5 hover:text-violet-600 dark:hover:bg-violet-500/5 dark:hover:text-violet-400 border-border/80 hover:border-violet-500/30 transition-all duration-200 cursor-pointer w-24 justify-center`}
                          >
                            Review
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {status === "CanLoadMore" && (
            <div className="flex justify-center mt-6">
              <Button onClick={() => loadMore(10)} variant="outline">
                Load More
              </Button>
            </div>
          )}
          {status === "LoadingMore" && (
            <div className="flex justify-center mt-6">
              <Button disabled variant="outline">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
