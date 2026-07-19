import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTournamentFinished } from "@/lib/db/matches";
import { getUserGroupsWithMeta, isGroupMember } from "@/lib/db/groups";
import { getGroupLeaderboard } from "@/lib/db/leaderboard";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import { FIXED_FIRST_PRIZE, FIXED_SECOND_PRIZE, type PrizePool } from "@/lib/groups";
import TabReadyBeacon from "@/components/layout/TabReadyBeacon";
import PodiumView from "@/components/podio/PodiumView";

export default async function PodioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isAdmin(user.id)) redirect("/admin");
  if (await isUserDisabled(user.id)) redirect("/disabled");
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  // Podio only unlocks for regular users once every match has actually
  // finished — before that, the nav doesn't link here, and a direct visit
  // sends the user back to the current "En vivo" page.
  if (!(await isTournamentFinished())) redirect("/en-vivo");

  const groups      = await getUserGroupsWithMeta(user.id);
  const community    = groups[0] ?? null;
  const leaderboard  = community ? await getGroupLeaderboard(community.id) : [];

  // Fixed prizes sponsored by Techtivo — same object shape used on /leaderboard
  const prizePool: PrizePool = {
    config:       { entry_fee: 0, first_place_pct: 0, second_place_pct: 0 },
    member_count: leaderboard.length,
    total:        FIXED_FIRST_PRIZE + FIXED_SECOND_PRIZE,
    first_prize:  FIXED_FIRST_PRIZE,
    second_prize: FIXED_SECOND_PRIZE,
  };

  return (
    <>
      <TabReadyBeacon tabId="en-vivo" />
      <PodiumView
        entries={leaderboard}
        currentUserId={user.id}
        prizePool={prizePool}
        isPreview={false}
      />
    </>
  );
}
