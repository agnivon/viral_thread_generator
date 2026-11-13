import { useState, useEffect } from "react";
import { Sparkles, Loader2, SlidersHorizontal, BarChart3, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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

          {/* Choose Hooks Manually Toggle Card */}
          <label
            htmlFor="manual-hook-regenerate"
            className={cn(
              "group relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
              manualHookSelection
                ? "bg-violet-500/[0.08] dark:bg-violet-950/25 border-violet-500/60 shadow-xs shadow-violet-500/10 ring-1 ring-violet-500/30"
                : "bg-muted/10 border-border/40 hover:border-violet-500/30 hover:bg-muted/20",
              isRegenerating && "opacity-60 cursor-not-allowed"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center justify-center size-8 rounded-lg transition-colors",
                    manualHookSelection
                      ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                      : "bg-muted text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  <SlidersHorizontal className="size-4" />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-colors",
                    manualHookSelection
                      ? "bg-violet-500/15 text-violet-600 dark:text-violet-300 font-semibold"
                      : "bg-muted/60 text-muted-foreground/75"
                  )}
                >
                  Interactive
                </span>
              </div>
              <Switch
                id="manual-hook-regenerate"
                checked={manualHookSelection}
                onCheckedChange={(checked) => setManualHookSelection(Boolean(checked))}
                disabled={isRegenerating}
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors block">
                Choose hooks manually
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pause the generation pipeline to choose and edit your hook before generating the full thread.
              </p>
            </div>
          </label>

          {/* Auto-generate Editorial Infographics Toggle Card */}
          <label
            htmlFor="infographic-gen-regenerate"
            className={cn(
              "group relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
              infographicGeneration
                ? "bg-violet-500/[0.08] dark:bg-violet-950/25 border-violet-500/60 shadow-xs shadow-violet-500/10 ring-1 ring-violet-500/30"
                : "bg-muted/10 border-border/40 hover:border-violet-500/30 hover:bg-muted/20",
              isRegenerating && "opacity-60 cursor-not-allowed"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center justify-center size-8 rounded-lg transition-colors",
                    infographicGeneration
                      ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                      : "bg-muted text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  <BarChart3 className="size-4" />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-colors",
                    infographicGeneration
                      ? "bg-violet-500/15 text-violet-600 dark:text-violet-300 font-semibold"
                      : "bg-muted/60 text-muted-foreground/75"
                  )}
                >
                  Visual Card
                </span>
              </div>
              <Switch
                id="infographic-gen-regenerate"
                checked={infographicGeneration}
                onCheckedChange={(checked) => setInfographicGeneration(Boolean(checked))}
                disabled={isRegenerating}
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors block">
                Generate Editorial Infographic
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Design and generate a high-authority data infographic card (FT / Bloomberg style) for this thread.
              </p>
            </div>
          </label>

          {/* Deep Discovery Agent Toggle Card */}
          <label
            htmlFor="discovery-agent-regenerate"
            className={cn(
              "group relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
              discoveryAgent
                ? "bg-violet-500/[0.08] dark:bg-violet-950/25 border-violet-500/60 shadow-xs shadow-violet-500/10 ring-1 ring-violet-500/30"
                : "bg-muted/10 border-border/40 hover:border-violet-500/30 hover:bg-muted/20",
              isRegenerating && "opacity-60 cursor-not-allowed"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center justify-center size-8 rounded-lg transition-colors",
                    discoveryAgent
                      ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                      : "bg-muted text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  <Radar className="size-4" />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-colors",
                    discoveryAgent
                      ? "bg-violet-500/15 text-violet-600 dark:text-violet-300 font-semibold"
                      : "bg-muted/60 text-muted-foreground/75"
                  )}
                >
                  Forensic Lens
                </span>
              </div>
              <Switch
                id="discovery-agent-regenerate"
                checked={discoveryAgent}
                onCheckedChange={(checked) => setDiscoveryAgent(Boolean(checked))}
                disabled={isRegenerating}
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors block">
                Deep Discovery Agent
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hunt for non-obvious angles using 5 structural forensic lenses (BOM paradox, stagecraft, supply chain, thermals/trade-offs, regulations).
              </p>
            </div>
          </label>
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
