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
