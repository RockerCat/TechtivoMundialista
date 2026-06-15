import {
  formatCOP,
  computeProjectedPrizes,
  type LeaderboardEntry,
  type PrizePool,
  FIXED_FIRST_PRIZE,
  FIXED_SECOND_PRIZE,
} from "@/lib/groups";

interface PrizePoolCardProps {
  leaderboard: LeaderboardEntry[];
}

const FIXED_POOL: PrizePool = {
  config:       { entry_fee: 0, first_place_pct: 0, second_place_pct: 0 },
  member_count: 0,
  total:        FIXED_FIRST_PRIZE + FIXED_SECOND_PRIZE,
  first_prize:  FIXED_FIRST_PRIZE,
  second_prize: FIXED_SECOND_PRIZE,
};

export default function PrizePoolCard({ leaderboard }: PrizePoolCardProps) {
  const allZero = leaderboard.every((e) => e.total_points === 0);
  const projected = computeProjectedPrizes(FIXED_POOL, leaderboard);

  const rank1 = leaderboard.filter((e) => e.rank === 1);
  const rank2 = leaderboard.filter((e) => e.rank === 2);

  const first  = rank1[0] ? projected.get(rank1[0].user_id) : undefined;
  const second = rank2[0] ? projected.get(rank2[0].user_id) : undefined;

  // When there's a tie for 1st, rank2 entries don't exist (SQL RANK skips them).
  // Both prize lines show the same split amount in that case.
  const firstTied  = rank1.length > 1;
  const secondTied = rank2.length > 1;

  const firstAmount  = first?.amount  ?? null;
  const secondAmount = firstTied ? first?.amount ?? null : (second?.amount ?? null);

  const firstNames  = allZero ? [] : rank1.map((e) => e.display_name);
  const secondNames = allZero || firstTied ? [] : rank2.map((e) => e.display_name);

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5">

      {/* Header */}
      <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-0.5">
        Premios del Mundial
      </p>
      <p className="text-[10px] text-[#22c55e]/80 font-semibold mb-4">
        Patrocinados por Techtivo · Inscripción gratis
      </p>

      {/* Prize lines */}
      <div className="space-y-3 mb-4">
        <PrizeLine
          medal="🥇"
          label="1er lugar"
          fixedAmount={FIXED_FIRST_PRIZE}
          projectedAmount={firstAmount}
          names={firstNames}
          isSplit={firstTied}
          highlight
        />
        <PrizeLine
          medal="🥈"
          label="2do lugar"
          fixedAmount={FIXED_SECOND_PRIZE}
          projectedAmount={secondAmount}
          names={secondNames}
          isSplit={secondTied || firstTied}
        />
      </div>

      {allZero && (
        <p className="text-[10px] text-[#64748b] text-center -mt-1 pb-3">
          Los premios proyectados aparecerán cuando haya resultados puntuados.
        </p>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-[#475569] leading-relaxed border-t border-[#1e1e35] pt-3">
        Premios fijos patrocinados por Techtivo. No dependen del número de participantes.
      </p>
    </div>
  );
}

function PrizeLine({
  medal,
  label,
  fixedAmount,
  projectedAmount,
  names,
  isSplit = false,
  highlight = false,
}: {
  medal:            string;
  label:            string;
  fixedAmount:      number;
  projectedAmount:  number | null;
  names:            string[];
  isSplit?:         boolean;
  highlight?:       boolean;
}) {
  const amountColor = highlight ? "text-[#f59e0b]" : "text-[#94a3b8]";
  const displayAmount = projectedAmount ?? fixedAmount;

  return (
    <div className="flex items-center gap-2">
      <span className="text-base leading-none shrink-0">{medal}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#64748b]">{label}</p>
        {names.length > 0 && (
          <p className="text-xs font-semibold text-[#94a3b8] truncate">{names.join(", ")}</p>
        )}
        {isSplit && (
          <p className="text-[10px] text-[#64748b]">Dividido por empate</p>
        )}
      </div>
      <span className={`text-sm font-black tabular-nums shrink-0 ${amountColor}`}>
        {formatCOP(displayAmount)}
      </span>
    </div>
  );
}
