export const EVENT_STATUS_ORDER = [
  "Idea",
  "Planned",
  "Confirmed",
  "On hold",
  "Completed",
  "Cancelled",
] as const;
export type EventStatus = (typeof EVENT_STATUS_ORDER)[number];

/**
 * Statuses meaning the event isn't going ahead as scheduled. Cancelled is
 * dead; On hold is paused; an Idea was never scheduled in the first place.
 * None of them should inflate a revenue forecast or claim the "next event"
 * slot on the dashboard, so all are excluded from projections and upcoming
 * lists.
 */
export const INACTIVE_EVENT_STATUSES = ["Cancelled", "On hold", "Idea"] as const;

export function isEventActive(status: string | null | undefined): boolean {
  return !INACTIVE_EVENT_STATUSES.includes(status as (typeof INACTIVE_EVENT_STATUSES)[number]);
}

export const EVENT_TYPE_ORDER = [
  "Lunch lecture",
  "Evening event",
  "Weekend event or longer",
  "Other",
] as const;
export type EventType = (typeof EVENT_TYPE_ORDER)[number];

export const eventStatusColor: Record<EventStatus, string> = {
  // Deliberately the quietest of the set — an idea hasn't earned attention yet.
  Idea: "var(--muted-foreground)",
  Planned: "var(--status-neutral)",
  Confirmed: "var(--status-info)",
  "On hold": "var(--status-warning)",
  Completed: "var(--status-success)",
  Cancelled: "var(--status-danger)",
};

/** Swedish academic semester bounds: VT = Jan–Jun, HT = Jul–Dec. */
export function semesterBounds(now = new Date()) {
  const y = now.getFullYear();
  const ht = now.getMonth() >= 6;
  return {
    label: `${ht ? "HT" : "VT"}${String(y).slice(2)}`,
    start: new Date(y, ht ? 6 : 0, 1),
    // Day 0 of the following month resolves to the last day of this one, so
    // this stays correct regardless of month length. Writing day 31 directly
    // overflowed June into 1 July, putting that date in both semesters.
    end: new Date(y, ht ? 12 : 6, 0, 23, 59, 59),
  };
}

/**
 * Partner names for an event, in the order they were added.
 *
 * Reads company_ids, falling back to the embedded company for anything written
 * before events could hold several partners.
 */
export function eventCompanyNames(event: any, companies: any[]): string[] {
  const ids: string[] = event?.company_ids ?? [];
  if (ids.length) {
    const byId = new Map(companies.map((c: any) => [c.id, c.name]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as string[];
  }
  return event?.company?.name ? [event.company.name] : [];
}
