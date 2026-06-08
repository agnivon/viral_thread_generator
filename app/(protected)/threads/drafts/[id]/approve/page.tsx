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
      alert(`Success! Published ${result.postIds.length} posts to Threads.`);
      router.push("/threads/drafts");
    } catch (e: any) {
      console.error(e);
      alert(`Failed to publish: ${e.message}`);
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

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Thread Draft</h1>
          <p className="text-muted-foreground mt-1">
            Generated from: <a href={state.url} target="_blank" rel="noreferrer" className="underline hover:text-foreground">{state.url}</a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${state.is_published ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : state.is_approved ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
            {state.is_published ? "Published" : state.is_approved ? "Approved" : "Pending Review"}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {state.iterations} Iteration{state.iterations !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {state.critique && (
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
              {state.thread_draft.map((post, index) => (
                <div key={index} className="p-4 border rounded-lg bg-card/50 relative">
                  <span className="absolute -top-3 -left-3 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                    {index + 1}
                  </span>
                  <p className="whitespace-pre-wrap text-sm">{post}</p>
                </div>
              ))}
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
