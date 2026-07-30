import { cn } from "@/lib/utils";
import { daysSinceContact, isStale, STALE_AFTER_DAYS } from "@/lib/stale";

/** Amber "gone quiet" marker for relationships with no contact in 14+ days. */
export function StaleBadge({ company, className }: { company: any; className?: string }) {
  if (!isStale(company)) return null;
  const days = daysSinceContact(company);
  return (
    <span
      title={`No contact in ${days} days — last touchpoint ${company.last_contact_date ?? "unknown"}`}
      className={cn(
        "microlabel inline-flex shrink-0 items-center gap-1 rounded-[3px] border border-amber-500/40 bg-amber-500/10 px-1.5 py-px text-[8.5px] font-semibold text-amber-600 dark:text-amber-400",
        className,
      )}
    >
      <span className="size-1 rounded-full bg-amber-500" />
      {days != null && days >= STALE_AFTER_DAYS * 4 ? `${Math.floor(days / 7)}w quiet` : "Quiet"}
    </span>
  );
}
