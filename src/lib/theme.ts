// Light, dark, or follow the operating system. Stored per browser; the inline
// script in __root.tsx applies it before first paint so there is no flash.

export type ThemeChoice = "light" | "dark" | "auto";

const KEY = "bh-theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {
    /* private browsing */
  }
  return "dark"; // the hub's default before a choice is made
}

export function applyTheme(choice: ThemeChoice) {
  const dark = choice === "auto" ? media().matches : choice === "dark";
  document.documentElement.classList.toggle("dark", dark);
}

export function saveTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* private browsing */
  }
  applyTheme(choice);
}

/** Re-applies "auto" whenever the system switches between light and dark. */
export function watchSystemTheme(getChoice: () => ThemeChoice): () => void {
  const mq = media();
  const onChange = () => getChoice() === "auto" && applyTheme("auto");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
