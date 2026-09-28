import { useState, useEffect } from "react";
import { Sparkles, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface IterateDialogProps {
  isOpen: boolean;
  currentScore?: number;
  currentCritique?: string;
  currentIterations: number;
  isIterating: boolean;
  hasManualEdits: boolean;
  onClose: () => void;
  onIterate: (guidance: string, useCurrentEdits: boolean) => void;
}

export function IterateDialog({
  isOpen,
  currentScore,
  currentCritique,
  currentIterations,
  isIterating,
  hasManualEdits,
  onClose,
  onIterate,
}: IterateDialogProps) {
  const [guidance, setGuidance] = useState("");
  const [useCurrentEdits, setUseCurrentEdits] = useState(hasManualEdits);

  useEffect(() => {
    if (isOpen) {
      setGuidance("");
      setUseCurrentEdits(hasManualEdits);
    }
  }, [isOpen, hasManualEdits]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isIterating) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isIterating, onClose]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onIterate(guidance.trim(), useCurrentEdits);
  };

  const isSoftCapExceeded = currentIterations >= 5;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isIterating) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden border border-border/80 bg-card/90 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
              <RefreshCw className="w-5 h-5 text-violet-500" />
              Run Additional Iteration
            </h2>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/50">
                Iteration {currentIterations}
              </span>
              {currentScore !== undefined && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    currentScore >= 85
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : currentScore >= 70
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                  }`}
                >
                  Score: {currentScore}/100
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Feed your current thread and critic feedback back into the Thread Writer and Virality Critic for another focused refinement loop.
          </p>
        </div>

        {/* Soft Cap Warning if >= 5 iterations */}
        {isSoftCapExceeded && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <p className="font-semibold">Iteration Soft Cap Reached ({currentIterations} iterations)</p>
              <p className="opacity-90">
                This draft has already undergone {currentIterations} refinement passes. Additional iterations will consume LLM tokens.
              </p>
            </div>
          </div>
        )}

        {/* Previous Critique Context Snapshot */}
        {currentCritique && currentCritique.trim().length > 0 && (
          <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border/40">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Previous AI Critique
            </span>
            <p className="text-xs text-foreground italic line-clamp-3 pl-2.5 border-l-2 border-amber-500/50">
              "{currentCritique}"
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Additional Directives (Optional)
            </label>
            <textarea
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="e.g. Focus more on the data contrast in post 2, make the hook sharper, use a punchier organic closer..."
              rows={3}
              className="w-full text-sm bg-muted/40 text-foreground p-3 rounded-xl border border-border focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 focus:outline-none resize-none"
            />
          </div>

          {/* Include Manual Edits Checkbox */}
          {hasManualEdits && (
            <div className="flex items-start space-x-3 pt-1 bg-violet-500/5 p-3 rounded-xl border border-violet-500/20">
              <Checkbox
                id="use-current-edits-iterate"
                checked={useCurrentEdits}
                onCheckedChange={(checked) => setUseCurrentEdits(!!checked)}
                disabled={isIterating}
              />
              <div className="grid gap-1 leading-none">
                <Label
                  htmlFor="use-current-edits-iterate"
                  className="text-xs font-semibold leading-none cursor-pointer text-foreground flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
                  Build upon your manual edits
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Pass your modified posts as the baseline so the writer refines your edited copy rather than the original draft.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isIterating}
            className="w-full sm:w-auto rounded-xl border-border px-5 cursor-pointer py-2.5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isIterating}
            className="w-full sm:w-auto rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold px-6 shadow-sm hover:shadow-md cursor-pointer py-2.5"
          >
            {isIterating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refining...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Iteration {currentIterations + 1}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
