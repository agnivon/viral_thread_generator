import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ExternalLink, Globe } from "lucide-react";

interface LinkPreviewCardProps {
  url: string;
}

export function LinkPreviewCard({ url }: LinkPreviewCardProps) {
  const fetchMetadata = useAction(api.actions.threadsActions.getUrlMetadata);

  let hostname = "";
  let cleanTitle = "";
  
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname;
    
    // Extract a smart title fallback from the pathname
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      cleanTitle = decodeURIComponent(lastPart)
        .replace(/[-_]/g, " ")
        .replace(/\.[^/.]+$/, ""); // strip extension
      
      cleanTitle = cleanTitle
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    
    if (!cleanTitle) {
      cleanTitle = hostname;
    }
  } catch (e) {
    hostname = url;
    cleanTitle = url;
  }

  // Fetch OpenGraph metadata via TanStack Query and Convex Action
  const { data: metadata, isLoading: loading } = useQuery({
    queryKey: ["urlMetadata", url],
    queryFn: async () => {
      if (!url || !url.startsWith("http")) return null;
      return await fetchMetadata({ url });
    },
    enabled: !!url && url.startsWith("http"),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Use OpenGraph data if loaded, otherwise fallback to parsed title/desc
  const displayTitle = metadata?.title || cleanTitle;
  const displayDescription = metadata?.description || `Click to open and explore the referenced link on ${hostname}.`;
  const ogImageUrl = metadata?.image || "";

  // Generate a premium gradient background based on hostname string hash
  const getGradient = (str: string) => {
    const hash = Array.from(str).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "from-violet-500/20 to-indigo-500/20",
      "from-cyan-500/20 to-blue-500/20",
      "from-emerald-500/20 to-teal-500/20",
      "from-fuchsia-500/20 to-pink-500/20",
      "from-amber-500/20 to-orange-500/20"
    ];
    return colors[hash % colors.length];
  };

  const gradientClass = getGradient(hostname);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/card block mt-3 overflow-hidden rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/20 hover:border-violet-500/30 transition-all duration-300 shadow-xs max-w-lg cursor-pointer"
    >
      <div className="flex items-stretch min-h-[96px]">
        {/* Visual Preview Side - Always left aligned, fixed width */}
        <div className="w-24 sm:w-28 flex-shrink-0 relative overflow-hidden flex items-center justify-center border-r border-border/40 bg-muted/20">
          {loading ? (
            <div className="absolute inset-0 bg-muted/30 animate-pulse flex items-center justify-center">
              <Globe className="w-6 h-6 text-muted-foreground/45 animate-spin" />
            </div>
          ) : ogImageUrl ? (
            <>
              <img
                src={ogImageUrl}
                alt={displayTitle}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              {/* Floating favicon over og:image */}
              {hostname && (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
                  alt=""
                  className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-[4px] bg-background/90 p-[2px] shadow-sm z-10 object-contain"
                />
              )}
            </>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
              {hostname ? (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
                  alt={hostname}
                  className="w-8 h-8 object-contain rounded-lg shadow-sm bg-background p-1.5 z-10"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <Globe className="w-7 h-7 text-muted-foreground/60 z-10" />
              )}
              {/* Subtle grid pattern inside preview */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
            </div>
          )}
        </div>

        {/* Content Details Side */}
        <div className="p-3 sm:p-4 flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-bold uppercase tracking-wider min-w-0">
            <Globe className="w-3 h-3 text-violet-500 flex-shrink-0" />
            <span className="truncate">{hostname}</span>
          </div>
          <h4 className="text-xs font-bold text-foreground truncate group-hover/card:text-violet-600 dark:group-hover/card:text-violet-400 transition-colors">
            {displayTitle}
          </h4>
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
            {displayDescription}
          </p>
        </div>
      </div>
    </a>
  );
}
