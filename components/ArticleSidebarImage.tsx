"use client";

import { useState, useEffect, useMemo } from "react";
import { ImageIcon, Newspaper } from "lucide-react";
import { useUrlMetadata } from "@/hooks/use-url-metadata";

export interface ArticleSidebarImageProps {
  url: string;
  title: string;
  initialImage?: string;
  fallbackPicture?: string;
  mediaCompany?: string;
}

export function ArticleSidebarImage({
  url,
  title,
  initialImage,
  fallbackPicture,
  mediaCompany,
}: ArticleSidebarImageProps) {
  const { metadata, hostname, isLoading } = useUrlMetadata(url);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Reset failure state whenever article URL changes
  useEffect(() => {
    setFailedImages({});
  }, [url]);

  const candidates = useMemo(() => {
    const list: string[] = [];
    if (initialImage?.trim()) list.push(initialImage.trim());
    if (metadata?.image?.trim() && !list.includes(metadata.image.trim())) {
      list.push(metadata.image.trim());
    }
    if (fallbackPicture?.trim() && !list.includes(fallbackPicture.trim())) {
      list.push(fallbackPicture.trim());
    }
    return list;
  }, [initialImage, metadata?.image, fallbackPicture]);

  const activeImage = candidates.find((img) => !failedImages[img]);

  if (isLoading && !activeImage) {
    return (
      <div className="relative w-full h-52 sm:h-60 rounded-2xl overflow-hidden border border-border/40 bg-muted/20 flex flex-col items-center justify-center animate-pulse gap-2">
        <ImageIcon className="w-8 h-8 text-muted-foreground/35 animate-pulse" />
        <span className="text-xs text-muted-foreground/50">Loading preview image...</span>
      </div>
    );
  }

  if (activeImage) {
    return (
      <div className="relative w-full max-h-64 sm:max-h-72 rounded-2xl overflow-hidden border border-border/40 bg-muted/20 flex items-center justify-center group shadow-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={activeImage}
          src={activeImage}
          alt={title}
          className="w-full h-full max-h-64 sm:max-h-72 object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => {
            setFailedImages((prev) => ({ ...prev, [activeImage]: true }));
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
        {(mediaCompany || hostname) && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/90 dark:bg-zinc-900/90 backdrop-blur-xs border border-border/40 text-[11px] font-medium text-foreground shadow-xs pointer-events-none">
            {hostname && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                alt=""
                className="w-3.5 h-3.5 object-contain rounded-xs"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            )}
            <span className="truncate max-w-[160px]">{mediaCompany || hostname}</span>
          </div>
        )}
      </div>
    );
  }

  // Graceful fallback card when no candidate image succeeds or exists
  const getGradient = (str: string) => {
    const hash = Array.from(str).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "from-violet-500/20 to-indigo-500/20",
      "from-cyan-500/20 to-blue-500/20",
      "from-emerald-500/20 to-teal-500/20",
      "from-fuchsia-500/20 to-pink-500/20",
      "from-amber-500/20 to-orange-500/20",
    ];
    return colors[hash % colors.length];
  };

  const gradientClass = getGradient(hostname || mediaCompany || title);

  return (
    <div
      className={`relative w-full h-44 sm:h-48 rounded-2xl overflow-hidden border border-border/40 bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-6 text-center shadow-xs`}
    >
      {hostname ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
          alt={hostname}
          className="w-12 h-12 object-contain rounded-xl shadow-md bg-background p-2 z-10 mb-2 border border-border/40"
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      ) : (
        <Newspaper className="w-10 h-10 text-muted-foreground/60 z-10 mb-2" />
      )}
      <span className="text-xs font-semibold text-foreground z-10 truncate max-w-[240px]">
        {mediaCompany || hostname || "News Source"}
      </span>
      <span className="text-[11px] text-muted-foreground z-10 mt-0.5">
        Original News Coverage
      </span>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[14px_24px] pointer-events-none" />
    </div>
  );
}
