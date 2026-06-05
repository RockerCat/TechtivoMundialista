import RecalculateButton from "@/components/admin/RecalculateButton";
import { createClient } from "@/lib/supabase/server";
import { getUserGroupsWithMeta } from "@/lib/db/groups";
import { getGroupLeaderboard } from "@/lib/db/leaderboard";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

export default async function AdminRankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const groups    = await getUserGroupsWithMeta(user.id);
  const community = groups[0] ?? null;
  const leaderboard = community ? await getGroupLeaderboard(community.id) : [];

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

      <div>
        <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
          Admin · Ranking
        </p>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Tabla de posiciones</h1>
        <p className="text-sm text-[#94a3b8] mt-0.5">
          Vista de solo lectura · {leaderboard.length} participante{leaderboard.length !== 1 ? "s" : ""}
        </p>
      </div>

      <RecalculateButton />

      {leaderboard.length === 0 ? (
        <p className="text-sm text-[#64748b]">Aún no hay predicciones puntuadas.</p>
      ) : (
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 px-5 py-3 border-b border-[#1e1e35] text-[10px] font-semibold text-[#64748b] uppercase tracking-widest">
            <span className="w-7">#</span>
            <span>Jugador</span>
            <span className="text-right">Pts</span>
            <span className="text-right">Exactos</span>
            <span className="text-right">Correct.</span>
            <span className="text-right">Preds</span>
          </div>

          <div className="divide-y divide-[#1e1e35]">
            {leaderboard.map((entry) => {
              const medal = entry.rank <= 3 ? MEDALS[entry.rank - 1] : null;
              return (
                <div
                  key={entry.user_id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 items-center px-5 py-3"
                >
                  {/* Rank */}
                  <div className="w-7 text-center">
                    {medal ? (
                      <span className="text-sm">{medal}</span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#64748b]">
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <p className="text-sm font-semibold text-[#f1f5f9] truncate">
                    {entry.display_name}
                  </p>

                  {/* Points */}
                  <p className={cn(
                    "text-sm font-black tabular-nums text-right",
                    entry.rank === 1 ? "text-[#f59e0b]" : "text-[#f1f5f9]"
                  )}>
                    {entry.total_points}
                  </p>

                  {/* Exact */}
                  <p className="text-xs tabular-nums text-[#f59e0b] text-right">
                    {entry.exact_count > 0 ? `⚡${entry.exact_count}` : "—"}
                  </p>

                  {/* Correct */}
                  <p className="text-xs tabular-nums text-[#38BDF8] text-right">
                    {entry.result_count > 0 ? `✓${entry.result_count}` : "—"}
                  </p>

                  {/* Pred count */}
                  <p className="text-xs text-[#64748b] tabular-nums text-right">
                    {entry.pred_count}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
