import { formatCOP, type LeaderboardEntry, FIXED_FIRST_PRIZE, FIXED_SECOND_PRIZE } from "@/lib/groups";

interface PrizePoolCardProps {
  leaderboard: LeaderboardEntry[];
}

export default function PrizePoolCard({ leaderboard }: PrizePoolCardProps) {
  const allZero = leaderboard.every((e) => e.total_points === 0);
  const rank1   = allZero ? [] : leaderboard.filter((e) => e.rank === 1);
  const rank2   = allZero ? [] : leaderboard.filter((e) => e.rank === 2);

  const firstSplit   = rank1.length > 1;
  const firstNames   = rank1.map((e) => e.display_name);
  const firstAmount  = rank1.length > 1
    ? Math.round(FIXED_FIRST_PRIZE / rank1.length)
    : rank1.length === 1 ? FIXED_FIRST_PRIZE : null;

  const showSecond   = rank1.length <= 1;
  const secondSplit  = showSecond && rank2.length > 1;
  const secondNames  = showSecond ? rank2.map((e) => e.display_name) : [];
  const secondAmount = showSecond && rank2.length > 1
    ? Math.round(FIXED_SECOND_PRIZE / rank2.length)
    : showSecond && rank2.length === 1 ? FIXED_SECOND_PRIZE : null;

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
          isSplit={firstSplit}
          highlight
        />
        <PrizeLine
          medal="🥈"
          label="2do lugar"
          fixedAmount={FIXED_SECOND_PRIZE}
          projectedAmount={secondAmount}
          names={secondNames}
          isSplit={secondSplit}
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
