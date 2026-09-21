// Money maths for the Finance page, kept free of React so it can be reasoned
// about (and tested) on its own.
//
// Two sources feed the balance:
//   1. events    — revenue_from_partner less cost_to_us and food_cost
//   2. entries   — everything else, stored SIGNED (income +, expense −)
//
// Cancelled events are excluded everywhere: they never moved money.

export type FinanceKind = "Income" | "Expense" | "Adjustment";

/** What the partner paid us for an event, less what running it cost. */
export function eventNet(event: any): number {
  return (
    Number(event.revenue_from_partner || 0) -
    Number(event.cost_to_us || 0) -
    Number(event.food_cost || 0)
  );
}

/** Events that actually moved money — a cancelled event never did. */
export function bookedEvents(events: any[]): any[] {
  return (events ?? []).filter((e) => e.status !== "Cancelled");
}

/**
 * The magnitude a user typed, given the sign the ledger needs. Income is
 * positive, expense negative; an adjustment keeps whatever sign it was given
 * so a correction can go either way.
 */
export function signedAmount(kind: FinanceKind, magnitude: number): number {
  const n = Math.abs(Number(magnitude) || 0);
  if (kind === "Expense") return -n;
  return n;
}

export type FinanceTotals = {
  eventRevenue: number;
  eventCosts: number;
  eventNet: number;
  otherIncome: number;
  otherExpenses: number;
  adjustments: number;
  balance: number;
};

export function financeTotals(events: any[], entries: any[]): FinanceTotals {
  const live = bookedEvents(events);

  const eventRevenue = live.reduce((s, e) => s + Number(e.revenue_from_partner || 0), 0);
  const eventCosts = live.reduce(
    (s, e) => s + Number(e.cost_to_us || 0) + Number(e.food_cost || 0),
    0,
  );

  const sumWhere = (kind: FinanceKind) =>
    (entries ?? [])
      .filter((x) => x.kind === kind)
      .reduce((s, x) => s + Number(x.amount || 0), 0);

  const otherIncome = sumWhere("Income");
  const otherExpenses = sumWhere("Expense");
  const adjustments = sumWhere("Adjustment");

  const net = eventRevenue - eventCosts;
  return {
    eventRevenue,
    eventCosts,
    eventNet: net,
    otherIncome,
    otherExpenses,
    adjustments,
    balance: net + otherIncome + otherExpenses + adjustments,
  };
}

/** Income and expenses per month, merging events with manual entries. */
export function monthlySeries(
  events: any[],
  entries: any[],
  start: Date,
  months = 6,
): { month: string; revenue: number; costs: number }[] {
  const startMonth = start.getMonth();
  const year = start.getFullYear();

  return Array.from({ length: months }, (_, i) => {
    const month = startMonth + i;
    const key = new Date(year, month, 1);
    const inMonth = (dateish: string | null) => {
      if (!dateish) return false;
      const [y, m] = dateish.split("-").map(Number);
      return y === key.getFullYear() && m - 1 === key.getMonth();
    };

    const evs = bookedEvents(events).filter((e) => inMonth(e.date));
    const ents = (entries ?? []).filter((x) => inMonth(x.entry_date));

    const revenue =
      evs.reduce((s, e) => s + Number(e.revenue_from_partner || 0), 0) +
      ents.filter((x) => Number(x.amount) > 0).reduce((s, x) => s + Number(x.amount), 0);

    const costs =
      evs.reduce((s, e) => s + Number(e.cost_to_us || 0) + Number(e.food_cost || 0), 0) +
      ents.filter((x) => Number(x.amount) < 0).reduce((s, x) => s - Number(x.amount), 0);

    return {
      month: key.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
      revenue,
      costs,
    };
  });
}
