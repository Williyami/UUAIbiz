import { useRef, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

const DISMISS_AT = 80; // px of rightward travel that throws the toast away

/**
 * The small see-through toast used for Undo. It goes away with its ×, by
 * dragging it to the right with the mouse, or with a two-finger swipe to the
 * right on a trackpad.
 */
export function UndoToast({
  id,
  message,
  onUndo,
}: {
  id: string | number;
  message: string;
  onUndo: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const drag = useRef<{ x: number } | null>(null);
  const wheel = useRef({ total: 0, timer: null as ReturnType<typeof setTimeout> | null });

  function dismiss() {
    setLeaving(true);
    setOffset(320);
    setTimeout(() => toast.dismiss(id), 150);
  }

  function settle(dx: number) {
    if (dx > DISMISS_AT) dismiss();
    else setOffset(0);
  }

  return (
    <div
      role="status"
      style={{
        transform: `translateX(${offset}px)`,
        opacity: leaving ? 0 : 1 - Math.min(offset / 240, 0.6),
        transition: drag.current ? "none" : "transform 150ms ease-out, opacity 150ms ease-out",
      }}
      className="ml-auto flex w-fit max-w-[22rem] touch-pan-y select-none items-center gap-2 border border-border/70 bg-popover/70 py-1.5 pl-3 pr-1.5 text-xs text-foreground shadow-sm backdrop-blur-md"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        drag.current = { x: e.clientX };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        setOffset(Math.max(0, e.clientX - drag.current.x));
      }}
      onPointerUp={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x;
        drag.current = null;
        settle(dx);
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
      <span className="min-w-0 truncate">{message}</span>
      <button
        type="button"
        onClick={() => {
          onUndo();
          toast.dismiss(id);
        }}
        className="shrink-0 rounded-[3px] px-1.5 py-0.5 font-medium text-(--brand-red) transition-colors hover:bg-(--brand-red)/10"
      >
        Undo
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="shrink-0 rounded-[3px] p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
