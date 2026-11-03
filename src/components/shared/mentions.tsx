import { useState } from "react";
import { avatarColor } from "@/lib/avatar";
import { initials } from "@/lib/format";

// @mentions. A handle is the person's first name when nobody else shares it,
// otherwise their full name without spaces. The notify_mentions trigger in
// the database matches handles the same way, so what the picker inserts is
// exactly what notifies.

type Person = { id: string; name: string | null; email: string };

const first = (name: string | null) => (name ?? "").trim().split(/\s+/)[0] ?? "";
const compact = (name: string | null) => (name ?? "").replace(/\s+/g, "");

export function mentionHandle(p: Person, everyone: Person[]): string {
  const f = first(p.name).toLowerCase();
  const shared = everyone.filter((q) => first(q.name).toLowerCase() === f).length > 1;
  return (shared ? compact(p.name) : first(p.name)) || p.email.split("@")[0];
}

/** Finds who a "@token" refers to, matching the database's rules. */
function resolve(token: string, everyone: Person[]): Person | undefined {
  const t = token.toLowerCase();
  return (
    everyone.find((p) => compact(p.name).toLowerCase() === t) ??
    (everyone.filter((p) => first(p.name).toLowerCase() === t).length === 1
      ? everyone.find((p) => first(p.name).toLowerCase() === t)
      : undefined)
  );
}

const TOKEN = /@[\p{L}\p{N}_]+/gu;

/** Message text with every real @mention highlighted. */
export function MentionText({ text, people }: { text: string; people: Person[] }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const who = resolve(m[0].slice(1), people);
    if (!who) continue;
    parts.push(text.slice(last, m.index));
    parts.push(
      <span
        key={m.index}
        title={who.name ?? who.email}
        className="rounded-[3px] bg-(--brand-red)/10 px-0.5 font-medium text-(--brand-red)"
      >
        {m[0]}
      </span>,
    );
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

/**
 * Typing "@" in a text field opens a list of teammates; arrow keys or the
 * mouse pick one, which inserts their handle. Wire the returned handlers onto
 * the input and render `menu` inside a `relative` wrapper around it.
 */
export function useMentions({
  people,
  value,
  setValue,
  inputRef,
  above = false,
}: {
  people: Person[];
  value: string;
  setValue: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  /** Open the list upwards, for inputs at the bottom of the screen (chat). */
  above?: boolean;
}) {
  const [query, setQuery] = useState<{ start: number; text: string } | null>(null);
  const [index, setIndex] = useState(0);

  function update(el: HTMLInputElement | HTMLTextAreaElement) {
    const caret = el.selectionStart ?? el.value.length;
    const m = el.value.slice(0, caret).match(/(^|\s)@([\p{L}\p{N}_]*)$/u);
    if (m) {
      setQuery({ start: caret - m[2].length - 1, text: m[2].toLowerCase() });
      setIndex(0);
    } else setQuery(null);
  }

  const options = query
    ? people
        .filter((p) => {
          const h = mentionHandle(p, people).toLowerCase();
          const n = (p.name ?? "").toLowerCase();
          return h.startsWith(query.text) || n.split(/\s+/).some((w) => w.startsWith(query.text));
        })
        .slice(0, 6)
    : [];

  function pick(p: Person) {
    if (!query) return;
    const el = inputRef.current;
    const caret = el?.selectionStart ?? value.length;
    const handle = `@${mentionHandle(p, people)} `;
    const next = value.slice(0, query.start) + handle + value.slice(caret);
    setValue(next);
    setQuery(null);
    requestAnimationFrame(() => {
      const pos = query.start + handle.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  /** Returns true when the key was used by the list (so the caller skips it). */
  function onKeyDown(e: React.KeyboardEvent): boolean {
    if (!query || options.length === 0) return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (i + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(options[Math.min(index, options.length - 1)]);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setQuery(null);
      return true;
    }
    return false;
  }

  const menu =
    query && options.length > 0 ? (
      <ul
        role="listbox"
        className={`absolute left-0 z-50 w-64 border bg-popover p-1 shadow-md ${above ? "bottom-full mb-1" : "top-full mt-1"}`}
      >
        {options.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              role="option"
              aria-selected={i === index}
              // mousedown so the input keeps focus and the caret position
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              className={`flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-sm ${
                i === index ? "bg-accent" : "hover:bg-accent/60"
              }`}
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold"
                style={avatarColor(p.id)}
              >
                {initials(p.name || p.email)}
              </span>
              <span className="min-w-0 flex-1 truncate">{p.name || p.email}</span>
              <span className="text-xs text-muted-foreground">@{mentionHandle(p, people)}</span>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return {
    menu,
    onKeyDown,
    /** Call from onChange / onSelect / onClick with the field element. */
    track: update,
  };
}
