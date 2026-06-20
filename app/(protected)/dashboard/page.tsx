import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { PenSquare, FileText, Sparkles, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-10">
      {/* Header Section */}
      <div className="space-y-2 border-b border-border/30 pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
            Dashboard
          </span>
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Welcome to your creator space. Generate, manage, and publish your viral threads.
        </p>
      </div>
      
      {/* Quick Action Cards Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Create Thread Card */}
        <Card className="group relative overflow-hidden bg-card/45 backdrop-blur-xs border-border/80 hover:border-violet-500/30 hover:shadow-lg transition-all duration-300">
          {/* Accent Highlight Line on Hover */}
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <CardHeader className="p-6">
            <div className="inline-flex items-center justify-center p-3 bg-violet-500/10 rounded-xl text-violet-600 dark:text-violet-400 mb-4 group-hover:scale-105 transition-transform duration-300">
              <PenSquare className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              Create Threads
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
              Generate batch thread sequences from content links or URLs with custom instructions.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <Link 
              href="/threads/create" 
              className={`${buttonVariants({ className: "w-full text-sm font-semibold py-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer" })}`}
            >
              Start Creating
              <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </CardContent>
        </Card>

        {/* Drafts Card */}
        <Card className="group relative overflow-hidden bg-card/45 backdrop-blur-xs border-border/80 hover:border-indigo-500/30 hover:shadow-lg transition-all duration-300">
          {/* Accent Highlight Line on Hover */}
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <CardHeader className="p-6">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-105 transition-transform duration-300">
              <FileText className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Review Drafts
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
              Browse, analyze virality potential, review post critiques, and publish drafts.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <Link 
              href="/threads/drafts" 
              className={`${buttonVariants({ variant: "outline", className: "w-full text-sm font-semibold py-6 rounded-xl border-border/80 hover:bg-muted/50 hover:shadow-xs transition-all duration-300 cursor-pointer" })}`}
            >
              Browse Drafts
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
