"use client";

import { useState } from "react";
import { usePaginatedQuery, useAction } from "convex/react";
import { useMutation } from "@tanstack/react-query";
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
    api.threads.getPaginatedThreadDrafts,
    {},
    { initialNumItems: 10 }
  );

  const enqueuePublication = useAction(api.actions.threads.enqueueThreadPublication);
  const deleteDraft = useAction(api.actions.threads.deleteThreadDraft);
  const retryGeneration = useAction(api.actions.threads.enqueueThreadRetry);

  const [selectedDrafts, setSelectedDrafts] = useState<Set<Id<"threadDrafts">>>(new Set());
  const [retryingIds, setRetryingIds] = useState<Set<Id<"threadDrafts">>>(new Set());

  const bulkPublishMutation = useMutation({
    mutationFn: async (validIds: Id<"threadDrafts">[]) => {
      return await enqueuePublication({ requests: validIds.map((id) => ({ id })) });
    },
    onSuccess: (_, validIds) => {
      toast.success(`Publication queued for ${validIds.length} threads!`);
      setSelectedDrafts(new Set());
    },
    onError: (err: unknown) => {
      console.error("Failed to publish:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to publish: ${message}`);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (idsToDelete: Id<"threadDrafts">[]) => {
      await Promise.all(idsToDelete.map((id) => deleteDraft({ id })));
      return idsToDelete;
    },
    onSuccess: (idsToDelete) => {
      toast.success(`Successfully deleted ${idsToDelete.length} thread draft(s).`);
      setSelectedDrafts(new Set());
    },
    onError: (err: unknown) => {
      console.error("Failed to delete:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to delete: ${message}`);
    },
  });

  const isPublishing = bulkPublishMutation.isPending;
  const isDeleting = bulkDeleteMutation.isPending;

  const handleRetry = async (id: Id<"threadDrafts">) => {
    try {
      setRetryingIds(prev => new Set(prev).add(id));
      await retryGeneration({ ids: [id] });
      toast.success("Generation retry enqueued!");
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to retry generation: ${message}`);
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

  const handleBulkPublish = () => {
    const validIds = Array.from(selectedDrafts).filter(id => {
      const draft = drafts.find(d => d._id === id);
      return draft && !draft.is_published && draft.publication_status !== "publishing" && draft.publication_status !== "queued" && (draft.generation_status ?? "success") === "success";
    });

    if (validIds.length === 0) {
      toast.error("None of the selected drafts are eligible for publishing.");
      return;
    }

    bulkPublishMutation.mutate(validIds);
  };

  const handleBulkDelete = () => {
    if (selectedDrafts.size === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the ${selectedDrafts.size} selected thread draft(s)?`
    );
    if (!confirmDelete) return;

    const idsToDelete = Array.from(selectedDrafts);
    bulkDeleteMutation.mutate(idsToDelete);
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

  type DraftItem = (typeof drafts)[number];

  const renderStatusBadge = (draft: DraftItem) => {
    const genStatus = draft.generation_status ?? "success";
    if (genStatus === "queued") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
          <ClockIcon className="w-3 h-3" /> Queued
        </span>
      );
    }
    if (genStatus === "processing") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 animate-pulse">
          <UpdateIcon className="w-3 h-3 animate-spin" /> Generating
        </span>
      );
    }
    if (genStatus === "hook selection") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-3 h-3 text-indigo-500" /> Hook Selection
        </span>
      );
    }
    if (genStatus === "failed") {
      return (
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
              <p className="text-muted-foreground text-[11px] leading-relaxed wrap-break-word font-mono line-clamp-4">
                {draft.failure_reason || "AI agent generation failed after trying all fallback models."}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (draft.publication_status === "queued") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
          <ClockIcon className="w-3 h-3" /> Queued
        </span>
      );
    }
    if (draft.publication_status === "publishing") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse">
          <UpdateIcon className="w-3 h-3 animate-spin" /> Publishing
        </span>
      );
    }
    if (draft.publication_status === "failed") {
      return (
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
              <p className="text-muted-foreground text-[11px] leading-relaxed wrap-break-word font-mono line-clamp-4">
                {draft.publication_error || "Failed to publish to Threads. Please verify your Threads connection and permissions."}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (draft.is_published) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <CheckCircledIcon className="w-3 h-3" /> Published
        </span>
      );
    }
    if (draft.is_approved) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
          <CheckCircledIcon className="w-3 h-3" /> Approved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-muted text-muted-foreground">
        <FileTextIcon className="w-3 h-3" /> Pending Review
      </span>
    );
  };

  const renderActionButtons = (draft: DraftItem, fullWidthMobile = false) => {
    const genStatus = draft.generation_status ?? "success";
    if (genStatus === "failed") {
      return (
        <Button
          size="sm"
          variant="destructive"
          className={`rounded-lg bg-rose-500 hover:bg-rose-600 text-white cursor-pointer justify-center ${fullWidthMobile ? "w-full py-2.5 text-xs" : "w-24"}`}
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
      );
    }
    if (genStatus === "queued" || genStatus === "processing") {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled
          className={`rounded-lg text-muted-foreground border-border/60 justify-center opacity-70 cursor-not-allowed ${fullWidthMobile ? "w-full py-2.5 text-xs" : "w-24"}`}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 inline" />
          {genStatus === "queued" ? "Queued" : "Working"}
        </Button>
      );
    }
    return (
      <Link
        href={`/threads/drafts/${draft._id}/approve`}
        className={`${buttonVariants({ variant: "outline", size: "sm" })} rounded-lg hover:bg-violet-600/5 hover:text-violet-600 dark:hover:bg-violet-500/5 dark:hover:text-violet-400 border-border/80 hover:border-violet-500/30 transition-all duration-200 cursor-pointer justify-center ${fullWidthMobile ? "w-full py-2.5 text-xs font-semibold" : "w-24"}`}
      >
        Review
      </Link>
    );
  };

  const isLoadingInitial = status === "LoadingFirstPage";

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-7xl space-y-6 sm:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/30 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
              Thread Drafts
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage, evaluate, and publish your generated thread sequences.
          </p>
        </div>
        {selectedDrafts.size > 0 && (
          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <Button
              onClick={handleBulkPublish}
              disabled={isPublishing || isDeleting || publishableDraftsCount === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
            >
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Publish ({publishableDraftsCount})
            </Button>
            <Button
              onClick={handleBulkDelete}
              disabled={isPublishing || isDeleting}
              variant="destructive"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
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
            className={`${buttonVariants()} rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300`}
          >
            Create your first thread
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile Select All Bar */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 bg-card/60 backdrop-blur-xs rounded-xl border border-border/80 text-xs">
            <label className="flex items-center gap-2.5 font-semibold text-foreground cursor-pointer">
              <Checkbox
                checked={drafts.length > 0 && selectedDrafts.size === drafts.length}
                onCheckedChange={toggleAll}
                disabled={drafts.length === 0 || isPublishing || isDeleting}
                aria-label="Select all drafts"
                className="border-muted-foreground/45 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
              />
              <span>Select All ({drafts.length})</span>
            </label>
            {selectedDrafts.size > 0 && (
              <span className="text-violet-600 dark:text-violet-400 font-bold">
                {selectedDrafts.size} selected
              </span>
            )}
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {drafts.map((draft) => {
              const inputField = draft.input_field;
              const isTopic = inputField?.agent === "topic";
              const title = !inputField
                ? "Unknown Source"
                : inputField.agent === "topic"
                ? inputField.topic
                : inputField.url;
              const externalUrl = !isTopic && title.startsWith("http") ? title : `https://${title}`;
              const genStatus = draft.generation_status ?? "success";
              const isSelected = selectedDrafts.has(draft._id);

              return (
                <div
                  key={draft._id}
                  className={`p-4 rounded-xl border transition-all duration-200 bg-card/45 backdrop-blur-xs shadow-xs space-y-3.5 ${
                    isSelected
                      ? "border-violet-500/80 bg-violet-500/5 ring-1 ring-violet-500/30"
                      : "border-border/80 hover:border-violet-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(draft._id)}
                        disabled={isPublishing || isDeleting}
                        aria-label={`Select ${title}`}
                        className="mt-1 border-muted-foreground/45 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                      />
                      <div className="min-w-0 flex-1">
                        {isTopic ? (
                          <p className="font-semibold text-foreground text-sm truncate" title={title}>
                            {title}
                          </p>
                        ) : (
                          <a
                            href={externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-violet-600 dark:hover:text-violet-400 hover:underline flex items-center gap-1.5 font-semibold text-foreground text-sm transition-colors truncate"
                            title={title}
                          >
                            <span className="truncate">{title}</span>
                            <ExternalLinkIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          </a>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                          {formatDate(draft._creationTime)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderStatusBadge(draft)}
                      {genStatus === "success" && draft.virality_score !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            draft.virality_score >= 85
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : draft.virality_score >= 70
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                          }`}
                        >
                          Virality: {draft.virality_score}
                        </span>
                      )}
                    </div>
                    <div className="shrink-0">
                      {renderActionButtons(draft)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border border-border/80 rounded-xl bg-card/45 backdrop-blur-xs shadow-xs w-full">
            <table className="w-full text-sm text-left border-collapse min-w-162.5">
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
                  const inputField = draft.input_field;
                  const isTopic = inputField?.agent === "topic";
                  const title = !inputField
                    ? "Unknown Source"
                    : inputField.agent === "topic"
                    ? inputField.topic
                    : inputField.url;
                  const externalUrl = !isTopic && title.startsWith("http") ? title : `https://${title}`;
                  const genStatus = draft.generation_status ?? "success";
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
                          <span className="flex items-center gap-1.5 font-semibold text-foreground max-w-45 sm:max-w-xs md:max-w-md" title={title}>
                            <span className="truncate">{title}</span>
                          </span>
                        ) : (
                          <a
                            href={externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-violet-600 dark:hover:text-violet-400 hover:underline flex items-center gap-1.5 font-semibold text-foreground max-w-45 sm:max-w-xs md:max-w-md transition-colors"
                            title={title}
                          >
                            <span className="truncate">{title}</span>
                            <ExternalLinkIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-4.5">
                        {renderStatusBadge(draft)}
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
                        {renderActionButtons(draft)}
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
