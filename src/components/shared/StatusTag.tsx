import { cn } from "@/lib/utils";

/**
 * Ledger-style status annotation: a small colored square + mono uppercase text.
 * `color` is a CSS color value (usually one of the --status-* tokens).
 */
export function StatusTag({
  color,
  children,
  className,
}: {
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("microlabel inline-flex items-center gap-1.5 text-foreground/75", className)}
    >
      <span className="h-[7px] w-[7px] shrink-0" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}
