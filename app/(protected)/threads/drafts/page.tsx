"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";

export default function DraftsPage() {
  const drafts = useQuery(api.queries.threadsQueries.getAllThreadDrafts);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.map((draft) => {
            const externalUrl = draft.url?.startsWith('http') ? draft.url : `https://${draft.url}`;
            return (
            <Card key={draft._id} className="flex flex-col hover:border-primary/50 transition-colors shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg truncate" title={draft.url}>
                  <a href={externalUrl} target="_blank" rel="noreferrer" className="hover:underline">
                    {draft.url}
                  </a>
                </CardTitle>
                <CardDescription>
                  Status: {draft.is_published ? "Published" : draft.is_approved ? "Approved" : "Pending Review"}
                  <br />
                  Iterations: {draft.iterations}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-6 flex justify-between items-center">
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 truncate max-w-[120px]"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" /> Source
                </a>
                <Link
                  href={`/threads/drafts/${draft._id}/approve`}
                  className={buttonVariants({ variant: "default" })}
                >
                  Review
                </Link>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
