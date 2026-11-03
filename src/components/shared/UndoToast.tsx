import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { clearUndo, getUndo, subscribeUndo, UNDO_VISIBLE_MS } from "@/lib/undo";

const DISMISS_AT = 80; // px of rightward travel that throws it away

/**
 * Where the Undo bar appears: place inside the top toolbar (which must be
 * `relative`). It fills the toolbar's height, lines up with its right edge
 * and covers it until it's dismissed or times out.
 */
export function UndoSlot() {
  const item = useSyncExternalStore(subscribeUndo, getUndo, () => null);
  if (!item) return null;
  return (
    <div className="absolute inset-y-0 right-0 z-20 flex min-w-full justify-end">
      <UndoBar key={item.id} item={item} />
    </div>
  );
}

function UndoBar({ item }: { item: NonNullable<ReturnType<typeof getUndo>> }) {
  const [offset, setOffset] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [hovered, setHovered] = useState(false);
  const drag = useRef<{ x: number } | null>(null);
  const wheel = useRef({ total: 0, timer: null as ReturnType<typeof setTimeout> | null });

  // Times out like a toast; the clock pauses while the pointer is over it.
  useEffect(() => {
    if (hovered) return;
    const t = setTimeout(() => clearUndo(item.id), UNDO_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [hovered, item.id]);

  function dismiss() {
    setLeaving(true);
    setOffset(240);
    setTimeout(() => clearUndo(item.id), 150);
  }

  return (
    <div
      role="status"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transform: `translateX(${offset}px)`,
        opacity: leaving ? 0 : 1 - Math.min(offset / 200, 0.6),
        transition: drag.current ? "none" : "transform 150ms ease-out, opacity 150ms ease-out",
      }}
      className="flex h-full min-w-full max-w-[24rem] touch-pan-y select-none items-center gap-2 border border-border/70 bg-card/80 pl-1.5 pr-2 text-xs text-foreground shadow-sm backdrop-blur-md animate-in fade-in-0 slide-in-from-right-2 duration-150 md:rounded-[3px]"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        drag.current = { x: e.clientX };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current) setOffset(Math.max(0, e.clientX - drag.current.x));
      }}
      onPointerUp={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x;
        drag.current = null;
        if (dx > DISMISS_AT) dismiss();
        else setOffset(0);
      }}
      onPointerCancel={() => {
        drag.current = null;
        setOffset(0);
      }}
      onWheel={(e) => {
        // Two-finger horizontal swipe. With natural scrolling (the macOS
        // default) moving the fingers right gives a negative deltaX.
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        const w = wheel.current;
        w.total = Math.max(0, w.total - e.deltaX);
        setOffset(w.total);
        if (w.total > DISMISS_AT) {
          w.total = 0;
          dismiss();
          return;
        }
        if (w.timer) clearTimeout(w.timer);
        w.timer = setTimeout(() => {
          w.total = 0;
          setOffset(0);
        }, 160);
      }}
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="shrink-0 rounded-[3px] p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-0 flex-1 truncate">{item.message}</span>
      <button
        type="button"
        onClick={() => {
          item.onUndo();
          clearUndo(item.id);
        }}
        className="shrink-0 rounded-[3px] px-1.5 py-0.5 font-medium text-(--brand-red) transition-colors hover:bg-(--brand-red)/10"
      >
        Undo
      </button>
    </div>
  );
}
