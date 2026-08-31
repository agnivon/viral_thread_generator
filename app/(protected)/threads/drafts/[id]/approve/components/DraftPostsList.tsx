import { Sparkles, Image as ImageIcon, X, Video as VideoIcon, GripVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { useWatch, useFieldArray, type Control, type UseFormRegister } from "react-hook-form";

export interface ThreadDraftFormData {
  posts: { content: string }[];
}

interface DraftPostsListProps {
  posts: string[];
  isEditingPosts: boolean;
  register: UseFormRegister<ThreadDraftFormData>;
  control: Control<ThreadDraftFormData>;
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

interface DraftPostItemProps {
  index: number;
  post: string;
  isEditingPosts: boolean;
  register: UseFormRegister<ThreadDraftFormData>;
  control: Control<ThreadDraftFormData>;
  selectedImages: Record<string, string>;
  selectedVideos: Record<string, string>;
  postCritique?: { post_index: number; critique?: string };
  onAttachImage: (index: number) => void;
  onRemoveImage: (index: number) => void;
  onAttachVideo: (index: number) => void;
  onRemoveVideo: (index: number) => void;
  onRemovePost?: (index: number) => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

function DraftPostItem({
  index,
  post,
  isEditingPosts,
  register,
  control,
  selectedImages,
  selectedVideos,
  postCritique,
  onAttachImage,
  onRemoveImage,
  onAttachVideo,
  onRemoveVideo,
  onRemovePost,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: DraftPostItemProps) {
  // Use isolated useWatch at the post-item level to avoid re-rendering entire thread list
  const watchedValue = useWatch({ control, name: `posts.${index}.content` }) ?? post;
  const charCount = watchedValue?.length || 0;
  const detectedUrl = getFirstUrl(watchedValue || "");

  return (
    <div
      draggable={isEditingPosts}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative overflow-hidden p-6 rounded-xl border transition-all duration-300 flex flex-col justify-between min-h-30 ${
        isEditingPosts
          ? "border-violet-500 bg-violet-500/5 shadow-md animate-in fade-in duration-200"
          : "border-border/80 bg-card/40 backdrop-blur-xs hover:border-violet-500/30 hover:shadow-md"
      } ${isDragging ? "opacity-50 scale-[0.98] border-violet-600 bg-violet-600/10 shadow-xl" : ""}`}
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex gap-4 items-start w-full">
        {isEditingPosts && (
          <div className="mt-1 -ml-2 text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors shrink-0">
            <GripVertical className="w-5 h-5" />
          </div>
        )}
        <span className="shrink-0 bg-linear-to-r from-violet-600 to-indigo-600 text-white h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shadow-md select-none mt-0.5">
          {index + 1}
        </span>

        {isEditingPosts ? (
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex justify-between items-start gap-4">
              <textarea
                {...register(`posts.${index}.content` as const)}
                rows={4}
                className="w-full text-sm bg-background border border-border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none rounded-lg p-3.5 resize-y leading-relaxed"
              />
              {onRemovePost && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemovePost(index)}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* URL Link Preview */}
            {detectedUrl && <LinkPreviewCard url={detectedUrl} />}

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

            {/* Media Attachment Action Buttons */}
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
          <div className="flex-1 space-y-2 min-w-0">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground flex-1 pt-0.5">{watchedValue}</p>

            {/* URL Link Preview */}
            {detectedUrl && <LinkPreviewCard url={detectedUrl} />}

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

      {postCritique?.critique?.trim() && (
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
          {charCount} character{charCount !== 1 ? "s" : ""}
        </span>
        {charCount > 500 ? (
          <span className="text-destructive font-semibold">Exceeds Threads limit (500)</span>
        ) : (
          <span className="font-medium">{500 - charCount} remaining</span>
        )}
      </div>
    </div>
  );
}

export function DraftPostsList({
  posts,
  isEditingPosts,
  register,
  control,
  selectedImages,
  selectedVideos,
  postCritiques,
  onAttachImage,
  onRemoveImage,
  onAttachVideo,
  onRemoveVideo,
}: DraftPostsListProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "posts",
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const displayPosts = isEditingPosts
    ? fields.map((field, i) => ({ id: field.id, content: (field as any).content || "" }))
    : posts.map((post, i) => ({ id: i.toString(), content: post }));

  return (
    <CardContent className="space-y-6 pt-6">
      {displayPosts.map((item, index) => {
        const postCritique = postCritiques?.find((pc) => pc.post_index === index + 1);

        return (
          <DraftPostItem
            key={item.id}
            index={index}
            post={item.content}
            isEditingPosts={isEditingPosts}
            register={register}
            control={control}
            selectedImages={selectedImages}
            selectedVideos={selectedVideos}
            postCritique={postCritique}
            onAttachImage={onAttachImage}
            onRemoveImage={onRemoveImage}
            onAttachVideo={onAttachVideo}
            onRemoveVideo={onRemoveVideo}
            onRemovePost={isEditingPosts ? () => remove(index) : undefined}
            isDragging={draggedIndex === index}
            onDragStart={(e) => {
              setDraggedIndex(index);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", index.toString());
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedIndex !== null && draggedIndex !== index) {
                move(draggedIndex, index);
              }
              setDraggedIndex(null);
            }}
            onDragEnd={() => setDraggedIndex(null)}
          />
        );
      })}
      
      {isEditingPosts && (
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl border-dashed border-border hover:border-violet-500 hover:text-violet-600 hover:bg-violet-500/5 transition-all py-6"
          onClick={() => append({ content: "" })}
        >
          + Add New Post
        </Button>
      )}

      {posts.length === 0 && !isEditingPosts && (
        <p className="text-muted-foreground italic text-center py-6">No draft content generated yet.</p>
      )}
    </CardContent>
  );
}
