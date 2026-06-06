import { type PrizePool, formatCOP, formatCompactCOP, type LeaderboardEntry } from "@/lib/groups";

interface PrizePoolCardProps {
  pool:        PrizePool;
  leaderboard: LeaderboardEntry[];
}

export default function PrizePoolCard({ pool, leaderboard }: PrizePoolCardProps) {
  const allZero = leaderboard.every((e) => e.total_points === 0);
  const rank1   = allZero ? [] : leaderboard.filter((e) => e.rank === 1);
  const rank2   = allZero ? [] : leaderboard.filter((e) => e.rank === 2);

  // 1st prize: split when multiple players share rank 1
  const firstAmount  = rank1.length > 1
    ? Math.round(pool.first_prize / rank1.length)
    : rank1.length === 1 ? pool.first_prize : null;
  const firstSplit   = rank1.length > 1;
  const firstNames   = rank1.map((e) => e.display_name);

  // 2nd prize: only shown when 1st is not split (SQL RANK() skips rank 2 when rank 1 ties)
  const showSecond   = rank1.length <= 1;
  const secondAmount = showSecond && rank2.length > 1
    ? Math.round(pool.second_prize / rank2.length)
    : showSecond && rank2.length === 1 ? pool.second_prize : null;
  const secondSplit  = showSecond && rank2.length > 1;
  const secondNames  = showSecond ? rank2.map((e) => e.display_name) : [];

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5">

      {/* Header */}
      <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-0.5">
        Bolsa del Mundial
      </p>
      <p className="text-2xl font-black text-[#f1f5f9] tabular-nums mb-4">
        {formatCOP(pool.total)}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#18182a] border border-[#1e1e35] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#64748b] mb-1">Participantes</p>
          <p className="text-xl font-black text-[#f1f5f9]">{pool.member_count}</p>
        </div>
        <div className="bg-[#18182a] border border-[#1e1e35] rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#64748b] mb-1">Inscripción</p>
          <p className="text-xl font-black text-[#f1f5f9] tabular-nums leading-none">
            <span className="lg:hidden">{formatCOP(pool.config.entry_fee)}</span>
            <span className="hidden lg:inline">{formatCompactCOP(pool.config.entry_fee)}</span>
          </p>
        </div>
      </div>

      {/* Prize splits */}
      <div className="space-y-2 mb-4">
        <PrizeLine
          medal="🥇"
          label={`1er lugar (${pool.config.first_place_pct}%)`}
          amount={firstAmount}
          names={firstNames}
          isSplit={firstSplit}
          highlight
        />
        <PrizeLine
          medal="🥈"
          label={`2do lugar (${pool.config.second_place_pct}%)`}
          amount={secondAmount}
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
        Techtivo Pollita no procesa pagos ni administra dinero. Los aportes y premios son
        gestionados directamente por los participantes del grupo.
      </p>
    </div>
  );
}

function PrizeLine({
  medal,
  label,
  amount,
  names,
  isSplit = false,
  highlight = false,
}: {
  medal:      string;
  label:      string;
  amount:     number | null;
  names:      string[];
  isSplit?:   boolean;
  highlight?: boolean;
}) {
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
      <span className={`text-sm font-black tabular-nums shrink-0 ${
        amount !== null
          ? highlight ? "text-[#f59e0b]" : "text-[#94a3b8]"
          : "text-[#475569]"
      }`}>
        {amount !== null ? formatCOP(amount) : "—"}
      </span>
    </div>
  );
}
