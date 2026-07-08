import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useOpenProfile } from "@/components/shared/profile-widget-context";

/** Overlapping avatars for a list of assignees; each one opens the profile widget. */
export function MemberStack({
  ids,
  profileMap,
  max = 4,
  className,
}: {
  ids: string[] | null | undefined;
  profileMap: Map<string, any>;
  max?: number;
  className?: string;
}) {
  const openProfile = useOpenProfile();
  const members = (ids ?? []).map((id) => profileMap.get(id)).filter(Boolean);

  if (members.length === 0)
    return <span className={cn("microlabel text-muted-foreground/70", className)}>Unassigned</span>;

  const shown = members.slice(0, max);
  const extra = members.length - shown.length;

  return (
    <span className={cn("inline-flex items-center -space-x-1.5", className)}>
      {shown.map((p: any) => (
        <span
          key={p.id}
          role="button"
          title={p.name || p.email}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            openProfile(p);
          }}
          className="cursor-pointer transition-transform hover:z-10 hover:-translate-y-0.5"
        >
          {p.avatar_url ? (
            <img
              src={p.avatar_url}
              alt=""
              className="h-5 w-5 rounded-full object-cover ring-2 ring-card"
            />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/85 font-mono text-[8px] font-semibold uppercase text-background ring-2 ring-card">
              {initials(p.name || p.email)}
            </span>
          )}
        </span>
      ))}
      {extra > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent font-mono text-[8px] font-semibold text-accent-foreground ring-2 ring-card">
          +{extra}
        </span>
      )}
    </span>
  );
}
