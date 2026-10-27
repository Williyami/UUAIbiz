/**
 * Video-call links for meetings.
 *
 * People paste links straight from invites, often without the scheme
 * ("meet.google.com/abc-defg-hij"), so a missing scheme is filled in. Only
 * http(s) is accepted: the link becomes a clickable Join button, and a pasted
 * "javascript:" link must never get that far.
 *
 * Returns "" for blank, null when the value isn't a usable web link.
 */
export function normalizeMeetingLink(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** The service behind a link, for the Join button's label. */
export function meetingProvider(url: string): string {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "Join";
  }
  if (host.endsWith("zoom.us")) return "Zoom";
  if (host === "meet.google.com") return "Google Meet";
  if (host.endsWith("teams.microsoft.com") || host.endsWith("teams.live.com")) return "Teams";
  if (host.endsWith("webex.com")) return "Webex";
  if (host.endsWith("whereby.com")) return "Whereby";
  return "Join";
}
