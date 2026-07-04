import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { companiesQuery, eventsQuery, tasksQuery, currentUserQuery } from "@/lib/queries";
import { formatSEK, formatDate } from "@/lib/format";
import { Building2, CalendarDays, AlertCircle, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(eventsQuery);
    context.queryClient.ensureQueryData(tasksQuery);
  },
  component: Dashboard,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function Dashboard() {
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400_000);
  const activeOutreach = companies.filter((c) => ["Contacted", "Negotiating", "Booked"].includes(c.status)).length;
  const upcoming = events
    .filter((e) => e.date && new Date(e.date) >= new Date(now.toDateString()) && new Date(e.date) <= in30 && e.status !== "Cancelled")
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const overdue = tasks.filter((t) => t.status !== "Done" && t.due_date && new Date(t.due_date) < now).length;
  const revenue = events.reduce((s, e) => s + Number(e.revenue_from_partner || 0), 0);
  const cost = events.reduce((s, e) => s + Number(e.cost_to_us || 0) + Number(e.food_cost || 0), 0);
  const myTasks = tasks
    .filter((t) => t.assigned_to === me?.id && t.status !== "Done")
    .sort((a, b) => ((a.due_date || "9999") < (b.due_date || "9999") ? -1 : 1));

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome{me?.profile?.name ? `, ${me.profile.name.split(" ")[0]}` : ""}. Here's what's happening this semester.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Active outreach" value={String(activeOutreach)} hint="Contacted → Booked" />
        <StatCard icon={CalendarDays} label="Upcoming events" value={String(upcoming.length)} hint="Next 30 days" />
        <StatCard icon={AlertCircle} label="Overdue tasks" value={String(overdue)} accent={overdue > 0} />
        <StatCard icon={TrendingUp} label="Net this semester" value={formatSEK(revenue - cost)} hint={`${formatSEK(revenue)} in / ${formatSEK(cost)} out`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold">Next 5 events</h2>
          </div>
          <div className="divide-y">
            {upcoming.slice(0, 5).map((e) => (
              <div key={e.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{(e as any).company?.name || "No company"}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{formatDate(e.date)}</div>
              </div>
            ))}
            {upcoming.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No upcoming events</div>}
          </div>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold">My tasks</h2>
          </div>
          <div className="divide-y">
            {myTasks.slice(0, 8).map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.priority} priority</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{formatDate(t.due_date)}</div>
              </div>
            ))}
            {myTasks.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No open tasks assigned to you</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, accent }: { icon: any; label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight ${accent ? "text-[color:var(--brand-red)]" : ""}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}