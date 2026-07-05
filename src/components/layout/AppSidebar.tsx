import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  CalendarDays,
  ListChecks,
  Users,
  BookOpen,
  FileSignature,
  LogOut,
  ChevronsLeft,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { currentUserQuery } from "@/lib/queries";
import { initials } from "@/lib/format";

const nav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Outreach", url: "/outreach", icon: Building2 },
  { title: "Meetings", url: "/meetings", icon: CalendarCheck },
  { title: "Events", url: "/events", icon: CalendarDays },
  { title: "Tasks", url: "/tasks", icon: ListChecks },
  { title: "Team", url: "/team", icon: Users },
  { title: "Info", url: "/info", icon: BookOpen },
  { title: "Contracts", url: "/contracts", icon: FileSignature },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const { toggleSidebar } = useSidebar();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3.5 group-data-[collapsible=icon]:px-2">
        <div className="flex h-9 items-center gap-2.5 overflow-hidden group-data-[collapsible=icon]:gap-0">
          <Logo size={28} className="group-data-[collapsible=icon]:hidden" />
          <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden leading-none transition-opacity duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <span className="truncate font-display text-[14px] font-medium tracking-tight text-sidebar-accent-foreground">
              UUAI Society
            </span>
            <span className="microlabel text-[9px] text-sidebar-foreground/60">Business Hub</span>
          </div>
          <button
            onClick={toggleSidebar}
            title="Collapse sidebar"
            className="ml-auto hidden shrink-0 rounded-[3px] p-1 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:block group-data-[collapsible=icon]:mx-auto"
          >
            <ChevronsLeft className="h-3.5 w-3.5 transition-transform duration-300 group-data-[collapsible=icon]:rotate-180" />
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {nav.map((item, i) => {
                const active = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="h-8 rounded-[3px] px-3 data-[active=true]:bg-sidebar-accent"
                    >
                      <Link to={item.url} className="relative">
                        <item.icon className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-data-[collapsible=icon]:opacity-100" />
                        <span
                          className={`font-mono text-[10px] tnum transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 ${
                            active
                              ? "text-(--brand-red) font-semibold"
                              : "text-sidebar-foreground/45"
                          }`}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`microlabel transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 ${
                            active ? "text-sidebar-accent-foreground" : ""
                          }`}
                        >
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {/* Avatar keeps the exact same position in both states; everything to
            its right fades out and is clipped by the shrinking width. */}
        <div className="flex h-10 items-center overflow-hidden">
          {me?.profile?.avatar_url ? (
            <img
              src={me.profile.avatar_url}
              alt=""
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent font-mono text-[10px] font-semibold uppercase text-sidebar-accent-foreground">
              {initials(me?.profile?.name || me?.email)}
            </div>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-1 pl-2.5 transition-opacity duration-200 group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-sidebar-accent-foreground">
                {me?.profile?.name || me?.email}
              </div>
              <div className="microlabel text-[9px] text-sidebar-foreground/55">
                {me?.isAdmin ? "Admin" : me?.role === "viewer" ? "Viewer" : "Business team"}
              </div>
            </div>
            <Link
              to="/settings"
              title="Settings"
              className="shrink-0 rounded-[3px] p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={signOut}
              className="shrink-0 rounded-[3px] p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
