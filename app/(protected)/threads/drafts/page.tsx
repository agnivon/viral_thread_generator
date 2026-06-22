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
import { Loader2 } from "lucide-react";
import {
  UpdateIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  FileTextIcon,
  ExternalLinkIcon,
  TrashIcon
} from "@radix-ui/react-icons";

export default function DraftsPage() {
  const { results: drafts, status, loadMore } = usePaginatedQuery(
    api.queries.threadsQueries.getPaginatedThreadDrafts,
    {},
    { initialNumItems: 10 }
  );

  const enqueuePublication = useAction(api.actions.threadsActions.enqueueThreadPublication);
  const deleteDraft = useMutation(api.mutations.threadsMutations.deleteThreadDraft);

  const [selectedDrafts, setSelectedDrafts] = useState<Set<Id<"threadDrafts">>>(new Set());
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    return d && !d.is_published && d.publication_status !== "publishing" && (d.generation_status ?? "success") === "success";
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
      return draft && !draft.is_published && draft.publication_status !== "publishing" && (draft.generation_status ?? "success") === "success";
    });

    if (validIds.length === 0) {
      toast.error("None of the selected drafts are eligible for publishing.");
      return;
    }

    try {
      setIsPublishing(true);
      await enqueuePublication({ ids: validIds });
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
                  <th className="px-4 py-4 font-semibold">Source URL</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold text-center">Virality</th>
                  <th className="px-4 py-4 font-semibold">Created At</th>
                  <th className="px-4 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {drafts.map((draft) => {
                  const externalUrl = draft.url?.startsWith("http") ? draft.url : `https://${draft.url}`;
                  const genStatus = draft.generation_status ?? "success";
                  const isPublishable = !draft.is_published && draft.publication_status !== "publishing" && genStatus === "success";
                  return (
                    <tr key={draft._id} className="hover:bg-muted/20 transition-colors duration-150">
                      <td className="px-4 py-4.5 text-center">
                        <Checkbox
                          checked={selectedDrafts.has(draft._id)}
                          onCheckedChange={() => toggleSelection(draft._id)}
                          disabled={isPublishing || isDeleting}
                          aria-label={`Select ${draft.url}`}
                          className="border-muted-foreground/45 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                        />
                      </td>
                      <td className="px-4 py-4.5">
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-violet-600 dark:hover:text-violet-400 hover:underline flex items-center gap-1.5 font-semibold text-foreground max-w-[180px] sm:max-w-xs md:max-w-md transition-colors"
                          title={draft.url}
                        >
                          <span className="truncate">{draft.url}</span>
                          <ExternalLinkIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                        </a>
                      </td>
                      <td className="px-4 py-4.5">
                        {genStatus === "processing" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 animate-pulse">
                            <UpdateIcon className="w-3 h-3 animate-spin" /> Generating
                          </span>
                        ) : genStatus === "failed" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-destructive/10 text-destructive">
                            <CrossCircledIcon className="w-3 h-3" /> Failed
                          </span>
                        ) : draft.publication_status === "publishing" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse">
                            <UpdateIcon className="w-3 h-3 animate-spin" /> Publishing
                          </span>
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
                        {genStatus === "processing" ? (
                          <Button disabled size="sm" variant="secondary" className="rounded-lg">
                            Review
                          </Button>
                        ) : genStatus === "failed" ? (
                          <Button disabled size="sm" variant="destructive" className="rounded-lg">
                            Failed
                          </Button>
                        ) : (
                          <Link
                            href={`/threads/drafts/${draft._id}/approve`}
                            className={`${buttonVariants({ variant: "outline", size: "sm" })} rounded-lg hover:bg-violet-600/5 hover:text-violet-600 dark:hover:bg-violet-500/5 dark:hover:text-violet-400 border-border/80 hover:border-violet-500/30 transition-all duration-200 cursor-pointer`}
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
