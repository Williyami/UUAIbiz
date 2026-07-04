import { cn } from "@/lib/utils";

export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      alt="UUAIS logo"
    />
  );
}