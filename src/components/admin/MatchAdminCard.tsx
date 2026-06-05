"use client";

import { useActionState } from "react";
import Button from "@/components/ui/Button";
import { updateMatchResultAction, type UpdateMatchState } from "@/app/actions/admin";
import { formatKickoff, matchTeamName, matchTeamCode, matchTeamFlag } from "@/lib/matches";
import type { Match } from "@/lib/matches";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Programado",
  live:      "En vivo",
  finished:  "Finalizado",
};

export default function MatchAdminCard({ match }: { match: Match }) {
  const [state, formAction, isPending] = useActionState<UpdateMatchState, FormData>(
    updateMatchResultAction,
    null
  );

  return (
    <form
      action={formAction}
      className="bg-[#18182a] border border-[#2a2a45] rounded-2xl p-4 space-y-4"
    >
      <input type="hidden" name="match_id" value={match.id} />

      {/* Match header */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-base">{matchTeamFlag(match.home_team)}</span>
          <span className="text-sm font-bold text-[#f1f5f9]">{matchTeamName(match.home_team, match.home_placeholder)}</span>
          <span className="text-xs text-[#64748b] font-mono">vs</span>
          <span className="text-sm font-bold text-[#f1f5f9]">{matchTeamName(match.away_team, match.away_placeholder)}</span>
          <span className="text-base">{matchTeamFlag(match.away_team)}</span>
        </div>
        <p className="text-xs text-[#64748b] font-mono">{formatKickoff(match.starts_at)}</p>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">
          Estado
        </label>
        <select
          name="status"
          defaultValue={match.status}
          className="w-full h-11 rounded-xl bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] text-sm px-3 focus:outline-none focus:border-[#00c85a]/60 focus:ring-2 focus:ring-[#00c85a]/10 transition-colors"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#94a3b8]">
            {matchTeamCode(match.home_team, match.home_placeholder)} (local)
          </label>
          <input
            type="number"
            name="home_score"
            defaultValue={match.home_score ?? ""}
            min={0}
            max={30}
            placeholder="–"
            className="h-11 rounded-xl bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] text-sm px-3 text-center tabular-nums focus:outline-none focus:border-[#00c85a]/60 focus:ring-2 focus:ring-[#00c85a]/10 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#94a3b8]">
            {matchTeamCode(match.away_team, match.away_placeholder)} (visitante)
          </label>
          <input
            type="number"
            name="away_score"
            defaultValue={match.away_score ?? ""}
            min={0}
            max={30}
            placeholder="–"
            className="h-11 rounded-xl bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] text-sm px-3 text-center tabular-nums focus:outline-none focus:border-[#00c85a]/60 focus:ring-2 focus:ring-[#00c85a]/10 transition-colors"
          />
        </div>
      </div>

      {state && "error" in state && (
        <p className="text-xs text-[#ef4444]">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-xs text-[#00c85a]">
          {state.scored > 0
            ? `✓ Guardado · Puntos recalculados correctamente (${state.scored} ${state.scored === 1 ? "predicción" : "predicciones"})`
            : "✓ Guardado"}
        </p>
      )}

      <Button type="submit" size="sm" loading={isPending} fullWidth>
        Guardar cambios
      </Button>
    </form>
  );
}
