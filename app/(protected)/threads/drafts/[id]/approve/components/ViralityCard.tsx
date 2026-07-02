import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

interface ViralityCardProps {
  score: number;
}

export function ViralityCard({ score }: ViralityCardProps) {
  return (
    <Card className="border-border/80 bg-card/45 backdrop-blur-xs shadow-xs hover:border-violet-500/20 transition-all duration-300 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/90">
          <Trophy className="w-4 h-4 text-amber-500" />
          Virality Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-foreground bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
              {score}
            </span>
            <span className="text-xs text-muted-foreground pb-1 font-semibold">out of 100</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                score >= 85
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : score >= 70
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                    : 'bg-gradient-to-r from-rose-500 to-red-500'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            {score >= 85
              ? "Excellent virality potential! This thread is highly engaging and ready to perform."
              : score >= 70
                ? "Good potential. Meets baseline engagement criteria but could be tweaked."
                : "Low potential. Consider reviewing recommendations or generating a new thread."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
