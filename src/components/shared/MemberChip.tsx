import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MemberChip({
  name,
  avatarUrl,
  compact,
  className,
}: {
  name: string | null | undefined;
  avatarUrl?: string | null;
  compact?: boolean;
  className?: string;
}) {
  if (!name)
    return <span className={cn("microlabel text-muted-foreground/70", className)}>Unassigned</span>;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/85 font-mono text-[9px] font-semibold uppercase text-background">
          {initials(name)}
        </span>
      )}
      {!compact && <span className="truncate text-xs">{name.split(" ")[0]}</span>}
    </span>
  );
}
