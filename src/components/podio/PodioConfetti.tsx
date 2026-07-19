"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

// Only mounted by PodiumView when the tournament has genuinely finished
// (`!isPreview && !!first`) — mounting itself is the trigger, so there is
// no extra "active" prop to track. Fires once per browser tab session via
// sessionStorage: leaving and reopening the page later (new tab/session)
// can show it again, but it won't repeat from re-renders or from
// navigating back to the page within the same session.
const SESSION_KEY = "pollita_podio_confetti_shown";

const CONFETTI_COLORS = ["#F59E0B", "#FBBF24", "#FFFFFF", "#38BDF8"];

// Ceremony sequence: top-center, then ~700ms later top-left, then ~700ms
// later top-right — three distinct explosions rather than a single blast
// or a continuous stream. Each burst's particles keep falling for a couple
// seconds on their own, so the last one (fired at ~1400ms) still reads as
// part of the same celebration through roughly 3–5s in total.
const BURST_ORIGINS_X = [0.5, 0.15, 0.85];
const BURST_INTERVAL_MS = 700;

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

export default function PodioConfetti() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage unavailable (e.g. private browsing) — still fine to
      // fire once for this mount, just without the cross-navigation guard.
    }

    const timers = BURST_ORIGINS_X.map((x, i) =>
      setTimeout(() => fireBurst(x), i * BURST_INTERVAL_MS)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return null;
}
