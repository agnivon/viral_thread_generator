"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, ExternalLink, Copy, Check, Info, Layers, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { InfographicSpec } from "@/convex/lib/infographics/schema";

interface InfographicDialogProps {
  infographicUrl?: string;
  infographicSpec?: InfographicSpec;
  draftId?: Id<"threadDrafts">;
  searchQueries?: {
    hero_visual_query: string;
    post_visual_queries: Array<{
      post_index: number;
      image_search_query: string;
      video_search_query: string;
    }>;
  };
  className?: string;
  triggerText?: string;
}

export function InfographicDialog({
  infographicUrl,
  infographicSpec,
  draftId,
  searchQueries,
  className,
  triggerText,
}: InfographicDialogProps) {
  const [copied, setCopied] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState<string | undefined>(infographicUrl);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const renderInfographicAction = useAction(api.actions.threads.renderInfographicAction);

  useEffect(() => {
    if (infographicUrl) {
      setRenderedUrl(infographicUrl);
    }
  }, [infographicUrl]);

  // When dialog is opened and a spec exists without a rendered URL, automatically render on-demand!
  useEffect(() => {
    if (isOpen && !renderedUrl && infographicSpec && !isRendering && !renderError) {
      let isMounted = true;
      setIsRendering(true);
      setRenderError(null);
      renderInfographicAction({
        spec: infographicSpec,
        draftId,
      })
        .then((url) => {
          if (isMounted) {
            if (url) {
              setRenderedUrl(url);
            } else {
              setRenderError("Failed to generate infographic image URL.");
            }
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error("Failed to render infographic on-demand:", err);
            setRenderError(err instanceof Error ? err.message : "Failed to render infographic.");
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsRendering(false);
          }
        });
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, renderedUrl, infographicSpec, isRendering, renderError, renderInfographicAction, draftId]);

  // If neither infographic nor searchQueries exists, don't show the trigger button
  if (!infographicUrl && !infographicSpec && !searchQueries) return null;

  const handleCopy = async () => {
    if (!renderedUrl) return;
    try {
      await navigator.clipboard.writeText(renderedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy image URL", e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "w-full rounded-xl border-border/80 text-foreground font-semibold h-11 px-3 text-xs sm:text-sm hover:bg-violet-600/5 hover:text-violet-600 dark:hover:bg-violet-500/5 dark:hover:text-violet-400 hover:border-violet-500/30 transition-all duration-200 cursor-pointer shadow-xs",
              className
            )}
          />
        }
      >
        <BarChart3 className="w-4 h-4 mr-2 text-violet-500 shrink-0" />
        {triggerText || "View Editorial Infographic"}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] p-0 overflow-hidden bg-card/95 backdrop-blur-md flex flex-col rounded-2xl border border-border/30 shadow-2xl">
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border/30 shrink-0 bg-muted/10">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground leading-snug flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-500" />
            Editorial Infographic Card
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            High-authority data visual card rendered via Satori & Resvg for social distribution.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {renderedUrl ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-md bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={renderedUrl}
                  alt={infographicSpec?.headline || "Generated Editorial Infographic"}
                  className="w-full h-auto object-contain block"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  {infographicSpec?.archetype ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                      <Layers className="w-3.5 h-3.5" />
                      Archetype: {infographicSpec.archetype.replace(/_/g, " ")}
                    </span>
                  ) : null}
                  {infographicSpec?.kicker ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/40">
                      {infographicSpec.kicker}
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="cursor-pointer gap-1 text-xs font-medium rounded-lg px-2 sm:px-3 justify-center"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{copied ? "Copied" : "Copy URL"}</span>
                  </Button>
                  <a
                    href={renderedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "cursor-pointer gap-1 text-xs font-medium rounded-lg px-2 sm:px-3 justify-center"
                    )}
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Open Full</span>
                  </a>
                  <a
                    href={renderedUrl}
                    download="infographic.png"
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "cursor-pointer gap-1 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-2 sm:px-3 justify-center"
                    )}
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Download</span>
                  </a>
                </div>
              </div>

              {infographicSpec?.sourceCitation ? (
                <div className="p-3 bg-muted/20 border border-border/40 rounded-lg flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{infographicSpec.sourceCitation}</span>
                </div>
              ) : null}
            </div>
          ) : isRendering ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              <p className="text-sm font-medium text-foreground">Rendering editorial infographic card...</p>
              <p className="text-xs text-muted-foreground">Synthesizing typography and visual data layout via Satori & Resvg.</p>
            </div>
          ) : renderError ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-destructive font-medium">{renderError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRenderError(null);
                  setIsRendering(false);
                }}
                className="cursor-pointer text-xs"
              >
                Retry Render
              </Button>
            </div>
          ) : searchQueries ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted/20 rounded-xl border border-border/40 space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Hero Visual Query</h4>
                <p className="text-xs text-muted-foreground font-mono bg-background p-2.5 rounded-lg border border-border/30">
                  {searchQueries.hero_visual_query}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No infographic image or queries found for this thread draft.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
