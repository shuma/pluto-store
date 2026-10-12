import { redirect } from "next/navigation";
import { requireUser, isAdmin } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) redirect("/auth/login");
    throw e;
  }
  return (
    <SidebarProvider>
      <AppSidebar email={user.email ?? ""} admin={isAdmin(user.id)} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)] px-4">
          {/* The toggle lives in the sidebar; on mobile the sidebar is an
              off-canvas sheet, so this is the only way to open it. */}
          <SidebarTrigger className="-ml-1 md:hidden" />
          <Separator orientation="vertical" className="mr-2 h-4 md:hidden" />
          <DashboardBreadcrumb />
        </header>
        <main id="main" className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
