// Slot maths for the "Find a time" availability poll on a meeting.
//
// A slot is a half hour, named by its local start: "2026-11-09T14:30". Local
// wall-clock strings (not timestamps) match how meeting_date and meeting_time
// are stored, and the whole team is in one timezone.

export const SLOT_MINUTES = 30;

// Every poll covers the same day, 08–21, and books a single half hour, like
// When2Meet: nobody picks hours or a length, people just paint when they're free.
export const POLL_DAY_START = 8;
export const POLL_DAY_END = 21;
export const POLL_DURATION = SLOT_MINUTES;

export type PollShape = {
  poll_week_start: string; // YYYY-MM-DD, a Monday
  poll_days: number; // 5 = Mon–Fri, 7 = Mon–Sun
  poll_day_start: number; // first hour shown, e.g. 8
  poll_day_end: number; // hour the day ends, e.g. 18 (exclusive)
  duration_minutes: number;
};

export type PollDay = { date: string; label: string; slots: string[] };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("sv-SE");
}

/** The Monday of the week a date falls in. */
export function mondayOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const back = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(isoDate, -back);
}

/** Next week's Monday, the usual week to poll. */
export function nextMonday(from = new Date()): string {
  const today = from.toLocaleDateString("sv-SE");
  return addDays(mondayOf(today), 7);
}

export function slotTime(slot: string): string {
  return slot.slice(11, 16);
}

export function slotDate(slot: string): string {
  return slot.slice(0, 10);
}

export function buildDays(poll: PollShape): PollDay[] {
  const days: PollDay[] = [];
  for (let i = 0; i < poll.poll_days; i++) {
    const date = addDays(poll.poll_week_start, i);
    const d = new Date(`${date}T00:00:00`);
    const slots: string[] = [];
    for (let m = poll.poll_day_start * 60; m < poll.poll_day_end * 60; m += SLOT_MINUTES) {
      slots.push(`${date}T${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
    }
    days.push({
      date,
      label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
      slots,
    });
  }
  return days;
}

export type Candidate = {
  start: string;
  available: string[]; // user ids free for the whole duration
};

/**
 * Every start time where the meeting fits inside one day, ranked by how many
 * of the invited people are free for all of it, then earliest first.
 */
export function rankStarts(
  poll: PollShape,
  invited: string[],
  slotsByUser: Map<string, Set<string>>,
): Candidate[] {
  const length = Math.max(1, Math.ceil(poll.duration_minutes / SLOT_MINUTES));
  const out: Candidate[] = [];
  for (const day of buildDays(poll)) {
    for (let i = 0; i + length <= day.slots.length; i++) {
      const block = day.slots.slice(i, i + length);
      const available = invited.filter((uid) => {
        const mine = slotsByUser.get(uid);
        return !!mine && block.every((s) => mine.has(s));
      });
      out.push({ start: day.slots[i], available });
    }
  }
  return out.sort(
    (a, b) => b.available.length - a.available.length || a.start.localeCompare(b.start),
  );
}

/** The few best distinct options, skipping starts that overlap a better pick. */
export function bestFits(
  poll: PollShape,
  invited: string[],
  slotsByUser: Map<string, Set<string>>,
  count = 3,
): Candidate[] {
  const length = Math.max(1, Math.ceil(poll.duration_minutes / SLOT_MINUTES));
  const picked: Candidate[] = [];
  for (const c of rankStarts(poll, invited, slotsByUser)) {
    if (c.available.length === 0) break;
    const t = Date.parse(c.start);
    const overlaps = picked.some(
      (p) => Math.abs(Date.parse(p.start) - t) < length * SLOT_MINUTES * 60_000,
    );
    if (!overlaps) picked.push(c);
    if (picked.length === count) break;
  }
  return picked;
}

export function formatSlot(slot: string): string {
  const d = new Date(`${slotDate(slot)}T00:00:00`);
  return `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, ${slotTime(slot)}`;
}
