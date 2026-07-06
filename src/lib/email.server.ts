import { Resend } from "resend";

let client: Resend | null = null;

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

// Best-effort send: account/role changes must succeed even if email delivery
// fails or Resend isn't configured yet — members can always set their password
// by entering their email on the sign-in page, so the email is just a nudge.
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getClient();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email send to", to);
    return { sent: false as const };
  }
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "UUAIS Business Hub <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
  if (error) {
    console.error("Failed to send email:", error);
    return { sent: false as const };
  }
  return { sent: true as const };
}
