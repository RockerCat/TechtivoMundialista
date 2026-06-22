"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export type TabId =
  | "dashboard"
  | "leaderboard"
  | "en-vivo"
  | "copa"
  | "community"
  | "profile"
  | "rules";

export function tabForPathname(pathname: string): TabId | null {
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/leaderboard")) return "leaderboard";
  if (pathname.startsWith("/en-vivo")) return "en-vivo";
  if (pathname.startsWith("/copa")) return "copa";
  if (pathname.startsWith("/community") || pathname.startsWith("/groups")) return "community";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/rules")) return "rules";
  return null;
}

interface TabTransitionContextValue {
  pendingTab: TabId | null;
  startTabTransition: (tabId: TabId) => void;
  finishTabTransition: (tabId: TabId) => void;
}

const TabTransitionContext = createContext<TabTransitionContextValue | null>(null);

export function TabTransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);

  const startTabTransition = useCallback((tabId: TabId) => {
    setPendingTab(tabId);
  }, []);

  const finishTabTransition = useCallback((tabId: TabId) => {
    setPendingTab((prev) => (prev === tabId ? null : prev));
  }, []);

  // Safety net: if navigation lands somewhere other than the pending tab
  // (redirects to /admin, /login, /disabled, /no-access, browser back/forward,
  // etc.), the expected page's ready beacon will never mount — so the
  // skeleton would otherwise be stuck forever. Clear it once the route has
  // visibly moved away from what we were waiting for.
  useEffect(() => {
    const landedTab = tabForPathname(pathname);
    setPendingTab((prev) => (prev !== null && prev !== landedTab ? null : prev));
  }, [pathname]);

  const value = useMemo(
    () => ({ pendingTab, startTabTransition, finishTabTransition }),
    [pendingTab, startTabTransition, finishTabTransition]
  );

  return <TabTransitionContext.Provider value={value}>{children}</TabTransitionContext.Provider>;
}

export function useTabTransition(): TabTransitionContextValue {
  const ctx = useContext(TabTransitionContext);
  if (!ctx) {
    throw new Error("useTabTransition must be used within a TabTransitionProvider");
  }
  return ctx;
}
