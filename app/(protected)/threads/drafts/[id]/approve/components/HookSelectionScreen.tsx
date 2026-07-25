import Link from "next/link";
import { ArrowLeft, Sparkles, Compass, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HookSelectionScreenProps {
  url: string;
  isTopic?: boolean;
  coreHooks: string[];
  selectedHook: string | null;
  selectedHookIdx: number | null;
  editedHookText: string;
  isResuming: boolean;
  onSelectHook: (index: number, text: string) => void;
  onEditHookTextChange: (text: string) => void;
  onConfirmHook: () => void;
}

export function HookSelectionScreen({
  url,
  isTopic,
  coreHooks,
  selectedHook,
  selectedHookIdx,
  editedHookText,
  isResuming,
  onSelectHook,
  onEditHookTextChange,
  onConfirmHook,
}: HookSelectionScreenProps) {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background Mesh Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-gradient-to-b from-violet-500/5 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="container max-w-4xl mx-auto py-12 px-4 space-y-8">
        {/* Navigation Link */}
        <div className="flex items-center gap-2">
          <Link 
            href="/threads/drafts" 
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Drafts
          </Link>
        </div>

        {/* Header Section */}
        <div className="space-y-2 border-b border-border/30 pb-6">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
              Choose Your Hook
            </span>
          </h1>
          <p className="text-sm text-muted-foreground break-all">
            Pipeline paused for:{" "}
            {isTopic ? (
              <span className="font-medium text-foreground">{url}</span>
            ) : (
              <a 
                href={url} 
                target="_blank" 
                rel="noreferrer" 
                className="underline hover:text-violet-600 dark:hover:text-violet-400 transition-colors break-all font-medium"
              >
                {url}
              </a>
            )}
          </p>
        </div>

        <div className="space-y-8">
          {/* Candidate Hooks Grid */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              Candidate Hooks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coreHooks.map((hook, index) => {
                const isSelected = selectedHookIdx === index;
                return (
                  <div
                    key={index}
                    onClick={() => onSelectHook(index, hook)}
                    className={`group relative overflow-hidden p-5 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "border-violet-500 bg-violet-500/5 shadow-md animate-in fade-in duration-200"
                        : "border-border/80 bg-card/40 backdrop-blur-xs hover:border-violet-500/30 hover:bg-muted/10"
                    }`}
                  >
                    <div className="flex gap-4 items-start">
                      <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-black shadow-xs select-none transition-colors ${
                        isSelected
                          ? "bg-violet-600 text-white"
                          : "bg-muted text-muted-foreground group-hover:bg-violet-100 group-hover:text-violet-800 dark:group-hover:bg-violet-950 dark:group-hover:text-violet-300"
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm leading-relaxed text-foreground font-medium flex-1">
                            {hook}
                          </p>
                          {selectedHook === hook && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400 border border-violet-500/20 shadow-xs uppercase tracking-wider select-none shrink-0 mt-0.5 animate-pulse">
                              Selected
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-medium block pt-2 select-none ${
                          hook.length > 500 ? "text-destructive font-semibold" : "text-muted-foreground"
                        }`}>
                          {hook.length} character{hook.length !== 1 ? 's' : ''} {hook.length > 500 && "(Exceeds 500 limit)"}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-violet-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
              {coreHooks.length === 0 && (
                <Card className="col-span-full border-dashed border-border/80 bg-muted/5 p-8 text-center rounded-2xl">
                  <p className="text-sm text-muted-foreground italic">No candidate hooks found for this source.</p>
                </Card>
              )}
            </div>
          </div>

          {/* Customizer & Action Card */}
          <Card className="border-border/80 bg-card/45 backdrop-blur-xs shadow-xs rounded-2xl overflow-hidden w-full">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground/90">
                <Compass className="w-5 h-5 text-violet-500" />
                Customize and Confirm Hook
              </CardTitle>
              <CardDescription>
                Refine the selected hook text below to dictate the exact angle for the thread.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Hook Text
                </label>
                <textarea
                  value={editedHookText}
                  onChange={(e) => onEditHookTextChange(e.target.value)}
                  placeholder="Select a hook card or type a custom one..."
                  rows={8}
                  className="w-full text-base bg-muted/40 text-foreground p-5 rounded-xl border border-border focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 focus:outline-none resize-y leading-relaxed"
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                  <span className={editedHookText.length > 500 ? "text-destructive font-bold animate-pulse" : "font-medium"}>
                    {editedHookText.length} / 500 characters
                  </span>
                  {editedHookText.length > 500 ? (
                    <span className="text-destructive font-bold">Exceeds Threads limit (500)</span>
                  ) : (
                    <span>{500 - editedHookText.length} remaining</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={onConfirmHook}
                  disabled={isResuming || !editedHookText.trim()}
                  className="w-full sm:w-auto sm:min-w-[280px] rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold py-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                  size="lg"
                >
                  {isResuming ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Drafting Thread...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 text-white" /> Confirm & Draft Thread
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
