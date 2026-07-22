"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2, Sparkles, Link as LinkIcon, HelpCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CreateThreadPage() {
  const [entries, setEntries] = useState([{ url: "", guidance: "", manual_hook_selection: false, agent: "news" }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const enqueueThreadGeneration = useAction(api.actions.threadsActions.enqueueThreadGeneration);
  const router = useRouter();

  const handleAddEntry = () => {
    setEntries([...entries, { url: "", guidance: "", manual_hook_selection: false, agent: "news" }]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: "url" | "guidance" | "manual_hook_selection" | "agent",
    value: string | boolean
  ) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value } as any;
    setEntries(newEntries);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validEntries = entries.filter((entry) => entry.url.trim() !== "");
    if (validEntries.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Trigger thread generation enqueuing
      await enqueueThreadGeneration({ 
        requests: validEntries.map(entry => ({ 
          input_field: {
            url: entry.url,
            agent: ((entry as any).agent || "news") as "news" | "social_media"
          },
          guidance: entry.guidance || undefined,
          manual_hook_selection: entry.manual_hook_selection,
        })) 
      });
      // Redirect to drafts list page
      router.push("/threads/drafts");
    } catch (err: any) {
      console.error("Failed to enqueue thread generation:", err);
      setError(err.message || "Failed to start thread generation. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-gradient-to-b from-background via-background/95 to-background/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-2.5 bg-violet-500/10 rounded-2xl text-violet-600 dark:text-violet-400 mb-2 animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
              Create Viral Threads
            </span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-base sm:text-lg">
            Batch generate high-performance Threads sequences from articles, blog posts, or videos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Entries Container */}
          <div className="space-y-6">
            {entries.map((entry, index) => (
              <Card 
                key={index} 
                className="group relative overflow-hidden bg-card/40 backdrop-blur-xs border-border/80 hover:border-violet-500/30 hover:shadow-lg transition-all duration-300"
              >
                {/* Accent Highlight Line on Card Hover */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/30 bg-muted/20 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-xs font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <CardTitle className="text-base font-bold text-foreground">
                      Thread Source Entry
                    </CardTitle>
                  </div>
                  {entries.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveEntry(index)}
                      disabled={isLoading}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                
                <CardContent className="p-6 space-y-6">
                  {/* Content URL Input */}
                  <div className="space-y-2">
                    <Label 
                      htmlFor={`url-${index}`} 
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-indigo-500" /> Content URL
                    </Label>
                    <Input
                      id={`url-${index}`}
                      type="url"
                      placeholder="https://example.com/my-awesome-post"
                      value={entry.url}
                      onChange={(e) => handleChange(index, "url", e.target.value)}
                      disabled={isLoading}
                      required
                      className="w-full bg-background/50 border-border/80 focus-visible:ring-violet-500/30 focus-visible:border-violet-500 rounded-lg transition-all"
                    />
                  </div>

                  {/* Agent Selection */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Choose Agent Role
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleChange(index, "agent", "news")}
                        disabled={isLoading}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all duration-300 text-center cursor-pointer ${
                          (entry as any).agent === "news" || !(entry as any).agent
                            ? "border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/50"
                            : "border-border/80 bg-background/40 hover:border-violet-500/30 hover:bg-muted/10"
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground">News Editor</span>
                        <span className="text-[10px] text-muted-foreground mt-1">Factual, journalistic layout</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange(index, "agent", "social_media")}
                        disabled={isLoading}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all duration-300 text-center cursor-pointer ${
                          (entry as any).agent === "social_media"
                            ? "border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/50"
                            : "border-border/80 bg-background/40 hover:border-violet-500/30 hover:bg-muted/10"
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground">Social Specialist</span>
                        <span className="text-[10px] text-muted-foreground mt-1">Punchy, hook-focused copy</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Guidance Textarea */}
                  <div className="space-y-2">
                    <Label 
                      htmlFor={`guidance-${index}`} 
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-violet-500" /> AI Guidance / Instructions (Optional)
                    </Label>
                    <textarea
                      id={`guidance-${index}`}
                      placeholder="e.g., Focus on technical details, adopt an enthusiastic tone, or structure with numbered steps."
                      value={entry.guidance}
                      onChange={(e) => handleChange(index, "guidance", e.target.value)}
                      disabled={isLoading}
                      className="flex min-h-[100px] w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-violet-500 focus-visible:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all"
                    />
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/75" /> Set tone instructions, specific callouts, or layout requirements for the generator.
                    </p>
                  </div>

                  {/* Choose Hooks Manually Checkbox */}
                  <div className="flex items-start space-x-3 pt-2 bg-muted/10 p-3 rounded-lg border border-border/30">
                    <Checkbox
                      id={`manual-hook-${index}`}
                      checked={entry.manual_hook_selection}
                      onCheckedChange={(checked) => handleChange(index, "manual_hook_selection", !!checked)}
                      disabled={isLoading}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor={`manual-hook-${index}`}
                        className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-75 cursor-pointer text-foreground"
                      >
                        Choose hooks manually
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Pause the generation pipeline to choose and edit your hook before generating the full thread.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Another Link Card Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleAddEntry}
              disabled={isLoading}
              className="w-full flex flex-col items-center justify-center py-6 px-4 border-2 border-dashed border-border/80 hover:border-violet-500/40 rounded-xl bg-muted/5 hover:bg-violet-500/5 text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 font-medium transition-all duration-300 group focus:outline-none cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-border/80 group-hover:scale-105 transition-transform duration-300">
                <Plus className="h-5 w-5" />
              </div>
              <span className="mt-2 text-sm font-semibold tracking-wide">Add another content link</span>
            </button>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="text-sm text-destructive text-center p-3.5 border border-destructive/20 rounded-xl bg-destructive/10 max-w-sm mx-auto w-full">
              {error}
            </div>
          )}

          {/* Form Actions / Submit */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-6 border-t border-border/40">
            <Button 
              type="submit" 
              size="lg"
              className="w-full sm:w-auto sm:min-w-[240px] rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
              disabled={isLoading || entries.every(e => !e.url.trim())}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Threads...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate {entries.length === 1 ? "1 Thread" : `${entries.length} Threads`}
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
