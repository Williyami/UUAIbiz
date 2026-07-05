/**
 * Standard event procedure, encoded from the Info page's
 * "Event checklist — standard procedure" section. `offset` is days
 * relative to the event date (negative = before).
 */
export type ChecklistItem = { offset: number; title: string };

export const EVENT_CHECKLIST: ChecklistItem[] = [
  { offset: -28, title: "Book with partner: date, time, duration, activity, venue, food, payment, participants" },
  { offset: -21, title: "Create marketing material" },
  { offset: -21, title: "Internal confirmation in social-media-posts channel" },
  { offset: -14, title: "Create event on website + Luma" },
  { offset: -14, title: "Post on LinkedIn, Instagram and Orbi" },
  { offset: -7, title: "Close applications, extract list, divide into teams" },
  { offset: -6, title: "Send accept/reject emails" },
  { offset: -3, title: "Buy flowers/gifts for partner" },
  { offset: -3, title: "Assign day-of roles (logistics, photography)" },
  { offset: -3, title: "Order food and prizes" },
  { offset: 0, title: "Day of: bring roll-up, flowers, camera, food, prizes" },
  { offset: 3, title: "Create photo album + prep thank-you content" },
  { offset: 5, title: "Post on socials, send thank-yous, ask logo use, get payment info" },
];

export function checklistDueDate(eventDate: string, offset: number): string {
  const d = new Date(eventDate);
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("sv-SE");
}
