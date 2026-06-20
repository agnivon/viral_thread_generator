"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Home, FileText, Settings, LogOut, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "./ui/button";

export function AppSidebar() {
  const { signOut } = useAuthActions();
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Drafts", href: "/threads/drafts", icon: FileText },
    { name: "Settings", href: "/settings/access-tokens", icon: Settings },
  ];

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-6 border-b border-border/30 bg-muted/10">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm group-hover:scale-105 transition-transform duration-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight text-sm leading-none bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
              Viral Thread Gen
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 font-semibold uppercase tracking-wider">
              Creator Studio
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="gap-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      className={`rounded-xl px-3 py-2.5 transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-violet-600/10 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 font-semibold shadow-xs"
                          : "hover:bg-muted/60 hover:text-foreground text-muted-foreground"
                      }`}
                    >
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`} />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/30 bg-muted/5">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl py-5 transition-all duration-250 cursor-pointer" 
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
