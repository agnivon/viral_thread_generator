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
      <main className="flex-1 w-full relative">
        <div className="absolute top-4 left-4 z-50">
          <SidebarTrigger />
        </div>
        <div className="p-4 pt-12 md:p-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
