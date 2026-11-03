import { toast } from "sonner";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { hashKey } from "@tanstack/react-query";

const UNDO_MS = 6000;

// The Undo bar isn't a regular toast: it renders inside the top toolbar
// (UndoSlot), at the toolbar's exact height and right edge, covering it while
// it shows. Only the latest one is shown; an older one's delete still runs.
export type UndoItem = { id: number; message: string; onUndo: () => void };

let current: UndoItem | null = null;
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function subscribeUndo(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export const getUndo = () => current;
export const UNDO_VISIBLE_MS = UNDO_MS;

/** Hides the bar, if it is still showing this item. */
export function clearUndo(id: number) {
  if (current?.id === id) {
    current = null;
    emit();
  }
}

function showUndo(message: string, onUndo: () => void) {
  current = { id: ++nextId, message, onUndo };
  emit();
}

/** A toast with an Undo button, for moves and status changes already saved. */
export function undoToast(message: string, undo: () => unknown) {
  showUndo(message, async () => {
    try {
      await undo();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't undo");
    }
  });
}

// Deletes still inside their undo window. If the tab closes, they run anyway
// (best effort) rather than silently never happening.
const pending = new Map<string, () => Promise<void>>();
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    for (const run of pending.values()) void run();
    pending.clear();
  });
}

/**
 * Hides a row at once and deletes it for real only after the undo window.
 * Undo puts it back as if nothing happened — nothing was deleted, so links
 * (contacts on a company, comments on an idea) all survive.
 *
 * `hide` removes the row from the cached list; it is re-applied if the list
 * refetches while the delete is pending, so the row can't flicker back.
 */
export function deleteWithUndo({
  qc,
  queryKey,
  id,
  message,
  run,
  hide = (data: any) => (Array.isArray(data) ? data.filter((r: any) => r?.id !== id) : data),
  onCommitted,
}: {
  qc: QueryClient;
  queryKey: QueryKey;
  id: string;
  message: string;
  run: () => Promise<void>;
  hide?: (data: any) => any;
  onCommitted?: () => void;
}) {
  const key = `${hashKey(queryKey)}:${id}`;
  const hashed = hashKey(queryKey);
  void qc.cancelQueries({ queryKey });
  qc.setQueryData(queryKey, hide);

  const unsubscribe = qc.getQueryCache().subscribe((event) => {
    if (
      event.type === "updated" &&
      event.query.queryHash === hashed &&
      event.action.type === "success" &&
      !(event.action as { manual?: boolean }).manual
    ) {
      qc.setQueryData(queryKey, hide);
    }
  });

  let settled = false;
  const commit = async () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    pending.delete(key);
    unsubscribe();
    try {
      await run();
      onCommitted?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't delete");
    } finally {
      qc.invalidateQueries({ queryKey });
    }
  };
  const timer = setTimeout(commit, UNDO_MS);
  pending.set(key, commit);

  showUndo(message, () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    pending.delete(key);
    unsubscribe();
    qc.invalidateQueries({ queryKey });
  });
}
