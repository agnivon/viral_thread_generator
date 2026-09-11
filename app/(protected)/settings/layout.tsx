"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Trend Alerts & Niches",
      href: "/settings/trend-alerts",
      icon: Bell,
    },
    {
      name: "Connected Platforms",
      href: "/settings/access-tokens",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8">
      {/* Header Section */}
      <div className="space-y-1.5 border-b border-border/30 pb-5">
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="bg-linear-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
            Settings
          </span>
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Configure real-time trend alert personalization, focus niches, and platform integrations.
        </p>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-4 -mb-5 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 rounded-t-lg",
                  isActive
                    ? "border-violet-600 text-violet-600 dark:text-violet-400 bg-violet-500/5 font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
