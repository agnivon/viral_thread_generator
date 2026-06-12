import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <div className="absolute top-4 left-4 z-50">
          <SidebarTrigger />
        </div>
        <div className="flex-1 min-w-0 p-4 pt-12 md:p-8 flex flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
