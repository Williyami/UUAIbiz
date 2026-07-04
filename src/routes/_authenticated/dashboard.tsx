import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { companiesQuery, eventsQuery, tasksQuery, currentUserQuery } from "@/lib/queries";
import { formatSEK, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusTag } from "@/components/shared/StatusTag";
import { Tri } from "@/components/shared/Tri";
import { priorityColor, type TaskPriority } from "@/components/tasks/taskStyles";
import { ArrowUpRight } from "lucide-react";

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
  const activeOutreach = companies.filter((c) =>
    ["Contacted", "Negotiating", "Booked"].includes(c.status),
  ).length;
  const upcoming = events
    .filter(
      (e) =>
        e.date &&
        new Date(e.date) >= new Date(now.toDateString()) &&
        new Date(e.date) <= in30 &&
        e.status !== "Cancelled",
    )
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const overdue = tasks.filter(
    (t) => t.status !== "Done" && t.due_date && new Date(t.due_date) < now,
  ).length;
  const revenue = events.reduce((s, e) => s + Number(e.revenue_from_partner || 0), 0);
  const cost = events.reduce((s, e) => s + Number(e.cost_to_us || 0) + Number(e.food_cost || 0), 0);
  const net = revenue - cost;
  const myTasks = tasks
    .filter((t) => t.assigned_to === me?.id && t.status !== "Done")
    .sort((a, b) => ((a.due_date || "9999") < (b.due_date || "9999") ? -1 : 1));

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <PageHeader
        title={`Hej${me?.profile?.name ? ` ${me.profile.name.split(" ")[0]}` : ""}.`}
        lede="The state of the semester, at a glance."
      />

      {/* Ledger strip */}
      <div className="grid grid-cols-2 divide-y border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <Stat label="Active outreach" value={String(activeOutreach)} hint="Contacted → Booked" />
        <Stat label="Upcoming events" value={String(upcoming.length)} hint="Next 30 days" />
        <Stat
          label="Overdue tasks"
          value={String(overdue)}
          danger={overdue > 0}
          hint={overdue > 0 ? "Needs attention" : "All clear"}
        />
        <Stat
          label="Net this semester"
          value={formatSEK(net)}
          hint={`${formatSEK(revenue)} in · ${formatSEK(cost)} out`}
          danger={net < 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Ledger
          title="Next events"
          to="/events"
          empty={upcoming.length === 0}
          emptyText="No upcoming events"
        >
          {upcoming.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <Tri className="h-2 w-2 shrink-0 text-brand/70" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{e.title}</div>
                  <div className="microlabel mt-0.5 text-[10px] text-muted-foreground/80">
                    {(e as any).company?.name || "No company"}
                  </div>
                </div>
              </div>
              <span className="microlabel tnum shrink-0 text-muted-foreground">
                {formatDate(e.date)}
              </span>
            </li>
          ))}
        </Ledger>

        <Ledger
          title="My tasks"
          to="/tasks"
          empty={myTasks.length === 0}
          emptyText="No open tasks assigned to you"
        >
          {myTasks.slice(0, 6).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{t.title}</div>
                <StatusTag
                  color={priorityColor[t.priority as TaskPriority]}
                  className="mt-1 text-[9.5px]"
                >
                  {t.priority}
                </StatusTag>
              </div>
              <span className="microlabel tnum shrink-0 text-muted-foreground">
                {formatDate(t.due_date)}
              </span>
            </li>
          ))}
        </Ledger>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: string;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <div className="px-5 py-5">
      <div className="microlabel text-[10px] text-muted-foreground">{label}</div>
      <div
        className={`tnum mt-2 font-display text-[1.9rem] font-medium leading-none tracking-tight ${danger ? "text-brand" : ""}`}
      >
        {value}
      </div>
      {hint && (
        <div className="microlabel tnum mt-2 text-[9.5px] text-muted-foreground/70">{hint}</div>
      )}
    </div>
  );
}

function Ledger({
  title,
  to,
  empty,
  emptyText,
  children,
}: {
  title: string;
  to: string;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-display text-base font-medium tracking-tight">{title}</h2>
        <Link
          to={to}
          className="microlabel inline-flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-brand"
        >
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      {empty ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <ul className="divide-y">{children}</ul>
      )}
    </section>
  );
}
