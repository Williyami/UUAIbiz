import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useOpenProfile } from "@/components/shared/profile-widget-context";

export function MemberChip({
  name,
  avatarUrl,
  profile,
  compact,
  className,
}: {
  name: string | null | undefined;
  avatarUrl?: string | null;
  /** Full profile row; when given, clicking the chip opens the profile widget. */
  profile?: any;
  compact?: boolean;
  className?: string;
}) {
  const openProfile = useOpenProfile();
  if (!name)
    return <span className={cn("microlabel text-muted-foreground/70", className)}>Unassigned</span>;

  const clickable = !!profile;
  return (
    <span
      role={clickable ? "button" : undefined}
      title={clickable ? `View ${name}` : undefined}
      // stopPropagation on both events: chips sit inside clickable/draggable
      // cards, and the card must neither open nor start a drag from the chip.
      onPointerDown={clickable ? (e) => e.stopPropagation() : undefined}
      onClick={
        clickable
          ? (e) => {
              e.stopPropagation();
              openProfile(profile);
            }
          : undefined
      }
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5",
        clickable && "cursor-pointer rounded-[3px] transition-opacity hover:opacity-75",
        className,
      )}
    >
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
