import { useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Flips the .dark class on <html>; persisted in localStorage and restored
 *  before paint by the inline script in __root.tsx. */
export function ThemeToggle() {
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("bh-theme", next ? "dark" : "light");
    } catch {
      /* private browsing */
    }
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-[3px] p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
