import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  ListChecks,
  Users,
  BookOpen,
  FileSignature,
  LogOut,
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
} from "@/components/ui/sidebar";
import { Logo } from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { currentUserQuery } from "@/lib/queries";
import { initials } from "@/lib/format";

const nav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Outreach", url: "/outreach", icon: Building2 },
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

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-3">
          <Logo size={30} />
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-display text-[15px] font-medium tracking-tight text-sidebar-accent-foreground">
              UUAI Society
            </span>
            <span className="microlabel text-[9.5px] text-sidebar-foreground/60">Business Hub</span>
          </div>
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
                      className="h-9 rounded-[3px] px-3 data-[active=true]:bg-sidebar-accent"
                    >
                      <Link to={item.url}>
                        <item.icon className="hidden h-4 w-4 group-data-[collapsible=icon]:block" />
                        <span
                          className={`font-mono text-[10px] tnum group-data-[collapsible=icon]:hidden ${
                            active
                              ? "text-(--brand-red) font-semibold"
                              : "text-sidebar-foreground/45"
                          }`}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`microlabel group-data-[collapsible=icon]:hidden ${
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
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-sidebar-accent font-mono text-[10px] font-semibold uppercase text-sidebar-accent-foreground">
            {initials(me?.profile?.name || me?.email)}
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-xs font-medium text-sidebar-accent-foreground">
              {me?.profile?.name || me?.email}
            </div>
            <div className="microlabel text-[9px] text-sidebar-foreground/55">
              {me?.isAdmin ? "Admin" : "Member"}
            </div>
          </div>
          <button
            onClick={signOut}
            className="rounded-[3px] p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
