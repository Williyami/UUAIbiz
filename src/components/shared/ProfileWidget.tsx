import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusTag } from "@/components/shared/StatusTag";
import { companyStatusColor, type CompanyStatus } from "@/components/outreach/statusStyles";
import { companiesQuery, eventsQuery, tasksQuery, userRolesQuery } from "@/lib/queries";
import { initials, formatDate } from "@/lib/format";
import { Mail } from "lucide-react";

// Small profile card for any team member: who they are plus what they
// currently own across the hub.
export function ProfileWidget({
  profile,
  onOpenChange,
}: {
  profile: { id: string; name?: string | null; email?: string | null; avatar_url?: string | null } | null;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: roles = [] } = useQuery(userRolesQuery);
  const { data: companies = [] } = useQuery(companiesQuery);
  const { data: events = [] } = useQuery(eventsQuery);
  const { data: tasks = [] } = useQuery(tasksQuery);

  if (!profile) return null;

  const role = roles.find((r: any) => r.user_id === profile.id)?.role;
  const roleLabel = role === "admin" ? "Admin" : role === "viewer" ? "Viewer" : "Business team";
  const displayName = profile.name || profile.email || "Former member";

  const owned = companies.filter((c: any) => (c.assignees ?? []).includes(profile.id));
  const openTasks = tasks.filter((t: any) => (t.assignees ?? []).includes(profile.id) && t.status !== "Done");
  const upcomingEvents = events.filter(
    (e: any) => (e.assignees ?? []).includes(profile.id) && (!e.date || e.date >= new Date().toLocaleDateString("sv-SE")),
  );

  return (
    <Dialog open={!!profile} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">{displayName}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3.5">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="size-14 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-foreground/85 font-mono text-base font-semibold uppercase text-background">
              {initials(displayName)}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-medium tracking-tight">
              {displayName}
            </div>
            <div className={`microlabel text-[10px] ${role === "admin" ? "text-brand" : "text-muted-foreground"}`}>
              {roleLabel}
            </div>
          </div>
        </div>
        {profile.email && (
          <a
            href={`mailto:${profile.email}`}
            className="flex items-center gap-2 border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{profile.email}</span>
          </a>
        )}
        {/* min-w-0: DialogContent is a grid, and without it this item's
            intrinsic width (long task/company titles) widens the whole
            dialog track past its max-width. */}
        <div className="min-w-0 space-y-3">
          <WidgetSection
            label={`Companies · ${owned.length}`}
            empty="No companies owned"
            items={owned.slice(0, 5).map((c: any) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs">{c.name}</span>
                <StatusTag color={companyStatusColor[c.status as CompanyStatus]} className="shrink-0 text-[8.5px]">
                  {c.status}
                </StatusTag>
              </li>
            ))}
            more={owned.length - 5}
          />
          <WidgetSection
            label={`Open tasks · ${openTasks.length}`}
            empty="No open tasks"
            items={openTasks.slice(0, 5).map((t: any) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs">{t.title}</span>
                <span className="microlabel tnum shrink-0 text-[9px] text-muted-foreground">
                  {t.due_date ? formatDate(t.due_date) : ""}
                </span>
              </li>
            ))}
            more={openTasks.length - 5}
          />
          <WidgetSection
            label={`Upcoming events · ${upcomingEvents.length}`}
            empty="No upcoming events"
            items={upcomingEvents.slice(0, 5).map((e: any) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs">{e.title}</span>
                <span className="microlabel tnum shrink-0 text-[9px] text-muted-foreground">
                  {e.date ? formatDate(e.date) : "TBD"}
                </span>
              </li>
            ))}
            more={upcomingEvents.length - 5}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WidgetSection({
  label,
  items,
  empty,
  more,
}: {
  label: string;
  items: React.ReactNode[];
  empty: string;
  more: number;
}) {
  return (
    <section className="border bg-card/50 px-3 py-2">
      <h4 className="microlabel border-b pb-1.5 text-[9px] text-muted-foreground">{label}</h4>
      {items.length === 0 ? (
        <p className="microlabel py-2 text-[9px] text-muted-foreground/60">{empty}</p>
      ) : (
        <ul className="divide-y divide-border/50">{items}</ul>
      )}
      {more > 0 && (
        <p className="microlabel pt-1 text-[8.5px] text-muted-foreground/60">+{more} more</p>
      )}
    </section>
  );
}
