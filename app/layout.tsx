import type { Metadata } from "next";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://viral-thread-generator.vercel.app"
  ),
  title: {
    default: "Viral Thread Generator - Next-Gen AI Creator Studio",
    template: "%s | Viral Thread Generator",
  },
  description: "Create high-performing, engaging Threads sequences from any source link in seconds. Connect your audience and skyrocket your reach.",
  keywords: [
    "viral threads",
    "threads generator",
    "twitter threads",
    "social media growth",
    "AI creator studio",
    "threads app",
    "engagement booster",
    "content creator tools",
  ],
  authors: [{ name: "Viral Thread Generator Team" }],
  openGraph: {
    title: "Viral Thread Generator - Next-Gen AI Creator Studio",
    description: "Create high-performing, engaging Threads sequences from any source link in seconds. Connect your audience and skyrocket your reach.",
    url: "https://viral-thread-generator.vercel.app",
    siteName: "Viral Thread Generator",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Viral Thread Generator - Next-Gen AI Creator Studio",
    description: "Create high-performing, engaging Threads sequences from any source link in seconds. Connect your audience and skyrocket your reach.",
    creator: "@viral_threads",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
        <body className="min-w-[320px]">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ConvexClientProvider>{children}</ConvexClientProvider>
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
