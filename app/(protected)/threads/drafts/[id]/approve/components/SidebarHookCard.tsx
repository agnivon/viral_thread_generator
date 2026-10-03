"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass, ChevronDown, ChevronUp } from "lucide-react";

interface SidebarHookCardProps {
  selectedHook: string | null;
  coreHooks: string[];
}

export function SidebarHookCard({ selectedHook, coreHooks }: SidebarHookCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border-border/80 bg-card/45 backdrop-blur-xs shadow-xs hover:border-violet-500/20 transition-all duration-300 rounded-2xl">
      <CardHeader className="p-4 sm:p-5 pb-2.5">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
          <Compass className="w-4 h-4 text-violet-500" />
          Hook Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0 space-y-3.5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              Active Hook (Post 1)
            </h4>
            {selectedHook && (
              <span className="text-[10px] text-muted-foreground font-medium select-none">
                {selectedHook.length} chars
              </span>
            )}
          </div>
          <p className="text-xs bg-muted/60 p-3 rounded-xl border border-border/60 font-medium text-foreground leading-relaxed">
            {selectedHook || "None selected"}
          </p>
        </div>

        {coreHooks.length > 0 && (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-xs font-semibold text-violet-700 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200 bg-violet-500/5 hover:bg-violet-500/10 p-2.5 rounded-xl border border-violet-500/20 transition-all cursor-pointer select-none"
              aria-expanded={isExpanded}
            >
              <span className="flex items-center gap-1.5">
                <span>Other Candidate Hooks</span>
                <span className="text-[10px] bg-violet-500/20 px-1.5 py-0.5 rounded-full font-bold">
                  {coreHooks.length}
                </span>
              </span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {isExpanded && (
              <ul className="space-y-2 mt-2.5 animate-in fade-in-50 duration-200">
                {coreHooks.map((hook, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40 flex flex-col gap-1 leading-relaxed"
                  >
                    <div className="flex items-start gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                      <span>{hook}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground/80 font-medium self-end select-none">
                      {hook.length} characters
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
