import { createClient } from "@/lib/supabase/server";
import { isTournamentFinished } from "@/lib/db/matches";
import { getUserGroupsWithMeta } from "@/lib/db/groups";
import { getGroupLeaderboard } from "@/lib/db/leaderboard";
import { FIXED_FIRST_PRIZE, FIXED_SECOND_PRIZE, type PrizePool } from "@/lib/groups";
import PodiumView from "@/components/podio/PodiumView";

// Admin-only, read-only preview of the final Podio page.
// Access control is entirely inherited from src/app/(admin)/layout.tsx,
// which already redirects any non-admin to /dashboard — no separate
// auth/role logic is introduced here.
// Uses the same live ranking data the real /podio page will use once the
// tournament finishes; positions may still change while matches are pending.
export default async function AdminPodioPreviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // unreachable: (admin) layout already redirects unauthenticated users

  const finished = await isTournamentFinished();

  const groups     = await getUserGroupsWithMeta(user.id);
  const community  = groups[0] ?? null;
  const leaderboard = community ? await getGroupLeaderboard(community.id) : [];

  const prizePool: PrizePool = {
    config:       { entry_fee: 0, first_place_pct: 0, second_place_pct: 0 },
    member_count: leaderboard.length,
    total:        FIXED_FIRST_PRIZE + FIXED_SECOND_PRIZE,
    first_prize:  FIXED_FIRST_PRIZE,
    second_prize: FIXED_SECOND_PRIZE,
  };

  return (
    <PodiumView
      entries={leaderboard}
      currentUserId={user.id}
      prizePool={prizePool}
      isPreview={!finished}
    />
  );
}
