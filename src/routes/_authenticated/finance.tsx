import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Scale, Pencil } from "lucide-react";
import { eventsQuery, financeEntriesQuery, currentUserQuery } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { formatSEK, formatDate } from "@/lib/format";
import { semesterBounds } from "@/components/events/eventStyles";
import { bookedEvents, eventNet, financeTotals } from "@/lib/finance";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { FinanceEntryDialog } from "@/components/finance/FinanceEntryDialog";
import { ReconcileDialog } from "@/components/finance/ReconcileDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/finance")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(eventsQuery);
    context.queryClient.ensureQueryData(financeEntriesQuery);
  },
  component: FinancePage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function FinancePage() {
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: entries } = useSuspenseQuery(financeEntriesQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);

  const canEdit = me?.role !== "viewer";
  const isAdmin = me?.role === "admin";

  const [entryOpen, setEntryOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [reconcileOpen, setReconcileOpen] = useState(false);

  const sem = semesterBounds();

  // The balance is all-time: every event and every entry ever recorded. The
  // semester figures below it are a separate, narrower view.
  const totals = useMemo(() => financeTotals(events, entries), [events, entries]);

  const semesterTotals = useMemo(() => {
    const inSem = (d: string | null) =>
      !!d && d >= sem.start.toLocaleDateString("sv-SE") && d <= sem.end.toLocaleDateString("sv-SE");
    return financeTotals(
      events.filter((e: any) => inSem(e.date)),
      entries.filter((x: any) => inSem(x.entry_date)),
    );
  }, [events, entries, sem.start, sem.end]);

  const eventRows = useMemo(
    () =>
      bookedEvents(events)
        .filter((e: any) => eventNet(e) !== 0 || Number(e.revenue_from_partner || 0) !== 0)
        .sort((a: any, b: any) => (b.date ?? "").localeCompare(a.date ?? "")),
    [events],
  );

  return (
    <div className="space-y-6 p-6 md:p-8">
      <PageHeader
        title="Finance"
        lede="Event economics, everything else that moves money, and what the society is actually sitting on."
      >
        {isAdmin && (
          <Button variant="outline" onClick={() => setReconcileOpen(true)}>
            <Scale className="h-4 w-4" /> Correct balance
          </Button>
        )}
        {canEdit && (
          <Button
            onClick={() => {
              setEditing(null);
              setEntryOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add income or cost
          </Button>
        )}
      </PageHeader>

      {/* Balance, with the arithmetic that produced it shown next to it so the
          number is never just asserted. */}
      <div className="grid gap-px border bg-border md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="bg-card px-6 py-6">
          <div className="microlabel text-[10px] text-muted-foreground">Current balance</div>
          <div
            className={cn(
              "tnum mt-2 font-display text-4xl font-medium leading-none tracking-tight",
              totals.balance < 0 && "text-brand",
            )}
          >
            {formatSEK(totals.balance)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            All events and entries on record{totals.adjustments !== 0 && ", corrections included"}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          <Cell label="Events net" value={totals.eventNet} signed />
          <Cell label="Other income" value={totals.otherIncome} signed />
          <Cell label="Other costs" value={totals.otherExpenses} signed />
          <Cell
            label="Corrections"
            value={totals.adjustments}
            signed
            muted={totals.adjustments === 0}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="border bg-card">
          <SectionHead title={`Cash flow · ${sem.label}`} />
          <CashflowChart events={events} entries={entries} />
        </section>

        <section className="border bg-card">
          <SectionHead title={`This semester · ${sem.label}`} />
          <dl className="divide-y">
            <Row label="Event revenue" value={semesterTotals.eventRevenue} />
            <Row label="Event costs incl. food" value={-semesterTotals.eventCosts} />
            <Row label="Other income" value={semesterTotals.otherIncome} />
            <Row label="Other costs" value={semesterTotals.otherExpenses} />
            <Row
              label="Net this semester"
              value={
                semesterTotals.eventNet + semesterTotals.otherIncome + semesterTotals.otherExpenses
              }
              strong
            />
          </dl>
        </section>
      </div>

      <section className="border bg-card">
        <SectionHead
          title="Events"
          hint={`${eventRows.length} with money recorded · cancelled excluded`}
        />
        {eventRows.length === 0 ? (
          <Empty>No event has revenue or costs recorded yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <Tr head>
                  <Th>Event</Th>
                  <Th>Date</Th>
                  <Th right>Revenue</Th>
                  <Th right>Costs</Th>
                  <Th right>Net</Th>
                </Tr>
              </thead>
              <tbody>
                {eventRows.map((e: any) => {
                  const costs = Number(e.cost_to_us || 0) + Number(e.food_cost || 0);
                  return (
                    <Tr key={e.id}>
                      <Td>
                        <span className="font-medium">{e.title}</span>
                        {e.company?.name && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {e.company.name}
                          </span>
                        )}
                      </Td>
                      <Td muted>{e.date ? formatDate(e.date) : "—"}</Td>
                      <Td right>
                        <Money value={Number(e.revenue_from_partner || 0)} />
                      </Td>
                      <Td right>
                        <Money value={-costs} signed />
                      </Td>
                      <Td right>
                        <Money value={eventNet(e)} signed />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border bg-card">
        <SectionHead title="Other income and costs" hint={`${entries.length} entries`} />
        {entries.length === 0 ? (
          <Empty>
            Nothing recorded outside events yet
            {canEdit ? " — add the first entry above." : "."}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <Tr head>
                  <Th>Description</Th>
                  <Th>Category</Th>
                  <Th>Date</Th>
                  <Th>Added by</Th>
                  <Th right>Amount</Th>
                  {canEdit && <Th right> </Th>}
                </Tr>
              </thead>
              <tbody>
                {entries.map((x: any) => (
                  <Tr key={x.id}>
                    <Td>
                      <span className="font-medium">{x.description}</span>
                      {x.kind === "Adjustment" && (
                        <span className="microlabel ml-2 border border-brand/40 px-1.5 py-0.5 text-[9px] text-brand">
                          correction
                        </span>
                      )}
                      {x.notes && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{x.notes}</div>
                      )}
                    </Td>
                    <Td muted>{x.kind === "Adjustment" ? "—" : x.category}</Td>
                    <Td muted>{formatDate(x.entry_date)}</Td>
                    <Td muted>{x.author?.name ?? "—"}</Td>
                    <Td right>
                      <Money value={Number(x.amount)} signed />
                    </Td>
                    {canEdit && (
                      <Td right>
                        {/* Corrections are admin-only to touch; Postgres enforces
                            it too, so a hidden button isn't the only guard. */}
                        {(x.kind !== "Adjustment" || isAdmin) && (
                          <button
                            title="Edit entry"
                            className="text-muted-foreground transition-colors hover:text-foreground"
                            onClick={() => {
                              setEditing(x);
                              setEntryOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </Td>
                    )}
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <FinanceEntryDialog
        open={entryOpen}
        onOpenChange={setEntryOpen}
        entry={editing}
        currentUserId={me?.id}
      />
      <ReconcileDialog
        open={reconcileOpen}
        onOpenChange={setReconcileOpen}
        computedBalance={totals.balance}
        currentUserId={me?.id}
      />
    </div>
  );
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-3">
      <h2 className="font-display text-sm font-medium tracking-tight">{title}</h2>
      {hint && <span className="microlabel text-[9.5px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Cell({
  label,
  value,
  signed,
  muted,
}: {
  label: string;
  value: number;
  signed?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="microlabel text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-1.5">
        <span
          className={cn(
            "tnum font-mono text-sm",
            muted && "text-muted-foreground",
            !muted && signed && value < 0 && "text-brand",
            !muted && signed && value > 0 && "text-(--status-success)",
          )}
        >
          {formatSEK(value)}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between px-5 py-2.5">
      <dt className={cn("text-sm", strong ? "font-medium" : "text-muted-foreground")}>{label}</dt>
      <dd>
        <Money value={value} signed={!strong} strong={strong} />
      </dd>
    </div>
  );
}

function Money({ value, signed, strong }: { value: number; signed?: boolean; strong?: boolean }) {
  return (
    <span
      className={cn(
        "tnum font-mono",
        strong ? "text-sm font-medium" : "text-xs",
        signed && value < 0 && "text-brand",
        signed && value > 0 && "text-(--status-success)",
        signed && value === 0 && "text-muted-foreground",
        strong && value < 0 && "text-brand",
      )}
    >
      {formatSEK(value)}
    </span>
  );
}

function Tr({
  children,
  head,
  ...rest
}: { children: React.ReactNode; head?: boolean } & React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-b last:border-0", !head && "hover:bg-accent/40")} {...rest}>
      {children}
    </tr>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={cn(
        "microlabel px-5 py-2.5 text-[9.5px] font-medium text-muted-foreground",
        right ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  muted,
}: {
  children: React.ReactNode;
  right?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-5 py-2.5 align-top",
        right && "text-right",
        muted && "text-xs text-muted-foreground",
      )}
    >
      {children}
    </td>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-muted-foreground">{children}</div>;
}
