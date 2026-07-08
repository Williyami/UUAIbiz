import { initials } from "@/lib/format";
import { useOnlineUsers } from "@/components/shared/presence-context";

/** Avatar with a pulsating green presence ring when its user is online in the hub. */
export function OnlineAvatar({
  profile,
  onClick,
  size = "md",
}: {
  profile: any | null;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const online = useOnlineUsers();
  const isOnline = !!profile?.id && online.has(profile.id);
  const cls = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const name = profile?.name || profile?.email || "?";
  return (
    // span, not button: this renders inside clickable rows that are buttons
    <span
      role={onClick ? "button" : undefined}
      onPointerDown={onClick ? (e) => e.stopPropagation() : undefined}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      title={`${name}${isOnline ? " · online" : ""}`}
      className={`relative inline-block shrink-0 ${onClick ? "cursor-pointer" : ""}`}
    >
      {isOnline && (
        <span className={`absolute inset-0 rounded-full ring-2 ring-emerald-500 ${cls}`} />
      )}
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className={`${cls} rounded-full object-cover`} />
      ) : (
        <span
          className={`flex ${cls} items-center justify-center rounded-full bg-foreground/85 font-mono text-[9px] font-semibold uppercase text-background`}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
