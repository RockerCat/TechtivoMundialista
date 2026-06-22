"use client";

import { useEffect } from "react";
import { useTabTransition, type TabId } from "./TabTransitionProvider";

// Mounted near the top of each main screen's JSX. Since these screens are
// async Server Components that only render once all their data has
// resolved, "mounted" already means "ready to show" — this effect is the
// signal that tells the tab skeleton to disappear.
export default function TabReadyBeacon({ tabId }: { tabId: TabId }) {
  const { finishTabTransition } = useTabTransition();

  useEffect(() => {
    finishTabTransition(tabId);
  }, [tabId, finishTabTransition]);

  return null;
}
