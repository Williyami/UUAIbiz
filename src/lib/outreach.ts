import { supabase } from "@/integrations/supabase/client";

/** Today as a plain YYYY-MM-DD date, in the local timezone. */
export function todayISO(): string {
  return new Date().toLocaleDateString("sv-SE");
}

/**
 * Moving a company along the pipeline or adding a new person there means the
 * team has just been in touch, so the company's last contact becomes today.
 */
export async function markContactedToday(companyId: string) {
  const { error } = await supabase
    .from("companies")
    .update({ last_contact_date: todayISO() })
    .eq("id", companyId);
  if (error) throw error;
}
