import { Image as ImageIcon, Video, Search, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SearchQueriesDialogProps {
  searchQueries: {
    hero_visual_query: string;
    post_visual_queries: Array<{
      post_index: number;
      image_search_query: string;
      video_search_query: string;
    }>;
  };
}

export function SearchQueriesDialog({ searchQueries }: SearchQueriesDialogProps) {
  if (!searchQueries || !searchQueries.post_visual_queries) return null;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="w-full rounded-xl border-border/80 text-foreground font-bold py-6 hover:bg-violet-600/5 hover:text-violet-600 dark:hover:bg-violet-500/5 dark:hover:text-violet-400 hover:border-violet-500/30 transition-all duration-300 cursor-pointer"
          />
        }
      >
        <ImagePlus className="w-4 h-4 mr-2 text-violet-500" />
        View Search Queries
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] p-0 overflow-hidden bg-card/95 backdrop-blur-md flex flex-col rounded-2xl border border-border/30 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/30 shrink-0 bg-muted/10">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground leading-snug flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-violet-500" />
            Generated Visual Search Queries
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Highly specific visual search queries automatically generated to help you find the best imagery and videos for your thread.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-8">
          
          {/* Hero Query Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4" /> Hero Visual Query
            </h3>
            <div className="bg-violet-500/10 border border-violet-500/30 p-4 rounded-xl flex items-start gap-4">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <ImageIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="space-y-1 mt-1 flex-1">
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {searchQueries.hero_visual_query}
                </p>
                <p className="text-xs text-muted-foreground">Recommended for the thread cover / first post.</p>
              </div>
            </div>
          </div>

          {/* Post Queries Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4" /> Per-Post Visual Queries
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {searchQueries.post_visual_queries.map((q, i) => (
                <div key={i} className="bg-muted/30 border border-border/50 p-4 rounded-xl space-y-4 hover:border-violet-500/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="bg-foreground text-background text-xs font-bold px-2 py-0.5 rounded-md">
                      Post {q.post_index + 1}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 opacity-70">
                        <ImageIcon className="w-4 h-4 text-violet-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Image Query</p>
                        <p className="text-sm font-medium text-foreground">{q.image_search_query}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 opacity-70">
                        <Video className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Video Query</p>
                        <p className="text-sm font-medium text-foreground">{q.video_search_query}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
