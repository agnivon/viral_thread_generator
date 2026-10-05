"use client";

import { useUrlMetadata } from "@/hooks/use-url-metadata";
import { ExternalLink, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface UrlTitleDisplayProps {
  url?: string | null;
  topic?: string | null;
  isTopic?: boolean;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  showExternalLink?: boolean;
  maxTitleWidth?: string;
  maxSubtitleWidth?: string;
}

export function UrlTitleDisplay({
  url,
  topic,
  isTopic,
  className,
  titleClassName,
  subtitleClassName,
  showExternalLink = true,
  maxTitleWidth = "max-w-xs md:max-w-md",
  maxSubtitleWidth = "max-w-xs md:max-w-md",
}: UrlTitleDisplayProps) {
  // If this draft is based on a prompt/topic rather than an external webpage URL
  if (isTopic) {
    const displayTopic = topic || "Topic Input";
    return (
      <div className={cn("min-w-0 flex flex-col justify-center", className)}>
        <span
          className={cn(
            "font-semibold text-foreground text-sm truncate inline-flex items-center gap-1.5",
            maxTitleWidth,
            titleClassName
          )}
          title={displayTopic}
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
          <span className="truncate">{displayTopic}</span>
        </span>
      </div>
    );
  }

  // Webpage URL source
  const { title, isLoading } = useUrlMetadata(url);
  const targetUrl = url && (url.startsWith("http://") || url.startsWith("https://")) ? url : `https://${url || ""}`;

  return (
    <div className={cn("min-w-0 flex flex-col justify-center gap-0.5", className)}>
      {/* Primary: Webpage Title */}
      <div className={cn("flex items-center min-w-0", maxTitleWidth)}>
        <span
          className={cn(
            "font-semibold text-foreground text-sm truncate leading-snug transition-colors",
            isLoading && "opacity-85",
            titleClassName
          )}
          title={title}
        >
          {title}
        </span>
      </div>

      {/* Subtitle: Original URL / Hostname Link */}
      {url && (
        <div className={cn("flex items-center min-w-0", maxSubtitleWidth)}>
          <a
            href={targetUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:underline transition-colors truncate font-mono",
              subtitleClassName
            )}
            title={url}
          >
            <span className="truncate">{url}</span>
            {showExternalLink && (
              <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
            )}
          </a>
        </div>
      )}
    </div>
  );
}
