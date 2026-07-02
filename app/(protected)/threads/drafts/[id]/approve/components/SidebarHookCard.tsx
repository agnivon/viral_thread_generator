import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass } from "lucide-react";

interface SidebarHookCardProps {
  selectedHook: string | null;
  coreHooks: string[];
}

export function SidebarHookCard({ selectedHook, coreHooks }: SidebarHookCardProps) {
  return (
    <Card className="border-border/80 bg-card/45 backdrop-blur-xs shadow-xs hover:border-violet-500/20 transition-all duration-300 rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
          <Compass className="w-4 h-4 text-violet-500" />
          Hook Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-1">
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 select-none">Selected Hook</h4>
          <p className="text-xs bg-muted/60 p-3.5 rounded-xl border border-border/60 font-medium text-foreground leading-relaxed">
            {selectedHook || "None selected"}
          </p>
          {selectedHook && (
            <span className="text-[10px] text-muted-foreground font-medium block pt-1 select-none text-right">
              {selectedHook.length} characters
            </span>
          )}
        </div>
        {coreHooks.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 select-none">Other Hooks Considered</h4>
            <ul className="space-y-2">
              {coreHooks.map((hook, i) => (
                <li key={i} className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40 flex flex-col gap-1 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                    <span>{hook}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/80 font-medium self-end select-none">
                    {hook.length} characters
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
