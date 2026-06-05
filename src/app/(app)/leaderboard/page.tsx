import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserGroupsWithMeta, isGroupMember, getActivePlayerCount } from "@/lib/db/groups";
import { getGroupLeaderboard } from "@/lib/db/leaderboard";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import { cn } from "@/lib/utils";
import { computePrizePool, formatCOP, computeProjectedPrizes, type LeaderboardEntry, type PrizePool } from "@/lib/groups";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isAdmin(user.id)) redirect("/admin");
  if (await isUserDisabled(user.id)) redirect("/disabled");
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  const groups = await getUserGroupsWithMeta(user.id);
  const community = groups[0] ?? null;
  const [leaderboard, activePlayers] = await Promise.all([
    community ? getGroupLeaderboard(community.id) : Promise.resolve([]),
    community ? getActivePlayerCount(community.id) : Promise.resolve(0),
  ]);

  const prizePool = community
    ? computePrizePool(
        {
          entry_fee:        community.entry_fee        ?? 0,
          first_place_pct:  community.first_place_pct  ?? 70,
          second_place_pct: community.second_place_pct ?? 30,
        },
        activePlayers
      )
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#f1f5f9]">Tabla de posiciones</h1>
        {community && (
          <p className="text-sm text-[#64748b] mt-1">{community.name}</p>
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
    </div>
  );
}

