export function formatSEK(amount: number | null | undefined): string {
  // ?? only catches null/undefined — a value that fails to coerce would other-
  // wise render as "NaN SEK" or "∞ SEK" on a dashboard tile.
  const raw = Number(amount ?? 0);
  const n = Number.isFinite(raw) ? raw : 0;
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " SEK";
}

export function initials(name: string | null | undefined): string {
  // Checked after trimming: a whitespace-only name passes a plain falsy guard
  // but yields no letters, rendering a blank avatar instead of the fallback.
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `new Date("2026-03-15")` is parsed as UTC midnight, which renders as the
 * previous day anywhere west of UTC. Appending a time forces a local parse.
 * Timestamps that already carry a time are passed through untouched.
 */
export function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  return new Date(DATE_ONLY.test(value) ? `${value}T00:00:00` : value);
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return parseLocalDate(d).toLocaleDateString("sv-SE");
}

export function timeAgo(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = parseLocalDate(d);
  const s = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(date);
}
