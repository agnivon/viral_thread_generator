import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, Link, HelpCircle } from "lucide-react";

interface VideoPickerDialogProps {
  activeVideoPickerIdx: number | null;
  selectedVideos: Record<string, string>;
  onSelectVideo: (index: number, url: string) => void;
  onDeselectVideo: (index: number) => void;
  onClose: () => void;
}

export function VideoPickerDialog({
  activeVideoPickerIdx,
  selectedVideos,
  onSelectVideo,
  onDeselectVideo,
  onClose,
}: VideoPickerDialogProps) {
  const [customVideoUrl, setCustomVideoUrl] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(true);

  if (activeVideoPickerIdx === null) return null;

  const currentVideo = selectedVideos[activeVideoPickerIdx.toString()];

  const handleClose = () => {
    setCustomVideoUrl("");
    onClose();
  };

  const handleApplyCustomVideo = () => {
    if (customVideoUrl.trim()) {
      onSelectVideo(activeVideoPickerIdx, customVideoUrl.trim());
      setCustomVideoUrl("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden border border-border/80 bg-card/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 space-y-6 flex flex-col max-h-[85vh]">
        <div className="space-y-2 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Video className="w-5 h-5 text-violet-500" />
            Attach Video for Post {activeVideoPickerIdx + 1}
          </h2>
          <p className="text-xs text-muted-foreground">
            Provide a custom URL for the video attachment. Supported formats include direct links like MP4, WebM, etc.
          </p>
        </div>

        <div className="overflow-y-auto pr-1 space-y-6 flex-1">
          {/* Custom Video URL Input */}
          <div className="p-4 bg-muted/20 border border-border/40 rounded-xl space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Custom Video URL
              </label>
              {currentVideo && (
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  ● Currently Active
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/video.mp4"
                value={customVideoUrl}
                onChange={(e) => setCustomVideoUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyCustomVideo();
                  }
                }}
                className="flex-1 h-8 text-xs bg-background text-foreground px-3 rounded-lg border border-border focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 focus:outline-none"
              />
              <Button
                type="button"
                onClick={handleApplyCustomVideo}
                disabled={!customVideoUrl.trim()}
                className="h-8 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 cursor-pointer text-xs shrink-0"
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Current Video Preview or Instructions */}
          {currentVideo ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Video Preview
              </h3>
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-border bg-black flex items-center justify-center relative">
                <video
                  src={currentVideo}
                  controls
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fail gracefully for non-direct video embeds
                    const errorContainer = e.currentTarget.nextElementSibling as HTMLElement;
                    if (errorContainer) errorContainer.style.display = "flex";
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-muted/15 flex-col items-center justify-center p-6 text-center space-y-2 hidden">
                  <Video className="w-8 h-8 text-muted-foreground/60" />
                  <p className="text-xs font-semibold text-muted-foreground">Video preview not available</p>
                  <p className="text-[10px] text-muted-foreground/80 break-all max-w-sm">{currentVideo}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border rounded-xl bg-muted/5 space-y-2">
              <Video className="w-10 h-10 text-muted-foreground/45" />
              <p className="text-sm font-semibold text-muted-foreground">No video attached yet.</p>
              <p className="text-xs text-muted-foreground/80 max-w-xs text-center">
                Paste a public video URL above to preview and attach it to this thread post.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/30 flex-shrink-0">
          {currentVideo && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onDeselectVideo(activeVideoPickerIdx);
                handleClose();
              }}
              className="rounded-xl border-red-500/30 text-red-600 hover:bg-red-500/5 hover:border-red-500/50 px-5 mr-auto font-semibold"
            >
              Remove Video
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleClose}
            className="rounded-xl border-border px-5"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
