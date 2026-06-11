import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 w-full relative flex flex-col min-h-svh">
        <div className="absolute top-4 left-4 z-50">
          <SidebarTrigger />
        </div>
        <div className="flex-1 p-4 pt-12 md:p-8 flex flex-col">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
