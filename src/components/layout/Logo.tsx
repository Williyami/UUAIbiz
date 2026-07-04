import { cn } from "@/lib/utils";

export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-label="UUAIS logo"
    >
      <path
        d="M15 22 Q15 15 22 15 L78 15 Q85 15 85 22 L54 82 Q50 88 46 82 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}