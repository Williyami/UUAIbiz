// Minimal RFC 5545 export. Meetings only carry a date (no time), so every
// event is an all-day VEVENT — iOS/Google/Outlook all open .ics natively.

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function dateValue(isoDate: string): string {
  return isoDate.replaceAll("-", "");
}

function nextDay(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("sv-SE");
}

export type IcsEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:MM or HH:MM:SS — omitted = all-day event
  description?: string | null;
};

// Floating local time (no TZID): correct for a team that all lives in the
// same timezone, and avoids shipping a VTIMEZONE block.
function dateTimeValue(isoDate: string, time: string): string {
  const hhmmss = time.length === 5 ? `${time}:00` : time;
  return `${dateValue(isoDate)}T${hhmmss.replaceAll(":", "")}`;
}

function plusOneHour(isoDate: string, time: string): { date: string; time: string } {
  const d = new Date(`${isoDate}T${time.length === 5 ? `${time}:00` : time}`);
  d.setHours(d.getHours() + 1);
  return { date: d.toLocaleDateString("sv-SE"), time: d.toTimeString().slice(0, 8) };
}

export function buildICS(events: IcsEvent[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UUAIS//Business Hub//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of events) {
    const timed = !!e.time;
    const end = timed ? plusOneHour(e.date, e.time!) : null;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@uuais-business-hub`,
      `DTSTAMP:${stamp}`,
      timed
        ? `DTSTART:${dateTimeValue(e.date, e.time!)}`
        : `DTSTART;VALUE=DATE:${dateValue(e.date)}`,
      timed
        ? `DTEND:${dateTimeValue(end!.date, end!.time)}`
        : `DTEND;VALUE=DATE:${dateValue(nextDay(e.date))}`,
      `SUMMARY:${escapeText(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${escapeText(e.description)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function downloadICS(filename: string, events: IcsEvent[]) {
  const blob = new Blob([buildICS(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
