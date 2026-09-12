import { Sparkles, Image as ImageIcon, X, Video as VideoIcon, GripVertical, ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
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
  totalPosts: number;
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
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

function DraftPostItem({
  index,
  totalPosts,
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
  onMoveUp,
  onMoveDown,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: DraftPostItemProps) {
  const [dragEnabled, setDragEnabled] = useState(false);
  // Use isolated useWatch at the post-item level to avoid re-rendering entire thread list
  const watchedValue = useWatch({ control, name: `posts.${index}.content` }) ?? post;
  const charCount = watchedValue?.length || 0;
  const detectedUrl = getFirstUrl(watchedValue || "");

  return (
    <div
      draggable={isEditingPosts && dragEnabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative overflow-hidden p-3.5 sm:p-5 rounded-2xl border transition-all duration-300 flex flex-col space-y-3.5 ${
        isEditingPosts
          ? "border-violet-500/80 bg-card/70 dark:bg-violet-950/15 shadow-sm ring-1 ring-violet-500/20"
          : "border-border/80 bg-card/40 backdrop-blur-xs hover:border-violet-500/30 hover:shadow-md"
      } ${isDragging ? "opacity-50 scale-[0.98] border-violet-600 bg-violet-600/10 shadow-xl" : ""}`}
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Top Header Bar: Post Badge, Timeline Position, and Action Controls */}
      <div className="flex items-center justify-between gap-2 w-full pb-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          {/* Post Number Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-linear-to-r from-violet-600/15 to-indigo-600/15 border border-violet-500/30 text-violet-700 dark:text-violet-300 text-xs font-bold select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400 animate-pulse" />
            <span>Post {index + 1}</span>
            <span className="text-muted-foreground/60 font-normal">of {totalPosts}</span>
          </div>

          {/* Desktop Drag Handle (only shown when editing on desktop) */}
          {isEditingPosts && (
            <div
              className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors hidden sm:inline-flex p-1 rounded hover:bg-muted/40"
              onMouseEnter={() => setDragEnabled(true)}
              onMouseLeave={() => setDragEnabled(false)}
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Action Controls */}
        {isEditingPosts ? (
          <div className="flex items-center gap-1.5">
            {/* Reorder Buttons: Move Up & Move Down */}
            <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted/20 p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!onMoveUp}
                onClick={onMoveUp}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed rounded"
                title="Move post up"
                aria-label={`Move post ${index + 1} up`}
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </Button>
              <div className="w-px h-3.5 bg-border/60" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!onMoveDown}
                onClick={onMoveDown}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed rounded"
                title="Move post down"
                aria-label={`Move post ${index + 1} down`}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Remove Post Button */}
            {onRemovePost && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemovePost(index)}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0 rounded-lg cursor-pointer transition-colors"
                title="Remove post"
                aria-label={`Remove post ${index + 1}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ) : (
          <span className="text-[11px] font-medium text-muted-foreground">
            {charCount} chars
          </span>
        )}
      </div>

      {isEditingPosts ? (
        <div className="w-full space-y-3">
          {/* Full-Width Textarea taking 100% of card width */}
          <textarea
            {...register(`posts.${index}.content` as const)}
            rows={4}
            placeholder={`Write post ${index + 1} content here...`}
            className="w-full text-sm bg-background/80 border border-border/80 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-hidden rounded-xl p-3 sm:p-4 resize-y leading-relaxed transition-all placeholder:text-muted-foreground/60 min-h-[115px]"
          />

          {/* Composer Toolbar: Media Triggers on Left, Character Counter on Right */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
            {/* Quick Media Triggers */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {!selectedImages[index.toString()] && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAttachImage(index)}
                  className="h-8 rounded-lg border-dashed border-border/80 hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/5 text-xs transition-colors cursor-pointer px-2.5"
                >
                  <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-violet-500" />
                  Add Image
                </Button>
              )}
              {!selectedVideos[index.toString()] && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAttachVideo(index)}
                  className="h-8 rounded-lg border-dashed border-border/80 hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/5 text-xs transition-colors cursor-pointer px-2.5"
                >
                  <VideoIcon className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                  Add Video
                </Button>
              )}
            </div>

            {/* Character Count & Threads Limit Status */}
            <div className="flex items-center gap-1.5 text-xs ml-auto select-none">
              <span
                className={`font-mono text-xs font-semibold ${
                  charCount > 500
                    ? "text-destructive font-bold"
                    : charCount > 450
                    ? "text-amber-500"
                    : "text-muted-foreground"
                }`}
              >
                {charCount}
                <span className="text-muted-foreground/60 font-normal"> / 500</span>
              </span>
              {charCount > 500 && (
                <span className="text-[10px] bg-destructive/10 text-destructive font-bold px-1.5 py-0.5 rounded">
                  Exceeds limit
                </span>
              )}
            </div>
          </div>

          {/* URL Link Preview */}
          {detectedUrl && <LinkPreviewCard url={detectedUrl} />}

          {/* Attached Image Preview */}
          {selectedImages[index.toString()] && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-border/80 group/image w-full max-w-lg bg-muted/20 animate-in fade-in duration-200">
              <img
                src={selectedImages[index.toString()]}
                alt={`Post ${index + 1} image`}
                className="w-full h-auto max-h-60 object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onAttachImage(index)}
                  className="rounded-lg h-7.5 px-2.5 bg-background/90 hover:bg-background backdrop-blur-xs text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 mr-1" />
                  Change
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemoveImage(index)}
                  className="rounded-lg h-7.5 w-7.5 p-0 bg-red-600/90 hover:bg-red-600 backdrop-blur-xs shadow-xs cursor-pointer"
                  aria-label="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Attached Video Preview */}
          {selectedVideos[index.toString()] && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-border/80 group/video w-full max-w-lg bg-muted/20 animate-in fade-in duration-200">
              <div className="aspect-video w-full bg-black flex items-center justify-center">
                <video
                  src={selectedVideos[index.toString()]}
                  className="w-full h-full object-contain"
                  preload="metadata"
                  controls
                />
              </div>
              <div className="absolute top-2 right-2 flex gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onAttachVideo(index)}
                  className="rounded-lg h-7.5 px-2.5 bg-background/90 hover:bg-background backdrop-blur-xs text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <VideoIcon className="w-3.5 h-3.5 mr-1" />
                  Change
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemoveVideo(index)}
                  className="rounded-lg h-7.5 w-7.5 p-0 bg-red-600/90 hover:bg-red-600 backdrop-blur-xs shadow-xs cursor-pointer"
                  aria-label="Remove video"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground pt-0.5">{watchedValue}</p>

          {/* URL Link Preview */}
          {detectedUrl && <LinkPreviewCard url={detectedUrl} />}

          {/* Selected image preview in non-edit mode */}
          {selectedImages[index.toString()] && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-border/80 max-w-lg bg-muted/20">
              <img
                src={selectedImages[index.toString()]}
                alt={`Post ${index + 1} image`}
                className="w-full h-auto max-h-60 object-cover"
              />
            </div>
          )}

          {/* Selected video preview in non-edit mode */}
          {selectedVideos[index.toString()] && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-border/80 max-w-lg bg-muted/20">
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

      {postCritique?.critique?.trim() && (
        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs mt-1">
          <span className="font-bold flex items-center gap-1.5 mb-1 text-amber-900 dark:text-amber-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            AI Critique
          </span>
          <p className="leading-relaxed font-medium pl-5">{postCritique.critique}</p>
        </div>
      )}
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
    ? fields.map((field) => ({ id: field.id, content: field.content || "" }))
    : posts.map((post, i) => ({ id: i.toString(), content: post }));

  return (
    <CardContent className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 pt-4 sm:pt-6">
      {displayPosts.map((item, index) => {
        const postCritique = postCritiques?.find((pc) => pc.post_index === index + 1);

        return (
          <DraftPostItem
            key={item.id}
            index={index}
            totalPosts={displayPosts.length}
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
            onMoveUp={isEditingPosts && index > 0 ? () => move(index, index - 1) : undefined}
            onMoveDown={isEditingPosts && index < displayPosts.length - 1 ? () => move(index, index + 1) : undefined}
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
          className="w-full rounded-2xl border-2 border-dashed border-border/80 hover:border-violet-500/50 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/5 transition-all py-6 font-semibold flex items-center justify-center gap-2 cursor-pointer"
          onClick={() => append({ content: "" })}
        >
          <Plus className="w-4 h-4" />
          <span>Add New Post to Thread</span>
        </Button>
      )}

      {posts.length === 0 && !isEditingPosts && (
        <p className="text-muted-foreground italic text-center py-6">No draft content generated yet.</p>
      )}
    </CardContent>
  );
}
