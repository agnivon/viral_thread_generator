import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface RegenerateDialogProps {
  isOpen: boolean;
  initialGuidance: string;
  initialManualHookSelection: boolean;
  initialSearchQueryGeneration?: boolean;
  initialInfographicGeneration?: boolean;
  initialDiscoveryAgent?: boolean;
  isRegenerating: boolean;
  onClose: () => void;
  onRegenerate: (
    guidance: string,
    manualHookSelection: boolean,
    infographicGeneration: boolean,
    discoveryAgent: boolean
  ) => void;
}

export function RegenerateDialog({
  isOpen,
  initialGuidance,
  initialManualHookSelection,
  initialSearchQueryGeneration,
  initialInfographicGeneration,
  initialDiscoveryAgent,
  isRegenerating,
  onClose,
  onRegenerate,
}: RegenerateDialogProps) {
  const effectiveInitialInfographic = initialInfographicGeneration ?? initialSearchQueryGeneration ?? false;
  const [guidance, setGuidance] = useState(initialGuidance);
  const [manualHookSelection, setManualHookSelection] = useState(initialManualHookSelection);
  const [infographicGeneration, setInfographicGeneration] = useState(effectiveInitialInfographic);
  const [discoveryAgent, setDiscoveryAgent] = useState(initialDiscoveryAgent ?? false);

  useEffect(() => {
    if (isOpen) {
      setGuidance(initialGuidance);
      setManualHookSelection(initialManualHookSelection);
      setInfographicGeneration(initialInfographicGeneration ?? initialSearchQueryGeneration ?? false);
      setDiscoveryAgent(initialDiscoveryAgent ?? false);
    }
  }, [
    isOpen,
    initialGuidance,
    initialManualHookSelection,
    initialSearchQueryGeneration,
    initialInfographicGeneration,
    initialDiscoveryAgent,
  ]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onRegenerate(guidance, manualHookSelection, infographicGeneration, discoveryAgent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden border border-border/80 bg-card/90 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="space-y-1.5 sm:space-y-2">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
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

          {/* Auto-generate Editorial Infographics Checkbox */}
          <div className="flex items-start space-x-3 pt-2 bg-muted/10 p-3.5 rounded-xl border border-border/30">
            <Checkbox
              id="infographic-gen-regenerate"
              checked={infographicGeneration}
              onCheckedChange={(checked) => setInfographicGeneration(!!checked)}
              disabled={isRegenerating}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="infographic-gen-regenerate"
                className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-75 cursor-pointer text-foreground"
              >
                Generate Editorial Infographic
              </Label>
              <p className="text-xs text-muted-foreground">
                Design and generate a high-authority data infographic card (FT / Bloomberg style) for this thread.
              </p>
            </div>
          </div>

          {/* Deep Discovery Agent Checkbox */}
          <div className="flex items-start space-x-3 pt-2 bg-muted/10 p-3.5 rounded-xl border border-border/30">
            <Checkbox
              id="discovery-agent-regenerate"
              checked={discoveryAgent}
              onCheckedChange={(checked) => setDiscoveryAgent(!!checked)}
              disabled={isRegenerating}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="discovery-agent-regenerate"
                className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-75 cursor-pointer text-foreground"
              >
                Deep Discovery Agent
              </Label>
              <p className="text-xs text-muted-foreground">
                Hunt for non-obvious angles using 5 structural forensic lenses (BOM paradox, stagecraft, supply chain, thermals/trade-offs, regulations).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRegenerating}
            className="w-full sm:w-auto rounded-xl border-border px-5 cursor-pointer py-2.5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isRegenerating}
            className="w-full sm:w-auto rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold px-6 py-2.5 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
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
