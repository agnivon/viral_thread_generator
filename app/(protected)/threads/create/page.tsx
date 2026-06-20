"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CreateThreadPage() {
  const [url, setUrl] = useState("");
  const [guidance, setGuidance] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generateNewsThread = useAction(api.actions.threadsActions.generateNewsThread);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError(null);

    // Trigger thread generation in the background
    generateNewsThread({ url, guidance: guidance || undefined }).catch((err) => {
      console.error("Failed to generate thread:", err);
    });

    // Redirect to drafts list page immediately
    router.push("/threads/drafts");
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create a New Thread</CardTitle>
          <CardDescription className="text-center">
            Enter a URL (e.g., an article, blog post, or video) to generate a viral thread.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="url">Content URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/my-awesome-post"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="guidance">Guidance / Instructions (Optional)</Label>
              <textarea
                id="guidance"
                placeholder="e.g., Focus on the technical specifications, use a professional tone, or emphasize key metrics."
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                disabled={isLoading}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
            
            {error && (
              <div className="text-sm text-destructive text-center p-2 border border-destructive/20 rounded bg-destructive/10">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !url}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                  Generating thread... (this may take a minute)
                </span>
              ) : (
                "Create thread"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
