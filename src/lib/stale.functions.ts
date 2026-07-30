import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isStale, STALE_AFTER_DAYS } from "@/lib/stale";

const DIGEST_TITLE = "Relationships have gone quiet";

/**
 * Nudges the caller about their own outreach that has gone quiet.
 *
 * Deliberately a single digest rather than one notification per company: the
 * backlog runs to dozens of rows, and fanning that out would bury every other
 * notification the first time it ran. Sends at most one per person per day —
 * `notifications` has no INSERT policy for `authenticated`, so the write goes
 * through the service-role client.
 */
export const checkStaleCompanies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Read through the caller's own client so RLS still applies.
    const { data: companies, error } = await context.supabase
      .from("companies")
      .select("id, name, status, last_contact_date, created_at, assignees");
    if (error) throw new Error(error.message);

    const mine = (companies ?? []).filter(
      (c) => (c.assignees ?? []).includes(context.userId) && isStale(c),
    );
    if (mine.length === 0) return { notified: false, count: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { data: existing } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("user_id", context.userId)
      .eq("title", DIGEST_TITLE)
      .gte("created_at", since.toISOString())
      .limit(1);
    if (existing && existing.length > 0) return { notified: false, count: mine.length };

    const names = mine
      .slice(0, 3)
      .map((c) => c.name)
      .join(", ");
    const body =
      mine.length <= 3
        ? `No contact in ${STALE_AFTER_DAYS}+ days: ${names}`
        : `${names} and ${mine.length - 3} more have had no contact in ${STALE_AFTER_DAYS}+ days`;

    const { error: insertErr } = await supabaseAdmin.from("notifications").insert({
      user_id: context.userId,
      title: DIGEST_TITLE,
      body,
      link: "/outreach",
    });
    if (insertErr) throw new Error(insertErr.message);

    return { notified: true, count: mine.length };
  });
