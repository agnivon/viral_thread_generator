import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface RegenerateDialogProps {
  isOpen: boolean;
  initialGuidance: string;
  initialManualHookSelection: boolean;
  initialSearchQueryGeneration: boolean;
  isRegenerating: boolean;
  onClose: () => void;
  onRegenerate: (guidance: string, manualHookSelection: boolean, searchQueryGeneration: boolean) => void;
}

export function RegenerateDialog({
  isOpen,
  initialGuidance,
  initialManualHookSelection,
  initialSearchQueryGeneration,
  isRegenerating,
  onClose,
  onRegenerate,
}: RegenerateDialogProps) {
  const [guidance, setGuidance] = useState(initialGuidance);
  const [manualHookSelection, setManualHookSelection] = useState(initialManualHookSelection);
  const [searchQueryGeneration, setSearchQueryGeneration] = useState(initialSearchQueryGeneration);

  useEffect(() => {
    if (isOpen) {
      setGuidance(initialGuidance);
      setManualHookSelection(initialManualHookSelection);
      setSearchQueryGeneration(initialSearchQueryGeneration);
    }
  }, [isOpen, initialGuidance, initialManualHookSelection, initialSearchQueryGeneration]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onRegenerate(guidance, manualHookSelection, searchQueryGeneration);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden border border-border/80 bg-card/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Regenerate Thread
          </h2>
          <p className="text-xs text-muted-foreground">
            Input or modify the existing guidance to direct the AI thread generator.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Generation Guidance
            </label>
            <textarea
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="e.g. Focus on hooks, explain the technical strategy step-by-step, use bullet points..."
              rows={4}
              className="w-full text-sm bg-muted/40 text-foreground p-3.5 rounded-xl border border-border focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 focus:outline-none resize-none"
            />
          </div>

          {/* Choose Hooks Manually Checkbox */}
          <div className="flex items-start space-x-3 pt-2 bg-muted/10 p-3.5 rounded-xl border border-border/30">
            <Checkbox
              id="manual-hook-regenerate"
              checked={manualHookSelection}
              onCheckedChange={(checked) => setManualHookSelection(!!checked)}
              disabled={isRegenerating}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="manual-hook-regenerate"
                className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-75 cursor-pointer text-foreground"
              >
                Choose hooks manually
              </Label>
              <p className="text-xs text-muted-foreground">
                Pause the generation pipeline to choose and edit your hook before generating the full thread.
              </p>
            </div>
          </div>

          {/* Auto-generate Image Search Queries Checkbox */}
          <div className="flex items-start space-x-3 pt-2 bg-muted/10 p-3.5 rounded-xl border border-border/30">
            <Checkbox
              id="search-query-gen-regenerate"
              checked={searchQueryGeneration}
              onCheckedChange={(checked) => setSearchQueryGeneration(!!checked)}
              disabled={isRegenerating}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="search-query-gen-regenerate"
                className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-75 cursor-pointer text-foreground"
              >
                Auto-generate media queries
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically generate highly specific visual search queries for images and videos based on the generated thread content.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRegenerating}
            className="rounded-xl border-border px-5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isRegenerating}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold px-6 shadow-md hover:shadow-lg transition-all duration-300"
          >
            {isRegenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Regenerating...
              </>
            ) : (
              "Submit & Regenerate"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
