import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-11 items-center justify-between gap-2 border-b bg-background px-3">
            <SidebarTrigger className="text-muted-foreground" />
            <span className="microlabel tnum text-[10px] text-muted-foreground/70">{today}</span>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
