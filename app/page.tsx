import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Sparkles, Layers, Zap, BarChart3, ChevronRight } from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      name: "Batch Generation",
      description: "Enter multiple article or newsletter URLs and generate high-converting drafts in parallel.",
      icon: Layers,
      color: "text-indigo-500 bg-indigo-500/10",
    },
    {
      name: "Virality Scoring",
      description: "Evaluate your threads in real-time with an advanced engagement and impact estimation rubric.",
      icon: BarChart3,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      name: "Post Critiques",
      description: "Get granular, post-specific recommendations from AI judges detailing hooks, flow, and formatting.",
      icon: Zap,
      color: "text-amber-500 bg-amber-500/10",
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
      {/* Background Mesh Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-violet-500/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl w-full text-center space-y-12">
        {/* Logo and Intro Badge */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400 text-xs font-semibold tracking-wide animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen AI Creator Studio
          </div>
          
          {/* Main Hero Header */}
          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400 leading-none block pb-2">
              Viral Thread Generator
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Create high-performing, engaging Threads sequences from any source link in seconds. Connect your audience and skyrocket your reach.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
          <Link 
            href="/login" 
            className={`${buttonVariants({ size: "lg" })} rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-6 px-8 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer`}
          >
            Start Generating Now
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Features Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div 
                key={idx} 
                className="group relative overflow-hidden p-6 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-xs hover:border-violet-500/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className={`inline-flex items-center justify-center p-3 rounded-xl ${feature.color} mb-4 group-hover:scale-105 transition-transform duration-300`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {feature.name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
