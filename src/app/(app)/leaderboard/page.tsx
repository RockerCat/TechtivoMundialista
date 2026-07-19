import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserGroupsWithMeta, isGroupMember } from "@/lib/db/groups";
import { getGroupLeaderboard } from "@/lib/db/leaderboard";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import { formatCOP, type PrizePool, FIXED_FIRST_PRIZE, FIXED_SECOND_PRIZE } from "@/lib/groups";
import TabReadyBeacon from "@/components/layout/TabReadyBeacon";
import { FullLeaderboard } from "@/components/leaderboard/FullLeaderboard";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isAdmin(user.id)) redirect("/admin");
  if (await isUserDisabled(user.id)) redirect("/disabled");
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  const groups = await getUserGroupsWithMeta(user.id);
  const community = groups[0] ?? null;
  const leaderboard = community ? await getGroupLeaderboard(community.id) : [];

  // Fixed prizes sponsored by Techtivo — not based on participant count
  const prizePool: PrizePool = {
    config:       { entry_fee: 0, first_place_pct: 0, second_place_pct: 0 },
    member_count: leaderboard.length,
    total:        FIXED_FIRST_PRIZE + FIXED_SECOND_PRIZE,
    first_prize:  FIXED_FIRST_PRIZE,
    second_prize: FIXED_SECOND_PRIZE,
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <TabReadyBeacon tabId="leaderboard" />
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#f1f5f9]">Tabla de posiciones</h1>
        {community && (
          <p className="text-sm text-[#64748b] mt-1">Si el Mundial terminara hoy...</p>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <div className="bg-[#18182a] border border-dashed border-[#2a2a45] rounded-2xl p-10 text-center">
          <p className="text-sm text-[#64748b]">
            No hay predicciones registradas todavía.
          </p>
        </div>
      ) : (
        <FullLeaderboard
          entries={leaderboard}
          currentUserId={user.id}
          prizePool={prizePool}
        />
      )}

      {/* Fixed prizes note */}
      <div className="mt-4 bg-[#11111c] border border-[#1e1e35] rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-base shrink-0">🏆</span>
        <div>
          <p className="text-xs font-bold text-[#f1f5f9]">Premios patrocinados por Techtivo</p>
          <p className="text-[10px] text-[#64748b]">🥇 {formatCOP(FIXED_FIRST_PRIZE)} · 🥈 {formatCOP(FIXED_SECOND_PRIZE)} · Inscripción gratis · No dependen del número de participantes.</p>
        </div>
      </div>
    </div>
  );
}

