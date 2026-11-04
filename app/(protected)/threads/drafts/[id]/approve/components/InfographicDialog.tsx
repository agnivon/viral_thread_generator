"use client";

import { useState } from "react";
import { BarChart3, Download, ExternalLink, Copy, Check, Info, Layers } from "lucide-react";
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

interface InfographicDialogProps {
  infographicUrl?: string;
  infographicSpec?: {
    archetype?: string;
    kicker?: string;
    headline?: string;
    subheading?: string;
    sourceCitation?: string;
    notes?: string;
    [key: string]: unknown;
  };
  searchQueries?: {
    hero_visual_query: string;
    post_visual_queries: Array<{
      post_index: number;
      image_search_query: string;
      video_search_query: string;
    }>;
  };
  className?: string;
}

export function InfographicDialog({
  infographicUrl,
  infographicSpec,
  searchQueries,
  className,
}: InfographicDialogProps) {
  const [copied, setCopied] = useState(false);

  // If neither infographic nor searchQueries exists, don't show the trigger button
  if (!infographicUrl && !infographicSpec && !searchQueries) return null;

  const handleCopy = async () => {
    if (!infographicUrl) return;
    try {
      await navigator.clipboard.writeText(infographicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy image URL", e);
    }
  };

  return (
    <Dialog>
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
        View Editorial Infographic
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
          {infographicUrl ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-md bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={infographicUrl}
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="cursor-pointer gap-1.5 text-xs font-medium rounded-lg"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy URL"}
                  </Button>
                  <a
                    href={infographicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "cursor-pointer gap-1.5 text-xs font-medium rounded-lg"
                    )}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Full
                  </a>
                  <a
                    href={infographicUrl}
                    download="infographic.png"
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "cursor-pointer gap-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white"
                    )}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
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
