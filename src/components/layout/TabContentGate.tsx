"use client";

import { useTabTransition, type TabId } from "./TabTransitionProvider";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import LeaderboardSkeleton from "@/components/skeletons/LeaderboardSkeleton";
import EnVivoSkeleton from "@/components/skeletons/EnVivoSkeleton";
import CopaSkeleton from "@/components/skeletons/CopaSkeleton";
import CommunitySkeleton from "@/components/skeletons/CommunitySkeleton";
import ProfileSkeleton from "@/components/skeletons/ProfileSkeleton";
import RulesSkeleton from "@/components/skeletons/RulesSkeleton";

const SKELETON_BY_TAB: Record<TabId, React.ComponentType> = {
  dashboard:   DashboardSkeleton,
  leaderboard: LeaderboardSkeleton,
  "en-vivo":   EnVivoSkeleton,
  copa:        CopaSkeleton,
  community:   CommunitySkeleton,
  profile:     ProfileSkeleton,
  rules:       RulesSkeleton,
};

// Keeps the outgoing page mounted (hidden, not unmounted) while the
// incoming page's skeleton is shown. The skeleton only goes away once the
// new page's TabReadyBeacon confirms it's actually ready — never on a
// timeout, and never just because the route changed.
export default function TabContentGate({ children }: { children: React.ReactNode }) {
  const { pendingTab } = useTabTransition();
  const Skeleton = pendingTab ? SKELETON_BY_TAB[pendingTab] : null;

  return (
    <>
      {Skeleton && <Skeleton />}
      <div hidden={!!pendingTab}>{children}</div>
    </>
  );
}
