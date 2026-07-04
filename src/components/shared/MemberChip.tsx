import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MemberChip({
  name,
  compact,
  className,
}: {
  name: string | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  if (!name)
    return <span className={cn("microlabel text-muted-foreground/70", className)}>Unassigned</span>;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-foreground/85 font-mono text-[9px] font-semibold uppercase text-background">
        {initials(name)}
      </span>
      {!compact && <span className="truncate text-xs">{name.split(" ")[0]}</span>}
    </span>
  );
}
