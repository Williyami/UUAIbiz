import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ProfileWidgetProvider } from "@/components/shared/profile-widget-context";
import { useSuspenseQuery } from "@tanstack/react-query";
import { currentUserQuery } from "@/lib/queries";
import { isChunkLoadError, useReloadOnChunkError } from "@/lib/chunk-error";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    await context.queryClient.ensureQueryData(currentUserQuery);
    return { user: data.user };
  },
  component: AuthenticatedShell,
  errorComponent: ShellError,
});

function ShellError({ error }: { error: Error }) {
  useReloadOnChunkError(error);
  if (isChunkLoadError(error)) {
    return <div className="p-8 text-sm text-muted-foreground">Updating to the latest version…</div>;
  }
  return <div className="p-8 text-sm text-destructive">Failed to load: {error.message}</div>;
}

function AuthenticatedShell() {
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const navigate = useNavigate();

  useEffect(() => {
    if (me?.profile?.must_change_password) {
      navigate({ to: "/auth/change-password" });
    }
  }, [me, navigate]);

  useEffect(() => {
    // Counts every full page load of the app (fresh open, refresh, new tab) —
    // SPA navigation doesn't remount the shell, so it never inflates this.
    supabase.rpc("record_visit").then(({ error }) => {
      if (error) console.warn("record_visit failed:", error.message);
    });
  }, []);

  return (
    <SidebarProvider
      defaultOpen={false}
      style={{ "--sidebar-width": "13.5rem" } as React.CSSProperties}
    >
      <ProfileWidgetProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-card/85 px-3 py-2 md:absolute md:right-3 md:top-3 md:z-10 md:justify-start md:rounded-[3px] md:border md:px-2.5 md:py-1.5 md:shadow-sm md:backdrop-blur-sm">
            <SidebarTrigger className="text-muted-foreground md:hidden" />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
      </ProfileWidgetProvider>
    </SidebarProvider>
  );
}
