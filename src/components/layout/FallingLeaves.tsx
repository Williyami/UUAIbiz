import { useEffect, useState } from "react";
import { LEAVES_CHANGE, leavesEnabled } from "@/lib/leaves";

// A few red autumn leaves drifting down behind the app. Purely decorative:
// fixed behind everything, never clickable, transform/opacity only, and off
// for anyone who prefers reduced motion. Can be switched off in Settings.

// Brand red in a few autumn shades, from deep crimson to a warmer rust.
const COLORS = [
  "oklch(0.53 0.2 19.5)",
  "oklch(0.58 0.19 28)",
  "oklch(0.47 0.17 18)",
  "oklch(0.62 0.17 38)",
];

const LEAF_COUNT = 14;

type Leaf = {
  left: number; // % across the screen
  size: number; // px
  fall: number; // seconds per trip down
  sway: number; // seconds per side-to-side
  delay: number; // negative, so leaves are already mid-air on load
  color: string;
  opacity: number;
  shape: 0 | 1;
};

function makeLeaves(): Leaf[] {
  // Seeded so the layout is stable between renders.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: LEAF_COUNT }, (_, i) => {
    const fall = 16 + rand() * 14;
    return {
      left: (i / LEAF_COUNT) * 100 + rand() * (100 / LEAF_COUNT),
      size: 14 + rand() * 16,
      fall,
      sway: 3 + rand() * 3,
      delay: -rand() * fall,
      color: COLORS[Math.floor(rand() * COLORS.length)],
      opacity: 0.35 + rand() * 0.35,
      shape: rand() > 0.5 ? 1 : 0,
    };
  });
}

// Two simple leaf silhouettes: a maple and a rounder birch-like leaf.
const SHAPES = [
  "M12 1l1.6 4.2 3.6-1.9-.9 4.5 4.2.5-3.3 3 2.3 1.6-4.4.9.4 3.6-3.5-2.2-.4 5.8h-1.2l-.4-5.8-3.5 2.2.4-3.6-4.4-.9 2.3-1.6-3.3-3 4.2-.5-.9-4.5 3.6 1.9z",
  "M12 2c4.5 3 7 7 6 11.5-.8 3.6-3.6 5.8-5.4 6.4V23h-1.2v-3.1C9.6 19.3 6.8 17.1 6 13.5 5 9 7.5 5 12 2z",
];

export function FallingLeaves() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setShow(leavesEnabled() && !reduce.matches);
    update();
    reduce.addEventListener("change", update);
    window.addEventListener(LEAVES_CHANGE, update);
    return () => {
      reduce.removeEventListener("change", update);
      window.removeEventListener(LEAVES_CHANGE, update);
    };
  }, []);

  if (!show) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {makeLeaves().map((leaf, i) => (
        <div
          key={i}
          className="leaf-fall absolute top-0"
          style={{
            left: `${leaf.left}%`,
            animationDuration: `${leaf.fall}s`,
            animationDelay: `${leaf.delay}s`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={leaf.size}
            height={leaf.size}
            className="leaf-sway"
            style={{
              opacity: leaf.opacity,
              animationDuration: `${leaf.sway}s`,
              animationDelay: `${leaf.delay}s`,
            }}
          >
            <path d={SHAPES[leaf.shape]} fill={leaf.color} />
          </svg>
        </div>
      ))}
    </div>
  );
}
