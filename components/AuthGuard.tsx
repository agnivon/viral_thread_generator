"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";

export function AuthLoadingIndicator() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center p-4 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-linear-to-br from-violet-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="relative flex flex-col items-center gap-5 text-center max-w-xs w-full">
        {/* Glowing Brand Pulse Emblem */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-2 rounded-2xl bg-linear-to-r from-violet-600/30 to-indigo-600/30 blur-md animate-pulse" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/20">
            <Sparkles className="h-7 w-7 animate-pulse text-white" />
          </div>
        </div>

        {/* Brand Title & Micro-Status */}
        <div className="space-y-1.5">
          <h2 className="font-extrabold tracking-tight text-base sm:text-lg bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
            Viral Thread Gen
          </h2>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span>Verifying session</span>
            <span className="inline-flex gap-0.5 ml-0.5">
              <span className="h-1 w-1 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1 w-1 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1 w-1 rounded-full bg-violet-500 animate-bounce" />
            </span>
          </div>
        </div>

        {/* Sleek Horizontal Shimmer Progress Track */}
        <div className="w-44 h-1 bg-muted/80 rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-violet-500 to-transparent rounded-full animate-shimmer-slide" />
        </div>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <AuthLoadingIndicator />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
