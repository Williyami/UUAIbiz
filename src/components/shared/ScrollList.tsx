import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll container that fades its clipped edge so overflow is always visible.
 *
 * macOS hides overlay scrollbars until the user actually scrolls, so a plain
 * `overflow-y-auto` box cut flush at a row boundary is indistinguishable from a
 * complete list — hidden entries are simply never discovered. The gradient mask
 * appears only on the side that has more content, which keeps a list that fits
 * looking exactly as it did before.
 */
export function ScrollList({
  as: Tag = "div",
  className,
  fadeFrom = "from-popover",
  children,
  ...rest
}: {
  as?: "div" | "ul";
  className?: string;
  /** Tailwind `from-*` colour matching the surface behind the list. */
  fadeFrom?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement | null>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 1px slack: fractional scroll offsets otherwise leave the mask stuck on.
    const top = el.scrollTop > 1;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    // Content grows and shrinks under us (filtering, live queries), so watch the
    // subtree as well as the box itself rather than measuring only on scroll.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    const mo = new MutationObserver(() => {
      measure();
      for (const child of Array.from(el.children)) ro.observe(child);
    });
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [measure]);

  return (
    <div className="relative min-h-0">
      <Tag
        {...rest}
        ref={ref as never}
        onScroll={measure}
        className={cn("overflow-y-auto overscroll-contain", className)}
      >
        {children}
      </Tag>
      <Edge side="top" show={edges.top} fadeFrom={fadeFrom} />
      <Edge side="bottom" show={edges.bottom} fadeFrom={fadeFrom} />
    </div>
  );
}

function Edge({
  side,
  show,
  fadeFrom,
}: {
  side: "top" | "bottom";
  show: boolean;
  fadeFrom: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 h-6 transition-opacity duration-150",
        side === "top" ? "top-0 bg-gradient-to-b" : "bottom-0 bg-gradient-to-t",
        fadeFrom,
        "to-transparent",
        show ? "opacity-100" : "opacity-0",
      )}
    />
  );
}
