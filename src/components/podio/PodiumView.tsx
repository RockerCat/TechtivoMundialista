import { cn } from "@/lib/utils";
import { formatCOP, computeProjectedPrizes, type LeaderboardEntry, type PrizePool } from "@/lib/groups";
import { FullLeaderboard, TOP_ACCENT, MEDALS } from "@/app/(app)/leaderboard/page";
import PodioConfetti from "./PodioConfetti";

// Read-only Podio ("final podium") view, shared by:
//  - the real /podio page (authenticated users, once the tournament ends)
//  - the admin-only /admin/podio preview (available anytime, before or
//    after the tournament ends, protected by the (admin) layout's isAdmin check)
// Reuses the exact same ranking table (FullLeaderboard) and rank/medal
// styling (TOP_ACCENT, MEDALS) already used on /leaderboard — no second
// interpretation of positions or tiebreaks is introduced here.

export default function PodiumView({
  entries,
  currentUserId,
  prizePool,
  isPreview,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string;
  prizePool: PrizePool;
  isPreview: boolean;
}) {
  const [first, second, third] = entries;
  const pointsGap = first && second ? first.total_points - second.total_points : null;

  // Same prize computation already used on /leaderboard (handles ties/splits) —
  // no new prize logic is introduced here.
  const projectedPrizes = computeProjectedPrizes(prizePool, entries);

  // Confetti + champion phrase only once the tournament is genuinely over —
  // reuses the exact same gate (`!isPreview`) as the champion phrase below,
  // so an admin who keeps the preview open past the real finish sees both
  // switch on together. PodioConfetti fires once per browser tab session
  // (sessionStorage) on mount — it can't restart from a normal re-render.
  const showConfetti = !isPreview && !!first;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {showConfetti && <PodioConfetti />}

      {/* Header */}
      <div className="mb-10 text-center animate-fade-in-up">
        <h1 className="text-2xl font-black text-[#f1f5f9]">Podio final</h1>
        <p className="text-sm text-[#94a3b8] mt-1.5 max-w-md mx-auto">
          Pollita llegó a su final. Gracias por participar, competir y vivir juntos cada partido.
        </p>
        <p className="text-sm font-bold text-[#38BDF8] mt-2">
          Nos vemos en la próxima Pollita!
        </p>
        {!isPreview && first && (
          <p className="text-sm font-bold text-[#f59e0b] mt-3">
            🏆 {first.display_name}, campeón de Pollita
          </p>
        )}
        {isPreview && (
          <p className="inline-block mt-3 text-[11px] text-[#64748b] bg-[#18182a] border border-[#2a2a45] rounded-full px-3 py-1">
            Vista previa para administrador. Las posiciones todavía pueden cambiar.
          </p>
        )}
      </div>

      {/* Podium — 1st centered/tallest, 2nd left, 3rd right */}
      {entries.length > 0 && (
        <div className="mb-10">
          <div className="flex items-end justify-center gap-2 sm:gap-4">
            {second && (
              <PodiumBlock
                entry={second}
                rank={2}
                className="order-1"
                prize={projectedPrizes.get(second.user_id) ?? null}
              />
            )}
            {first && (
              <PodiumBlock
                entry={first}
                rank={1}
                className="order-2"
                prize={projectedPrizes.get(first.user_id) ?? null}
              />
            )}
            {third && (
              <PodiumBlock
                entry={third}
                rank={3}
                className="order-3"
                prize={projectedPrizes.get(third.user_id) ?? null}
              />
            )}
          </div>
          {[first, second, third].some((e) => e && projectedPrizes.get(e.user_id)?.isSplit) && (
            <p className="text-[10px] text-[#64748b] text-center mt-3">
              * Premio dividido por empate entre jugadores con el mismo puntaje.
            </p>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-8">
        <StatTile label="Participantes" value={entries.length} />
        <StatTile
          label={isPreview ? "Puntaje líder" : "Puntaje campeón"}
          value={first ? first.total_points : "–"}
        />
        <StatTile
          label={isPreview ? "Dif. 1º–2º" : "Ventaja final"}
          value={pointsGap !== null ? pointsGap : "–"}
        />
      </div>

      {/* Classification */}
      <div>
        <h2 className="text-lg font-black text-[#f1f5f9] mb-3">
          {isPreview ? "Clasificación actual" : "Clasificación final"}
        </h2>
        {entries.length === 0 ? (
          <div className="bg-[#18182a] border border-dashed border-[#2a2a45] rounded-2xl p-10 text-center">
            <p className="text-sm text-[#64748b]">No hay predicciones registradas todavía.</p>
          </div>
        ) : (
          <FullLeaderboard entries={entries} currentUserId={currentUserId} prizePool={prizePool} />
        )}
      </div>
    </div>
  );
}

const PODIUM_LABEL: Record<1 | 2 | 3, string> = {
  1: "Campeón",
  2: "Segundo lugar",
  3: "Tercer lugar",
};

const PODIUM_HEIGHT: Record<1 | 2 | 3, string> = {
  1: "h-28 sm:h-32",
  2: "h-16 sm:h-20",
  3: "h-10 sm:h-12",
};

// Entrance stagger, in ms: 2nd and 3rd appear almost immediately, the
// champion a few tenths of a second later for extra emphasis. "rise" (the
// pedestal) always follows its own "pop" (avatar/name/data) by ~150ms so
// the participant appears to land on the podium as it rises.
const ENTRANCE_DELAY: Record<1 | 2 | 3, { pop: number; rise: number }> = {
  2: { pop: 0,   rise: 150 },
  3: { pop: 90,  rise: 240 },
  1: { pop: 380, rise: 530 },
};

function PodiumBlock({
  entry,
  rank,
  className,
  prize,
}: {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  className?: string;
  prize: { amount: number | null; isSplit: boolean } | null;
}) {
  const accent = TOP_ACCENT[rank];
  const prizeAmount = prize?.amount ?? null;

  const isChampion = rank === 1;
  const delay = ENTRANCE_DELAY[rank];

  return (
    <div className={cn("flex flex-col items-center w-24 sm:w-28", className)}>
      <div
        className="flex flex-col items-center w-full animate-podium-pop"
        style={{ animationDelay: `${delay.pop}ms` }}
      >
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-black mb-2.5 shrink-0",
            isChampion
              ? "w-16 h-16 sm:w-20 sm:h-20 text-xl sm:text-2xl bg-[#f59e0b]/20 text-[#f59e0b] ring-2 ring-[#f59e0b]/40 shadow-[0_0_18px_rgba(245,158,11,0.2)]"
              : "w-12 h-12 sm:w-14 sm:h-14 text-lg bg-[#1e1e35] text-[#94a3b8]"
          )}
        >
          {entry.display_name.charAt(0).toUpperCase()}
        </div>
        <p
          className={cn(
            "text-center truncate w-full text-[#f1f5f9]",
            isChampion ? "text-sm sm:text-base font-black" : "text-xs sm:text-sm font-bold"
          )}
        >
          {entry.display_name}
        </p>
        <p className="text-base sm:text-lg font-black tabular-nums text-[#f1f5f9] leading-tight">
          {entry.total_points}
          <span className="text-[10px] font-normal text-[#64748b] ml-1">pts</span>
        </p>
        <span
          className={cn(
            "text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 whitespace-nowrap",
            accent.bg,
            accent.rankText
          )}
        >
          {PODIUM_LABEL[rank]}
        </span>
        {prizeAmount !== null && (
          <p className="text-[10px] sm:text-[11px] font-bold text-[#f59e0b] mt-1 tabular-nums whitespace-nowrap">
            {formatCOP(prizeAmount)}{prize?.isSplit ? " *" : ""}
          </p>
        )}
      </div>
      <div
        className={cn(
          "w-full rounded-t-xl mt-4 flex items-start justify-center pt-1.5 relative animate-podium-rise",
          PODIUM_HEIGHT[rank],
          accent.bg,
          accent.border,
          isChampion ? "border-2 shadow-[0_-6px_20px_rgba(245,158,11,0.15)]" : "border"
        )}
        style={{ animationDelay: `${delay.rise}ms` }}
      >
        {isChampion && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-t-xl pointer-events-none animate-champion-glow"
            style={{ animationDelay: `${delay.rise + 500}ms` }}
          />
        )}
        <span className="text-xl sm:text-2xl leading-none">{MEDALS[rank]}</span>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#18182a] border border-[#1e1e35] rounded-xl p-3 text-center">
      <p className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-lg font-black tabular-nums text-[#f1f5f9]">{value}</p>
    </div>
  );
}
