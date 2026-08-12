export const EVENT_STATUS_ORDER = [
  "Planned",
  "Confirmed",
  "On hold",
  "Completed",
  "Cancelled",
] as const;
export type EventStatus = (typeof EVENT_STATUS_ORDER)[number];

/**
 * Statuses meaning the event isn't going ahead as scheduled. Cancelled is
 * dead; On hold is paused — but neither should inflate a revenue forecast or
 * claim the "next event" slot on the dashboard, so both are excluded from
 * projections and upcoming lists.
 */
export const INACTIVE_EVENT_STATUSES = ["Cancelled", "On hold"] as const;

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
    end: new Date(y, ht ? 11 : 5, 31, 23, 59, 59),
  };
}
