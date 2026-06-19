"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
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
  const publishAction = useAction(api.actions.threadsActions.publishThread);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const result = await publishAction({ id });
      toast.success(`Successfully published ${result.postIds.length} posts to Threads.`);
      // router.push("/threads/drafts");
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to publish: ${e.message || "Unknown error"}`);
    } finally {
      setIsPublishing(false);
    }
  };

  if (state === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent animate-spin rounded-full" />
          <p className="text-muted-foreground animate-pulse">Loading thread draft...</p>
        </div>
      </div>
    );
  }

  if (state === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Draft Not Found</CardTitle>
            <CardDescription>We couldn't find the requested thread draft.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/threads/create" className={buttonVariants({ className: "w-full" })}>
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
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">This thread draft is still generating. Please wait...</p>
        </div>
      </div>
    );
  }

  if (genStatus === "failed") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Generation Failed</CardTitle>
            <CardDescription>We encountered an error while generating this thread.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You can try generating a new thread from the dashboard.
            </p>
            <Link href="/threads/create" className={buttonVariants({ className: "w-full" })}>
              Create a New Thread
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b pb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Review Thread Draft</h1>
          <p className="text-muted-foreground mt-1 text-sm break-all">
            Generated from: <a href={state.url} target="_blank" rel="noreferrer" className="underline hover:text-foreground break-all">{state.url}</a>
          </p>
          {state.guidance && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border border-dashed inline-block">
                <span className="font-semibold text-foreground">Guidance:</span> {state.guidance}
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-start">
          <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${state.is_published ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : state.is_approved ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
            {state.is_published ? "Published" : state.is_approved ? "Approved" : "Pending Review"}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground whitespace-nowrap">
            {state.iterations} Iteration{state.iterations !== 1 ? 's' : ''}
          </span>
          {state.virality_score !== undefined && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
              state.virality_score >= 85 
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

      {state.critique?.trim() && (
        <Card>
          <CardHeader>
            <CardTitle>AI Critique</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap italic bg-muted/50 p-3 rounded-md border-l-4 border-l-primary">
              "{state.critique}"
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Draft Posts</CardTitle>
              <CardDescription>Review the generated thread sequence.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.thread_draft.map((post, index) => {
                const postCritique = state.post_critiques?.find((pc) => pc.post_index === index + 1);
                return (
                  <div key={index} className="p-4 border rounded-lg bg-card/50 relative flex flex-col justify-between min-h-[100px]">
                    <div>
                      <span className="absolute -top-3 -left-3 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                        {index + 1}
                      </span>
                      <p className="whitespace-pre-wrap text-sm">{post}</p>
                    </div>
                    {postCritique?.critique?.trim() && (
                      <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                        <span className="font-semibold block mb-1">Post Critique:</span>
                        <p className="leading-relaxed">{postCritique.critique}</p>
                      </div>
                    )}
                    <div className="mt-4 pt-2 border-t flex justify-between items-center text-xs text-muted-foreground select-none">
                      <span>{post.length} character{post.length !== 1 ? 's' : ''}</span>
                      {post.length > 500 ? (
                        <span className="text-destructive font-medium">Exceeds Threads limit (500)</span>
                      ) : (
                        <span>{500 - post.length} remaining</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {state.thread_draft.length === 0 && (
                <p className="text-muted-foreground italic text-center py-4">No draft content generated yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              size="lg"
              disabled={isPublishing || state.is_published}
              onClick={handlePublish}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...
                </>
              ) : state.is_published ? (
                "Published"
              ) : (
                "Publish"
              )}
            </Button>
            {/* <Button variant="outline" className="w-full">
              Edit Draft
            </Button> */}
          </div>

          {state.virality_score !== undefined && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Virality Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-extrabold text-foreground">{state.virality_score}</span>
                    <span className="text-xs text-muted-foreground pb-1">out of 100</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        state.virality_score >= 85 
                          ? 'bg-emerald-500' 
                          : state.virality_score >= 70 
                            ? 'bg-amber-500' 
                            : 'bg-rose-500'
                      }`}
                      style={{ width: `${state.virality_score}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
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

          <Card>
            <CardHeader>
              <CardTitle>Hook Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Selected Hook</h4>
                  <p className="text-sm bg-muted p-3 rounded-md">{state.selected_hook || "None selected"}</p>
                </div>
                {state.core_hooks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Other Hooks Considered</h4>
                    <ul className="list-disc pl-4 space-y-1">
                      {state.core_hooks.map((hook, i) => (
                        <li key={i} className="text-xs text-muted-foreground">{hook}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
