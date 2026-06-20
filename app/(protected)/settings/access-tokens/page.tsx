"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { initiateThreadsAuth } from "@/app/actions/threadsAuth";
import { Loader2, CheckCircle2, XCircle, Settings, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AccessTokensPage() {
  const isThreadsConnected = useQuery(api.queries.tokensQueries.hasActiveToken, {
    platform: "threads",
    type: "long lived",
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-10">
      {/* Header Section */}
      <div className="space-y-2 border-b border-border/30 pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
            Access Tokens
          </span>
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Manage your external platform credentials and API connections securely.
        </p>
      </div>

      <Card className="group relative overflow-hidden bg-card/45 backdrop-blur-xs border-border/80 hover:border-violet-500/30 hover:shadow-lg transition-all duration-300">
        {/* Accent Highlight Line on Card Hover */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <CardHeader className="p-6 border-b border-border/30 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Connected Platforms</CardTitle>
              <CardDescription className="text-xs">
                Authorize external services to automatically publish your generated thread sequences.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-border/80 rounded-xl bg-background/40 hover:bg-muted/10 transition-colors gap-4">
            <div className="space-y-1.5">
              <p className="font-bold text-base text-foreground">Threads API</p>
              
              {isThreadsConnected === undefined ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md bg-muted text-muted-foreground animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking connection...
                </span>
              ) : isThreadsConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-muted text-muted-foreground">
                  <XCircle className="w-3.5 h-3.5" /> Not Connected
                </span>
              )}
            </div>
            
            <form action={initiateThreadsAuth} className="w-full sm:w-auto">
              <Button 
                type="submit" 
                variant={isThreadsConnected ? "outline" : "default"}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 cursor-pointer ${
                  isThreadsConnected 
                    ? "border-border/85 hover:bg-violet-600/5 hover:text-violet-600 dark:hover:bg-violet-500/5 dark:hover:text-violet-400 hover:border-violet-500/30" 
                    : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
                }`}
              >
                {isThreadsConnected ? "Reconnect Account" : "Connect Account"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
