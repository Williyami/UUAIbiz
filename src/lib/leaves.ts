// On/off switch for the falling-leaves background, stored per browser.

const KEY = "bh-leaves";
/** Fired on window when the setting changes, so the background updates live. */
export const LEAVES_CHANGE = "bh-leaves-change";

export function leavesEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setLeavesEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* private browsing */
  }
  window.dispatchEvent(new Event(LEAVES_CHANGE));
}
