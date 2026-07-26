import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

interface ResearchDossierDialogProps {
  researchContext: string;
}

export function ResearchDossierDialog({ researchContext }: ResearchDossierDialogProps) {
  if (!researchContext) return null;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="w-full rounded-xl border-border/80 text-foreground font-bold py-6 hover:bg-violet-600/5 hover:text-violet-600 dark:hover:bg-violet-500/5 dark:hover:text-violet-400 hover:border-violet-500/30 transition-all duration-300 cursor-pointer"
          />
        }
      >
        <FileText className="w-4 h-4 mr-2 text-violet-500" />
        View Research Dossier
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[85vh] p-0 overflow-hidden bg-card/95 backdrop-blur-md flex flex-col rounded-2xl border border-border/30 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/30 shrink-0 bg-muted/10">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground leading-snug flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-500" />
            Research Dossier
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            The full research context and extracted information used to generate this thread.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="prose prose-sm md:prose-base dark:prose-invert prose-violet max-w-none text-foreground/90 font-medium">
            <ReactMarkdown>
              {researchContext}
            </ReactMarkdown>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
