import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Link } from "lucide-react";
import { getImageQualityInfo } from "../utils";

interface ImagePickerDialogProps {
  activeImagePickerIdx: number | null;
  images?: string[];
  selectedImages: Record<string, string>;
  onSelectImage: (index: number, url: string) => void;
  onDeselectImage: (index: number) => void;
  onClose: () => void;
}

export function ImagePickerDialog({
  activeImagePickerIdx,
  images,
  selectedImages,
  onSelectImage,
  onDeselectImage,
  onClose,
}: ImagePickerDialogProps) {
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  if (activeImagePickerIdx === null) return null;

  const handleClose = () => {
    setCustomImageUrl("");
    setShowCustomInput(false);
    onClose();
  };

  const handleApplyCustomImage = () => {
    if (customImageUrl.trim()) {
      onSelectImage(activeImagePickerIdx, customImageUrl.trim());
      setCustomImageUrl("");
      setShowCustomInput(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden border border-border/80 bg-card/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 space-y-6 flex flex-col max-h-[85vh]">
        <div className="space-y-2 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <ImageIcon className="w-5 h-5 text-violet-500" />
            Select Image for Post {activeImagePickerIdx + 1}
          </h2>
          <p className="text-xs text-muted-foreground">
            Choose an image extracted from the source URL or enter a custom image URL below.
          </p>
        </div>

        <div className="overflow-y-auto pr-1 space-y-4 flex-1">
          {/* Custom Image URL Input */}
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="w-full py-4 border border-dashed border-border hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground transition-all duration-300 cursor-pointer"
            >
              <Link className="w-4 h-4 text-violet-500" />
              Provide a Custom Image URL
            </button>
          ) : (
            <div className="p-4 bg-muted/20 border border-border/40 rounded-xl space-y-3 flex-shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Custom Image URL
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomImageUrl("");
                  }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyCustomImage();
                    }
                  }}
                  className="flex-1 h-8 text-xs bg-background text-foreground px-3 rounded-lg border border-border focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 focus:outline-none"
                />
                <Button
                  type="button"
                  onClick={handleApplyCustomImage}
                  disabled={!customImageUrl.trim()}
                  className="h-8 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 cursor-pointer text-xs shrink-0"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}

          {images && images.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {images.map((url, idx) => {
                const quality = getImageQualityInfo(url);
                const isSelected = selectedImages[activeImagePickerIdx.toString()] === url;
                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      onSelectImage(activeImagePickerIdx, url);
                      handleClose();
                    }}
                    className={`group relative overflow-hidden rounded-xl border p-3 flex flex-col justify-between gap-3 cursor-pointer transition-all duration-300 hover:shadow-md ${
                      isSelected 
                        ? "border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/50" 
                        : "border-border/60 bg-muted/20 hover:border-violet-500/30 hover:bg-muted/40"
                    }`}
                  >
                    <div className="aspect-video w-full rounded-lg overflow-hidden border border-border/40 bg-black/5 dark:bg-white/5 flex items-center justify-center relative">
                      <img 
                        src={url} 
                        alt={`scraped image ${idx + 1}`} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-violet-600/10 backdrop-blur-xs flex items-center justify-center">
                          <span className="bg-violet-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider animate-in zoom-in duration-200">
                            Selected
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-xs flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-foreground/90">{quality.type} format</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                            quality.score === "High" 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                              : quality.score === "Medium"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}>
                            {quality.score} Quality
                          </span>
                        </div>
                        <p className="text-muted-foreground font-medium truncate">{quality.resolution}</p>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex justify-between items-center text-[10px] text-muted-foreground">
                        <span className="truncate max-w-[120px] font-mono">{quality.host}</span>
                        <Button
                          type="button"
                          variant={isSelected ? "secondary" : "default"}
                          size="xs"
                          className="h-7 rounded-lg text-[11px] px-3 font-semibold pointer-events-none"
                        >
                          {isSelected ? "Active" : "Choose"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-border rounded-xl bg-muted/5">
              <p className="text-sm text-muted-foreground">No images extracted from this source URL.</p>
              <p className="text-xs text-muted-foreground/80 mt-1">You can still attach your own custom image by pasting its URL above.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/30 flex-shrink-0">
          {selectedImages[activeImagePickerIdx.toString()] && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onDeselectImage(activeImagePickerIdx);
                handleClose();
              }}
              className="rounded-xl border-red-500/30 text-red-600 hover:bg-red-500/5 hover:border-red-500/50 px-5 mr-auto font-semibold"
            >
              Deselect Image
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
