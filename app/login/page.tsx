"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Mail, Lock, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Turnstile } from "@marsidev/react-turnstile";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);

  const loginMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      await signIn("password", formData);
    },
    onError: (err: any) => {
      const msg = err?.message || "Invalid email or password";
      setError(msg);
      toast.error(msg);
      // Reset Turnstile widget on failure
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    },
  });

  const isLoading = loginMutation.isPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!turnstileToken) {
      const msg = "Please complete the CAPTCHA verification.";
      setError(msg);
      toast.error(msg);
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.append("token", turnstileToken);
    
    loginMutation.mutate(formData);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-background overflow-hidden">
      {/* Background Mesh Decorative Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-gradient-to-br from-violet-500/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <Card className="group relative w-full max-w-sm overflow-hidden bg-card/45 backdrop-blur-xs border-border/80 hover:border-violet-500/30 hover:shadow-lg transition-all duration-300">
        {/* Accent Highlight Line on Card Hover */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <CardHeader className="space-y-3 pb-6 text-center border-b border-border/30 bg-muted/10">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
              Sign In
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-muted-foreground/80">
              Enter your credentials to access your account.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            
            {/* Email Input */}
            <div className="space-y-2">
              <Label 
                htmlFor="email" 
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-500" /> Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                autoComplete="email"
                disabled={isLoading}
                className="w-full bg-background/50 border-border/80 focus-visible:ring-violet-500/30 focus-visible:border-violet-500 rounded-lg transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label 
                htmlFor="password" 
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-violet-500" /> Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full bg-background/50 border-border/80 focus-visible:ring-violet-500/30 focus-visible:border-violet-500 rounded-lg transition-all"
              />
            </div>
            
            <input name="flow" type="hidden" value="signIn" />
            
            {/* Turnstile CAPTCHA */}
            <div className="w-full my-1">
              <Turnstile
                ref={turnstileRef}
                siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY!}
                options={{
                  size: "flexible",
                }}
                onSuccess={(token) => {
                  setTurnstileToken(token);
                  setError(null);
                }}
                onError={() => {
                  toast.error("Security verification failed to load.");
                }}
                onExpire={() => {
                  setTurnstileToken(null);
                }}
              />
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="text-xs text-destructive text-center p-2.5 border border-destructive/20 rounded-lg bg-destructive/10">
                {error}
              </div>
            )}
            
            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
