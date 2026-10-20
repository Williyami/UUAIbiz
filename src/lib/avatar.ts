import type { CSSProperties } from "react";

// Hues spread round the wheel so neighbouring avatars read as different people.
const HUES = [18, 48, 85, 145, 175, 200, 230, 262, 300, 335];

/**
 * A colour for someone without a profile picture: picked from their id (or
 * name), so the same person always gets the same colour on every screen.
 * Mid-tone fill with white initials, legible in light and dark mode.
 */
export function avatarColor(seed: string | null | undefined): CSSProperties {
  let h = 0;
  for (const ch of seed ?? "") h = (h * 31 + ch.charCodeAt(0)) | 0;
  const hue = HUES[Math.abs(h) % HUES.length];
  return { backgroundColor: `oklch(0.6 0.13 ${hue})`, color: "#fff" };
}
