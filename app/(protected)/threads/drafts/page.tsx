"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { 
  UpdateIcon, 
  CheckCircledIcon, 
  CrossCircledIcon, 
  FileTextIcon, 
  ExternalLinkIcon 
} from "@radix-ui/react-icons";

export default function DraftsPage() {
  const drafts = useQuery(api.queries.threadsQueries.getAllThreadDrafts);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">Thread Drafts</h1>

      {drafts === undefined ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p>Loading your drafts...</p>
        </div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-muted/20 shadow-sm">
          <p className="text-muted-foreground mb-4">You don't have any thread drafts yet.</p>
          <Link href="/threads/create" className={buttonVariants()}>
            Create your first thread
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg bg-card shadow-sm w-full">
          <table className="w-full text-sm text-left border-collapse min-w-[650px]">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Source URL</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Iterations</th>
                <th className="px-4 py-3 font-semibold">Created At</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {drafts.map((draft) => {
                const externalUrl = draft.url?.startsWith("http") ? draft.url : `https://${draft.url}`;
                const genStatus = draft.generation_status ?? "success";
                return (
                  <tr key={draft._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <a 
                        href={externalUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="hover:underline flex items-center gap-1.5 font-medium text-foreground max-w-[180px] sm:max-w-xs md:max-w-md"
                        title={draft.url}
                      >
                        <span className="truncate">{draft.url}</span>
                        <ExternalLinkIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {genStatus === "processing" ? (
                        <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5 font-medium">
                          <UpdateIcon className="w-3.5 h-3.5 animate-spin" /> Generating
                        </span>
                      ) : genStatus === "failed" ? (
                        <span className="text-destructive flex items-center gap-1.5 font-medium">
                          <CrossCircledIcon className="w-3.5 h-3.5" /> Failed
                        </span>
                      ) : draft.is_published ? (
                        <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5 font-medium">
                          <CheckCircledIcon className="w-3.5 h-3.5" /> Published
                        </span>
                      ) : draft.is_approved ? (
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1.5 font-medium">
                          <CheckCircledIcon className="w-3.5 h-3.5" /> Approved
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                          <FileTextIcon className="w-3.5 h-3.5" /> Pending Review
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-muted-foreground">
                        {genStatus === "success" ? (draft.iterations ?? 0) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-muted-foreground text-xs">
                        {formatDate(draft._creationTime)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {genStatus === "processing" ? (
                        <Button disabled size="sm" variant="secondary">
                          Review
                        </Button>
                      ) : genStatus === "failed" ? (
                        <Button disabled size="sm" variant="destructive">
                          Failed
                        </Button>
                      ) : (
                        <Link
                          href={`/threads/drafts/${draft._id}/approve`}
                          className={buttonVariants({ variant: "default", size: "sm" })}
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
      )}
    </div>
  );
}
