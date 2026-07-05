import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useSuspenseQuery } from "@tanstack/react-query";
import { currentUserQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    await context.queryClient.ensureQueryData(currentUserQuery);
    return { user: data.user };
  },
  component: AuthenticatedShell,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Failed to load: {error.message}</div>
  ),
});

function AuthenticatedShell() {
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const navigate = useNavigate();

  useEffect(() => {
    if (me?.profile?.must_change_password) {
      navigate({ to: "/auth/change-password" });
    }
  }, [me, navigate]);

  const today = new Date()
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <SidebarProvider
      defaultOpen={false}
      style={{ "--sidebar-width": "13.5rem" } as React.CSSProperties}
    >
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-[3px] border border-border/70 bg-card/85 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
            <SidebarTrigger className="text-muted-foreground md:hidden" />
            <span className="microlabel tnum text-[10px] font-semibold text-foreground/80">
              {today}
            </span>
            <ThemeToggle />
          </div>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
