import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationCenter } from "@/components/NotificationCenter";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/30 bg-background/80 px-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter />
          </div>
        </header>
        <div className="flex-1 min-w-0 p-4 md:p-8 flex flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

