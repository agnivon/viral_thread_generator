import { Sparkles, Image as ImageIcon, X, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { LinkPreviewCard } from "./LinkPreviewCard";

interface DraftPostsListProps {
  posts: string[];
  isEditingPosts: boolean;
  register: any;
  watch: any;
  selectedImages: Record<string, string>;
  selectedVideos: Record<string, string>;
  postCritiques?: Array<{ post_index: number; critique?: string }>;
  onAttachImage: (index: number) => void;
  onRemoveImage: (index: number) => void;
  onAttachVideo: (index: number) => void;
  onRemoveVideo: (index: number) => void;
}

const getFirstUrl = (text: string): string | null => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
};

export function DraftPostsList({
  posts,
  isEditingPosts,
  register,
  watch,
  selectedImages,
  selectedVideos,
  postCritiques,
  onAttachImage,
  onRemoveImage,
  onAttachVideo,
  onRemoveVideo,
}: DraftPostsListProps) {
  return (
    <CardContent className="space-y-6 pt-6">
      {posts.map((post, index) => {
        const postCritique = postCritiques?.find((pc) => pc.post_index === index + 1);
        
        // react-hook-form watch values for live character count
        const postName = `posts.${index}` as const;
        const watchedValue = watch(postName) ?? post;
        const charCount = watchedValue.length;
        const detectedUrl = getFirstUrl(watchedValue);

        return (
          <div 
            key={index} 
            className={`group relative overflow-hidden p-6 rounded-xl border transition-all duration-300 flex flex-col justify-between min-h-[120px] ${
              isEditingPosts 
                ? "border-violet-500 bg-violet-500/5 shadow-md animate-in fade-in duration-200" 
                : "border-border/80 bg-card/40 backdrop-blur-xs hover:border-violet-500/30 hover:shadow-md"
            }`}
          >
            <div className="absolute top-0 left-0 w-[4px] h-full bg-gradient-to-b from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="flex gap-4 items-start w-full">
              <span className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shadow-md select-none mt-0.5">
                {index + 1}
              </span>
              
              {isEditingPosts ? (
                <div className="flex-1 space-y-2">
                  <textarea
                    {...register(`posts.${index}` as any)}
                    rows={4}
                    className="w-full text-sm bg-background border border-border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none rounded-lg p-3.5 resize-y leading-relaxed"
                  />
                  
                  {/* URL Link Preview */}
                  {detectedUrl && (
                    <LinkPreviewCard url={detectedUrl} />
                  )}

                  {/* Attached Image Preview */}
                  {selectedImages[index.toString()] && (
                    <div className="relative mt-3 rounded-xl overflow-hidden border border-border/80 group/image max-w-md bg-muted/20 animate-in fade-in duration-200">
                      <img 
                        src={selectedImages[index.toString()]} 
                        alt={`Post ${index + 1} image`} 
                        className="w-full h-auto max-h-60 object-cover" 
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => onAttachImage(index)}
                          className="rounded-lg h-8 px-2.5 bg-background/80 hover:bg-background backdrop-blur-xs text-xs font-semibold shadow-xs"
                        >
                          <ImageIcon className="w-3.5 h-3.5 mr-1" />
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => onRemoveImage(index)}
                          className="rounded-lg h-8 w-8 p-0 bg-red-600/90 hover:bg-red-600 backdrop-blur-xs shadow-xs"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Attached Video Preview */}
                  {selectedVideos[index.toString()] && (
                    <div className="relative mt-3 rounded-xl overflow-hidden border border-border/80 group/video max-w-md bg-muted/20 animate-in fade-in duration-200">
                      <div className="aspect-video w-full bg-black flex items-center justify-center">
                        <video 
                          src={selectedVideos[index.toString()]} 
                          className="w-full h-full object-contain"
                          preload="metadata"
                          controls
                        />
                      </div>
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => onAttachVideo(index)}
                          className="rounded-lg h-8 px-2.5 bg-background/80 hover:bg-background backdrop-blur-xs text-xs font-semibold shadow-xs"
                        >
                          <VideoIcon className="w-3.5 h-3.5 mr-1" />
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => onRemoveVideo(index)}
                          className="rounded-lg h-8 w-8 p-0 bg-red-600/90 hover:bg-red-600 backdrop-blur-xs shadow-xs"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Media Attachment Action Buttons (Only visible if neither image nor video is attached) */}
                  {!selectedImages[index.toString()] && !selectedVideos[index.toString()] && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAttachImage(index)}
                        className="rounded-lg border-dashed border-border hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/5 transition-all duration-200"
                      >
                        <ImageIcon className="w-4 h-4 mr-1.5 text-violet-500" />
                        Attach Image
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAttachVideo(index)}
                        className="rounded-lg border-dashed border-border hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/5 transition-all duration-200"
                      >
                        <VideoIcon className="w-4 h-4 mr-1.5 text-violet-500" />
                        Attach Video
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 space-y-2">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground flex-1 pt-0.5">{watchedValue}</p>
                  
                  {/* URL Link Preview */}
                  {detectedUrl && (
                    <LinkPreviewCard url={detectedUrl} />
                  )}

                  {/* Selected image preview in non-edit mode */}
                  {selectedImages[index.toString()] && (
                    <div className="relative mt-3 rounded-xl overflow-hidden border border-border/80 max-w-md bg-muted/20">
                      <img 
                        src={selectedImages[index.toString()]} 
                        alt={`Post ${index + 1} image`} 
                        className="w-full h-auto max-h-60 object-cover" 
                      />
                    </div>
                  )}

                  {/* Selected video preview in non-edit mode */}
                  {selectedVideos[index.toString()] && (
                    <div className="relative mt-3 rounded-xl overflow-hidden border border-border/80 max-w-md bg-muted/20">
                      <div className="aspect-video w-full bg-black flex items-center justify-center">
                        <video 
                          src={selectedVideos[index.toString()]} 
                          className="w-full h-full object-contain"
                          preload="metadata"
                          controls
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {postCritique?.critique?.trim() && !isEditingPosts && (
              <div className="mt-4 p-4.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                <span className="font-bold flex items-center gap-1.5 mb-1.5 text-amber-900 dark:text-amber-400">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Post Critique:
                </span>
                <p className="leading-relaxed font-medium">{postCritique.critique}</p>
              </div>
            )}
            
            <div className="mt-5 pt-3 border-t border-border/40 flex justify-between items-center text-xs text-muted-foreground select-none">
              <span className={`font-medium ${charCount > 500 ? "text-destructive font-bold" : ""}`}>
                {charCount} character{charCount !== 1 ? 's' : ''}
              </span>
              {charCount > 500 ? (
                <span className="text-destructive font-semibold">Exceeds Threads limit (500)</span>
              ) : (
                <span className="font-medium">{500 - charCount} remaining</span>
              )}
            </div>
          </div>
        );
      })}
      {posts.length === 0 && (
        <p className="text-muted-foreground italic text-center py-6">No draft content generated yet.</p>
      )}
    </CardContent>
  );
}
