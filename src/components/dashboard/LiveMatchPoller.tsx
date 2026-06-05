"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

interface LiveMatchPollerProps {
  /** True when at least one live match is present on this page. */
  hasLiveMatch: boolean;
  /**
   * Active interval in milliseconds (used when tab is visible).
   * Dashboard default: 5 000 ms   Match detail default: 3 000 ms
   */
  activeInterval?: number;
}

const HIDDEN_INTERVAL_MS = 60_000;

/**
 * Invisible component — mounts on pages that need live score polling.
 *
 * Behaviour:
 *   - hasLiveMatch=false  → single 60 s interval (scores can't change)
 *   - hasLiveMatch=true   → activeInterval while tab visible, 60 s when hidden
 *   - Uses useTransition so router.refresh() is non-blocking and its pending
 *     state acts as a natural in-flight guard (no double-refresh)
 *   - router.refresh() re-renders server components with fresh DB data
 *     without unmounting client components — accordion state, unsaved
 *     prediction inputs, and goal-animation refs are all preserved
 */
export default function LiveMatchPoller({
  hasLiveMatch,
  activeInterval = 5_000,
}: LiveMatchPollerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isPendingRef = useRef(false);

  // Mirror isPending into a ref so the interval callback always reads the
  // latest value without needing to be recreated on every transition change.
  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    function doRefresh() {
      if (isPendingRef.current) return; // previous refresh still in-flight
      startTransition(() => router.refresh());
    }

    function getInterval() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return HIDDEN_INTERVAL_MS;
      }
      return hasLiveMatch ? activeInterval : HIDDEN_INTERVAL_MS;
    }

    // Set the initial timer.
    let id = setInterval(doRefresh, getInterval());

    // When the tab becomes visible again, restart the interval at the
    // faster rate so users don't wait 60 s after switching back.
    function handleVisibilityChange() {
      clearInterval(id);
      id = setInterval(doRefresh, getInterval());
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasLiveMatch, activeInterval, router]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasLiveMatch) return null;

  return (
    <p className="text-[10px] text-[#64748b] font-mono text-right mb-1 select-none">
      Actualización en vivo activa
    </p>
  );
}
