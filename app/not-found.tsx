import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Home } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The page you are looking for does not exist on Viral Thread Generator.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground text-center">
      {/* Background Mesh Gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-96 bg-linear-to-br from-violet-500/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="space-y-6 max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-lg">
          <Sparkles className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-black tracking-tight bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
            404
          </h1>
          <h2 className="text-2xl font-bold">Page Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The page you requested could not be found or may have moved.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/">
            <Button className="rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-xs cursor-pointer gap-2">
              <Home className="w-4 h-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
