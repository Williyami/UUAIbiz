import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  companiesQuery,
  eventsQuery,
  tasksQuery,
  profilesQuery,
  currentUserQuery,
} from "@/lib/queries";
import { formatSEK, formatDate, initials } from "@/lib/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusTag } from "@/components/shared/StatusTag";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { PipelineWave } from "@/components/dashboard/PipelineWave";
import {
  eventStatusColor,
  semesterBounds,
  type EventStatus,
} from "@/components/events/eventStyles";
import { priorityColor, type TaskPriority } from "@/components/tasks/taskStyles";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(eventsQuery);
    context.queryClient.ensureQueryData(tasksQuery);
    context.queryClient.ensureQueryData(profilesQuery);
  },
  component: Dashboard,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function Dashboard() {
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);

  const now = new Date();
  const today = new Date(now.toDateString());
  const in7 = new Date(today.getTime() + 7 * 86400_000);
  const in30 = new Date(today.getTime() + 30 * 86400_000);
  const ago30 = new Date(today.getTime() - 30 * 86400_000);
  const sem = semesterBounds(now);

  // Outreach
  const activeOutreach = companies.filter((c) =>
    ["Contacted", "Negotiating", "Booked"].includes(c.status),
  ).length;
  const newCompanies30d = companies.filter((c) => new Date(c.created_at) >= ago30).length;
  const declined = companies.filter((c) => c.status === "Declined").length;
  const onHold = companies.filter((c) => c.status === "On hold").length;

  // Events
  const upcoming = events
    .filter(
      (e) =>
        e.date && new Date(e.date) >= today && new Date(e.date) <= in30 && e.status !== "Cancelled",
    )
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const nextEvent = upcoming[0];
  const semesterEvents = events.filter(
    (e) =>
      e.status !== "Cancelled" &&
      e.date &&
      new Date(e.date) >= sem.start &&
      new Date(e.date) <= sem.end,
  );
  const revenue = semesterEvents.reduce((s, e) => s + Number(e.revenue_from_partner || 0), 0);
  const costs = semesterEvents.reduce(
    (s, e) => s + Number(e.cost_to_us || 0) + Number(e.food_cost || 0),
    0,
  );
  const net = revenue - costs;
  const margin = revenue > 0 ? (net / revenue) * 100 : 0;

  // Tasks
  const overdue = tasks.filter(
    (t) => t.status !== "Done" && t.due_date && new Date(t.due_date) < today,
  ).length;
  const dueThisWeek = tasks.filter(
    (t) =>
      t.status !== "Done" &&
      t.due_date &&
      new Date(t.due_date) >= today &&
      new Date(t.due_date) <= in7,
  ).length;
  const myTasks = tasks
    .filter((t) => me?.id && (t.assignees ?? []).includes(me.id) && t.status !== "Done")
    .sort((a, b) => ((a.due_date || "9999") < (b.due_date || "9999") ? -1 : 1));

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 md:p-10">
      <PageHeader
        title={`Hej${me?.profile?.name ? ` ${me.profile.name.split(" ")[0]}` : ""}.`}
        lede={`The state of ${sem.label}, at a glance.`}
        mark={false}
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Active outreach" value={String(activeOutreach)}>
          {newCompanies30d > 0 ? (
            <>
              <Delta value={newCompanies30d}>
                <DeltaIcon variant="arrow" />
                <DeltaValue precision={0} suffix="" />
              </Delta>
              <span className="text-muted-foreground">new in 30 days</span>
            </>
          ) : (
            <span className="text-muted-foreground">Contacted → Booked</span>
          )}
        </StatCard>

        <StatCard label="Upcoming events" value={String(upcoming.length)}>
          <span className="truncate text-muted-foreground">
            {nextEvent ? `Next: ${formatDate(nextEvent.date)}` : "None in the next 30 days"}
          </span>
        </StatCard>
        </div>

        <Panel
          title="Pipeline"
          hint={`${companies.length} companies · ${declined} declined · ${onHold} on hold`}
        >
          <PipelineWave companies={companies} />
        </Panel>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Overdue tasks" value={String(overdue)} danger={overdue > 0}>
          <span className="text-muted-foreground">
            {dueThisWeek > 0 ? `${dueThisWeek} more due this week` : "Nothing due this week"}
          </span>
        </StatCard>

        <StatCard label={`Net · ${sem.label}`} value={formatSEK(net)} danger={net < 0}>
          {revenue > 0 ? (
            <>
              <Delta value={margin}>
                <DeltaIcon variant="trend" />
                <DeltaValue precision={0} suffix="% margin" />
              </Delta>
              <span className="tnum text-muted-foreground">{formatSEK(revenue)} in</span>
            </>
          ) : (
            <span className="text-muted-foreground">No revenue booked yet</span>
          )}
        </StatCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cashflow */}
        <Panel title="Cashflow by month" hint={sem.label} className="lg:col-span-2">
          <CashflowChart events={events} />
        </Panel>

        {/* Upcoming events */}
        <Panel title="Next events" to="/events" className="lg:col-span-2">
          {upcoming.length === 0 ? (
            <Empty>No upcoming events in the next 30 days</Empty>
          ) : (
            <ul className="divide-y">
              {upcoming.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{e.title}</div>
                    <div className="microlabel mt-0.5 text-[9.5px] text-muted-foreground/80">
                      {(e as any).company?.name || "No company"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusTag
                      color={eventStatusColor[e.status as EventStatus]}
                      className="hidden text-[9.5px] sm:inline-flex"
                    >
                      {e.status}
                    </StatusTag>
                    <span className="microlabel tnum text-muted-foreground">
                      {formatDate(e.date)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* My tasks */}
        <Panel title="My tasks" to="/tasks" className="lg:col-span-2">
          {myTasks.length === 0 ? (
            <Empty>No open tasks assigned to you</Empty>
          ) : (
            <ul className="divide-y">
              {myTasks.slice(0, 5).map((t) => {
                const isOverdue = t.due_date && new Date(t.due_date) < today;
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t.title}</div>
                      <StatusTag
                        color={priorityColor[t.priority as TaskPriority]}
                        className="mt-1 text-[9px]"
                      >
                        {t.priority}
                      </StatusTag>
                    </div>
                    <span
                      className={`microlabel tnum shrink-0 ${isOverdue ? "font-semibold text-brand" : "text-muted-foreground"}`}
                    >
                      {formatDate(t.due_date)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Team load */}
        <Panel title="Team load" to="/team" className="lg:col-span-2">
          {profiles.length === 0 ? (
            <Empty>No team members yet</Empty>
          ) : (
            <ul className="divide-y">
              {profiles.slice(0, 5).map((p) => {
                const owned = {
                  c: companies.filter((c) => (c.assignees ?? []).includes(p.id)).length,
                  e: events.filter((e) => (e.assignees ?? []).includes(p.id)).length,
                  t: tasks.filter((t) => (t.assignees ?? []).includes(p.id) && t.status !== "Done").length,
                };
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="flex min-w-0 items-center gap-2">
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt=""
                          className="h-6 w-6 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/85 font-mono text-[9px] font-semibold uppercase text-background">
                          {initials(p.name || p.email)}
                        </span>
                      )}
                      <span className="truncate text-sm">{(p.name || p.email).split(" ")[0]}</span>
                    </span>
                    <span className="microlabel tnum shrink-0 text-[9.5px] text-muted-foreground">
                      {owned.c}co · {owned.e}ev · {owned.t}t
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  danger,
  children,
}: {
  label: string;
  value: string;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="border bg-card px-5 py-4">
      <div className="microlabel text-[10px] text-muted-foreground">{label}</div>
      <div
        className={`tnum mt-2 font-display text-[1.8rem] font-medium leading-none tracking-tight ${danger ? "text-brand" : ""}`}
      >
        {value}
      </div>
      <div className="mt-2.5 flex min-w-0 items-center gap-1.5 text-xs">{children}</div>
    </div>
  );
}

function Panel({
  title,
  hint,
  to,
  className = "",
  children,
}: {
  title: string;
  hint?: string;
  to?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col border bg-card ${className}`}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-display text-base font-medium tracking-tight">{title}</h2>
        {to ? (
          <Link
            to={to}
            className="microlabel inline-flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-brand"
          >
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : (
          hint && <span className="microlabel tnum text-[10px] text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center px-4 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
