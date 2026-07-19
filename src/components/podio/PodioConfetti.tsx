"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

// While the Podio stays visible and `active` is true, fires a confetti
// celebration immediately and then again every CELEBRATION_INTERVAL_MS —
// driven entirely by `active` (set by PodiumView once the podium is
// actually on screen), with no sessionStorage/localStorage/global state.
const CONFETTI_COLORS = ["#F59E0B", "#FBBF24", "#FFFFFF", "#38BDF8"];

// Each celebration is 3 distinct explosions (top-center, then ~700ms later
// top-left, then ~700ms later top-right) rather than a single blast.
const BURST_ORIGINS_X = [0.5, 0.15, 0.85];
const BURST_INTERVAL_MS = 700;
const CELEBRATION_INTERVAL_MS = 5000;

function fireBurst(x: number) {
  confetti({
    particleCount: 70,
    spread: 110,
    startVelocity: 35,
    gravity: 1,
    ticks: 200,
    angle: 270, // straight down, fanning out to the sides as it falls
    origin: { x, y: 0.05 },
    colors: CONFETTI_COLORS,
    zIndex: 60,
    disableForReducedMotion: true,
  });
}

// Fires one 3-burst celebration, returning the pending setTimeout ids so
// callers can cancel it mid-sequence (e.g. on cleanup/unmount).
function celebrate(): ReturnType<typeof setTimeout>[] {
  return BURST_ORIGINS_X.map((x, i) =>
    setTimeout(() => fireBurst(x), i * BURST_INTERVAL_MS)
  );
}

export default function PodioConfetti({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let burstTimers = celebrate();

    const intervalId = setInterval(() => {
      burstTimers = celebrate();
    }, CELEBRATION_INTERVAL_MS);

    // Runs on `active` flipping to false, on unmount, and once more on
    // React Strict Mode's dev-only synthetic remount — always tearing
    // down exactly the interval/timers this invocation created, so at
    // most one interval is ever alive at a time.
    return () => {
      clearInterval(intervalId);
      burstTimers.forEach(clearTimeout);
    };
  }, [active]);

  return null;
}
