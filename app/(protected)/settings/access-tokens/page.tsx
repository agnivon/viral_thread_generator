"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { initiateThreadsAuth } from "@/app/actions/threadsAuth";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AccessTokensPage() {
  const isThreadsConnected = useQuery(api.queries.tokensQueries.hasActiveToken, {
    platform: "threads",
    type: "long lived",
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Access Tokens</h1>
      <p className="text-muted-foreground mb-8">Manage your API keys and external account connections.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Connected Platforms</CardTitle>
          <CardDescription>
            Connect external accounts to automatically publish your threads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Threads</p>
              {isThreadsConnected === undefined ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking status...
                </p>
              ) : isThreadsConnected ? (
                <p className="text-sm text-green-600 font-medium mt-1">Connected</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">Not connected</p>
              )}
            </div>
            
            <form action={initiateThreadsAuth}>
              <Button type="submit" variant={isThreadsConnected ? "outline" : "default"}>
                {isThreadsConnected ? "Reconnect Threads" : "Connect Threads"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
