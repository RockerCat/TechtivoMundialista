"use client";

import { useEffect, useRef, useState } from "react";

interface Score {
  home: number | null;
  away: number | null;
}

/**
 * Detects when a live match score changes between renders (e.g. after
 * router.refresh() from LiveMatchPoller) and triggers a short celebration.
 *
 * Celebration triggers when ALL of the following are true:
 *   1. The match is currently live
 *   2. Previous AND current scores are real numbers (not null)
 *      → prevents false positive on null→0 when match transitions to live
 *   3. At least one score component increased
 *      → prevents false positive on score corrections (1-0 → 0-0)
 *
 * Other false-positive guards:
 *   - prevRef starts null → initial mount never fires
 *   - Non-live matches reset prevRef → clean baseline after status flip
 */
export function useGoalCelebration(score: Score, isLive: boolean): boolean {
  const prevRef = useRef<Score | null>(null);
  const [goalAnim, setGoalAnim] = useState(false);

  useEffect(() => {
    if (!isLive) {
      prevRef.current = null;
      return;
    }

    const prev = prevRef.current;

    // Update ref before any early returns so the next render has the right baseline.
    prevRef.current = score;

    if (prev === null) return; // initial mount — skip

    // Both sides must be real numbers (rules out null→0 on match start).
    if (
      prev.home  === null || prev.away  === null ||
      score.home === null || score.away === null
    ) return;

    // At least one score must have increased (rules out corrections like 1-0→0-0).
    if (score.home <= prev.home && score.away <= prev.away) return;

    setGoalAnim(true);

    if (
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      typeof navigator !== "undefined" &&
      "vibrate" in navigator
    ) {
      navigator.vibrate(120);
    }
  }, [score.home, score.away, isLive]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!goalAnim) return;
    const t = setTimeout(() => setGoalAnim(false), 2000);
    return () => clearTimeout(t);
  }, [goalAnim]);

  return goalAnim;
}
