import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { readTheme, saveTheme, watchSystemTheme, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "auto", label: "Auto", icon: Monitor },
];

/**
 * Theme picker: hovering (or clicking, on touch) the button drops down three
 * choices. "Auto" follows the operating system and switches with it live.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(() =>
    typeof window === "undefined" ? "dark" : readTheme(),
  );
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const choiceRef = useRef(choice);
  choiceRef.current = choice;

  useEffect(() => watchSystemTheme(() => choiceRef.current), []);

  // A short delay so the pointer can travel from the button into the menu.
  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function hide() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function pick(next: ThemeChoice) {
    setChoice(next);
    saveTheme(next);
    setOpen(false);
  }

  const Current = OPTIONS.find((o) => o.value === choice)!.icon;

  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && hide()}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        title="Theme"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-[3px] p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Current className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 pt-1.5 animate-in fade-in-0 slide-in-from-top-1 duration-150"
        >
          <div className="flex flex-col gap-0.5 border bg-popover p-1 shadow-md">
            {OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                role="menuitemradio"
                aria-checked={choice === value}
                onClick={() => pick(value)}
                className={`flex items-center gap-2 rounded-[3px] px-2.5 py-1.5 text-xs transition-colors ${
                  choice === value
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
