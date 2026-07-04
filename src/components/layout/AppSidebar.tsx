import { Link, useRouterState } from "@tanstack/react-router";
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
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { currentUserQuery } from "@/lib/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
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
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Logo size={26} className="text-[color:var(--brand-red)]" />
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">UUAI Society</span>
            <span className="text-[11px] text-muted-foreground">Business Team</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const active = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {initials(me?.profile?.name || me?.email)}
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-xs font-medium">{me?.profile?.name || me?.email}</div>
            <div className="truncate text-[10px] text-muted-foreground">
              {me?.isAdmin ? "Admin" : "Member"}
            </div>
          </div>
          <button
            onClick={signOut}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground group-data-[collapsible=icon]:hidden"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}