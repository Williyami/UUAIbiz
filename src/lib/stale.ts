/** Shared definition of a "gone quiet" outreach relationship. */

export const STALE_AFTER_DAYS = 14;

/**
 * Statuses that are still in play. A declined or completed relationship isn't
 * waiting on anyone, so chasing it would be noise.
 */
const ACTIVE_STATUSES = new Set(["Contacted", "Discussing", "Negotiating", "On hold"]);

export function daysSinceContact(company: {
  last_contact_date?: string | null;
  created_at?: string | null;
}): number | null {
  // Companies added without a logged touchpoint fall back to their creation
  // date, otherwise a brand-new row could never go stale.
  const basis = company.last_contact_date ?? company.created_at?.slice(0, 10);
  if (!basis) return null;
  const then = new Date(`${basis}T00:00:00`);
  if (Number.isNaN(then.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - then.getTime()) / 86_400_000);
}

export function isStale(company: {
  status?: string | null;
  last_contact_date?: string | null;
  created_at?: string | null;
}): boolean {
  if (!ACTIVE_STATUSES.has(company.status ?? "")) return false;
  const days = daysSinceContact(company);
  return days !== null && days >= STALE_AFTER_DAYS;
}

/**
 * When a company was last touched at all — contacted, or edited in the Hub.
 *
 * Outreach sorts on this so whatever moved most recently sits at the top. The
 * contact date is a plain date, so it counts as end-of-day: deliberately
 * logging a touchpoint outranks an incidental edit made earlier the same day.
 */
export function lastTouchedAt(company: {
  updated_at?: string | null;
  last_contact_date?: string | null;
  created_at?: string | null;
}): number {
  const stamps = [
    company.updated_at ? Date.parse(company.updated_at) : NaN,
    company.last_contact_date ? Date.parse(`${company.last_contact_date}T23:59:59`) : NaN,
    company.created_at ? Date.parse(company.created_at) : NaN,
  ].filter((n) => Number.isFinite(n));
  return stamps.length ? Math.max(...stamps) : 0;
}
