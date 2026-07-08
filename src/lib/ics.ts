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
  description?: string | null;
};

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
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@uuais-business-hub`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue(e.date)}`,
      `DTEND;VALUE=DATE:${dateValue(nextDay(e.date))}`,
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