const TOP_ACCENT = {
  1: { bg: "bg-[#f59e0b]/[0.04]", border: "border-[#f59e0b]/20", rankText: "text-[#f59e0b]" },
  2: { bg: "bg-[#94a3b8]/[0.03]", border: "border-[#94a3b8]/15", rankText: "text-[#94a3b8]" },
  3: { bg: "bg-[#cd7c3a]/[0.04]", border: "border-[#cd7c3a]/20", rankText: "text-[#cd7c3a]" },
} as const;

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function FullLeaderboard({
  entries,
  currentUserId,
  prizePool,
}: {
  entries:       LeaderboardEntry[];
  currentUserId: string;
  prizePool:     PrizePool | null;
}) {
  const allZero  = entries.every((e) => e.total_points === 0);
  const hasPrize = prizePool !== null;

  const projectedPrizes = prizePool ? computeProjectedPrizes(prizePool, entries) : null;
  const hasSplits = projectedPrizes
    ? [...projectedPrizes.values()].some((p) => p.isSplit)
    : false;

  const desktopCols = hasPrize
    ? "grid-cols-[2rem_1fr_3rem_3rem_3rem_3rem_5rem]"
    : "grid-cols-[2rem_1fr_3rem_3rem_3rem_3rem]";

  return (
    <div className="flex flex-col gap-2">

      {/* ── Desktop column headers (sm+) ────────────────────────────── */}
      <div className={cn("hidden sm:grid items-center gap-3 px-4 pb-1", desktopCols)}>
        <div />
        <span className="text-[10px] text-[#64748b] uppercase tracking-widest">Jugador</span>
        <span className="text-[10px] text-[#64748b] uppercase tracking-widest text-center">Pts</span>
        <span className="text-[10px] text-[#f59e0b]/70 uppercase tracking-widest text-center">⚡</span>
        <span className="text-[10px] text-[#38BDF8]/70 uppercase tracking-widest text-center">✓</span>
        <span className="text-[10px] text-[#64748b] uppercase tracking-widest text-center">Preds</span>
        {hasPrize && (
          <span className="text-[10px] text-[#f59e0b]/70 uppercase tracking-widest text-right">Premio</span>
        )}
      </div>

      {entries.map((entry) => {
        const isMe      = entry.user_id === currentUserId;
        const accent    = entry.rank in TOP_ACCENT
          ? TOP_ACCENT[entry.rank as keyof typeof TOP_ACCENT]
          : null;
        const rowBg     = isMe ? "bg-[#38BDF8]/[0.05]" : accent?.bg    ?? "bg-[#18182a]";
        const rowBorder = isMe ? "border-[#38BDF8]/25"  : accent?.border ?? "border-[#2a2a45]";
        const rankColor = isMe ? "text-[#38BDF8]"        : accent?.rankText ?? "text-[#64748b]";
        const ptsColor  = entry.total_points === 0
          ? "text-[#2a2a45]"
          : isMe            ? "text-[#38BDF8]"
          : entry.rank === 1 ? "text-[#f59e0b]"
          : "text-[#f1f5f9]";
        const prize       = projectedPrizes?.get(entry.user_id) ?? null;
        const prizeAmount = prize?.amount ?? null;
        const medal     = MEDALS[entry.rank];

        return (
          <div key={entry.user_id}>

            {/* ── Desktop row (sm+) ──────────────────────────────────── */}
            <div className={cn(
              "hidden sm:grid items-center gap-3 px-4 py-3 rounded-2xl border",
              desktopCols, rowBg, rowBorder
            )}>
              <span className={cn("text-sm font-bold tabular-nums text-center", rankColor)}>
                {entry.rank}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                  isMe ? "bg-[#38BDF8]/20 text-[#38BDF8]" : "bg-[#1e1e35] text-[#94a3b8]"
                )}>
                  {entry.display_name.charAt(0).toUpperCase()}
                </div>
                <span className={cn("text-sm font-bold truncate", isMe ? "text-[#38BDF8]" : "text-[#f1f5f9]")}>
                  {entry.display_name}
                </span>
                {isMe && <span className="text-[10px] text-[#38BDF8]/60 font-mono shrink-0">tú</span>}
              </div>
              <span className={cn("text-sm font-black tabular-nums text-center", ptsColor)}>
                {entry.total_points}
              </span>
              <span className={cn("text-sm font-bold tabular-nums text-center", entry.exact_count  > 0 ? "text-[#f59e0b]" : "text-[#2a2a45]")}>
                {entry.exact_count}
              </span>
              <span className={cn("text-sm font-bold tabular-nums text-center", entry.result_count > 0 ? "text-[#38BDF8]" : "text-[#2a2a45]")}>
                {entry.result_count}
              </span>
              <span className="text-sm font-bold tabular-nums text-center text-[#64748b]">
                {entry.pred_count}
              </span>
              {hasPrize && (
                <span className={cn(
                  "text-xs font-black tabular-nums text-right",
                  prizeAmount !== null ? (entry.rank === 1 ? "text-[#f59e0b]" : "text-[#94a3b8]") : "text-[#475569]"
                )}>
                  {prizeAmount !== null ? formatCOP(prizeAmount) : "—"}
                </span>
              )}
            </div>

            {/* ── Mobile card (<sm) ──────────────────────────────────── */}
            <div className={cn(
              "sm:hidden rounded-2xl border px-4 py-3",
              rowBg, rowBorder
            )}>
              {/* Row 1: medal/rank · name · prize */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn("shrink-0 font-bold tabular-nums", medal ? "text-base leading-none" : cn("text-sm w-5 text-center", rankColor))}>
                  {medal ?? entry.rank}
                </span>
                <span className={cn("flex-1 font-bold text-sm", isMe ? "text-[#38BDF8]" : "text-[#f1f5f9]")}>
                  {entry.display_name}
                  {isMe && (
                    <span className="text-[10px] text-[#38BDF8]/60 font-mono ml-1.5">tú</span>
                  )}
                </span>
                {hasPrize && (
                  <span className={cn(
                    "text-sm font-black tabular-nums shrink-0",
                    prizeAmount !== null ? (entry.rank === 1 ? "text-[#f59e0b]" : "text-[#94a3b8]") : "text-[#475569]"
                  )}>
                    {prizeAmount !== null ? formatCOP(prizeAmount) : "—"}
                  </span>
                )}
              </div>
              {/* Row 2: stats strip */}
              <div className="flex items-center gap-3 pl-7">
                <span className={cn("text-xs font-black tabular-nums", ptsColor)}>
                  {entry.total_points} pts
                </span>
                <span className={cn("text-xs tabular-nums", entry.result_count > 0 ? "text-[#38BDF8]" : "text-[#475569]")}>
                  {entry.result_count} ganador{entry.result_count !== 1 ? "es" : ""}
                </span>
                <span className={cn("text-xs tabular-nums", entry.exact_count > 0 ? "text-[#f59e0b]" : "text-[#475569]")}>
                  {entry.exact_count} exacto{entry.exact_count !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-[#475569] tabular-nums">
                  {entry.pred_count} pred{entry.pred_count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

          </div>
        );
      })}

      {allZero && (
        <p className="text-[11px] text-[#64748b] text-center pt-2 font-mono">
          Los puntos y premios proyectados aparecerán cuando se confirmen resultados de partidos.
        </p>
      )}
      {!allZero && hasSplits && (
        <p className="text-[11px] text-[#64748b] text-center pt-2 font-mono">
          Premio dividido por empate entre jugadores con el mismo puntaje.
        </p>
      )}

      <div className="flex items-center gap-4 justify-center pt-3 border-t border-[#1e1e35] mt-2">
        <span className="text-[10px] text-[#f59e0b]/70">⚡ Marcador exacto</span>
        <span className="text-[10px] text-[#38BDF8]/70">✓ Ganador correcto</span>
        <span className="text-[10px] text-[#64748b] hidden sm:inline">Preds = predicciones</span>
      </div>
    </div>
  );
}
