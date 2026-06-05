"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Check, AlertCircle, ExternalLink } from "lucide-react";
import {
  updateMatchResultAction,
  type UpdateMatchState,
} from "@/app/actions/admin";
import { matchTeamName, matchTeamCode, matchTeamFlag, type Match } from "@/lib/matches";

const STATUS_OPTIONS = [
  { value: "scheduled", label: "🗓 Programado" },
  { value: "live",      label: "🔴 En vivo"   },
  { value: "finished",  label: "✓ Finalizado" },
] as const;

function StatusDot({ status }: { status: string }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#ef4444]/15 border border-[#ef4444]/25 text-[9px] font-black text-[#ef4444] uppercase tracking-wide shrink-0">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
        </span>
        En vivo
      </span>
    );
  }
  if (status === "finished") {
    return <span className="text-[9px] text-[#38BDF8] font-semibold uppercase tracking-wide shrink-0">Fin.</span>;
  }
  return <span className="text-[9px] text-[#64748b] uppercase tracking-wide shrink-0">Prog.</span>;
}

export default function AdminCalendarRow({ match }: { match: Match }) {
  const [state, formAction, isPending] =
    useActionState<UpdateMatchState, FormData>(updateMatchResultAction, null);

  // Controlled state — syncs from props after each save (same pattern as MatchEditorCard)
  const [statusVal,    setStatusVal]    = useState<string>(match.status);
  const [homeScoreVal, setHomeScoreVal] = useState<string | number>(match.home_score ?? "");
  const [awayScoreVal, setAwayScoreVal] = useState<string | number>(match.away_score ?? "");

  useEffect(() => { setStatusVal(match.status); },              [match.status]);
  useEffect(() => { setHomeScoreVal(match.home_score ?? ""); }, [match.home_score]);
  useEffect(() => { setAwayScoreVal(match.away_score ?? ""); }, [match.away_score]);

  const matchLabel = `${matchTeamCode(match.home_team, match.home_placeholder)} vs ${matchTeamCode(match.away_team, match.away_placeholder)}${match.group_code ? ` · G${match.group_code}` : ""}`;

  const kickoffTime = new Date(match.starts_at).toLocaleTimeString("es-CO", {
    hour:     "2-digit",
    minute:   "2-digit",
    timeZone: "America/Bogota",
  });

  const rowBorder = match.status === "live"
    ? "border-[#ef4444]/30 bg-[#ef4444]/[0.03]"
    : match.status === "finished"
    ? "border-[#2a2a45] bg-[#18182a]/50"
    : "border-[#2a2a45] bg-[#18182a]";

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${rowBorder}`}>

      {/* ── Row 1: time · group · status badge ─────────────────────── */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-[#94a3b8] shrink-0 tabular-nums">
            {kickoffTime}
          </span>
          {match.group_code && (
            <span className="text-[9px] font-mono text-[#475569] bg-[#11111c] border border-[#2a2a45] px-1.5 py-0.5 rounded shrink-0">
              G.{match.group_code}
            </span>
          )}
        </div>
        <StatusDot status={match.status} />
      </div>

      {/* ── Row 2: teams + current score ───────────────────────────── */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="text-sm leading-none shrink-0">{matchTeamFlag(match.home_team)}</span>
          <span className="text-xs font-semibold text-[#f1f5f9] truncate">{matchTeamName(match.home_team, match.home_placeholder)}</span>
        </div>
        <div className="shrink-0 text-center w-12">
          {match.home_score !== null && match.away_score !== null ? (
            <span className={`text-sm font-black tabular-nums ${match.status === "live" ? "text-[#ef4444]" : "text-[#f1f5f9]"}`}>
              {match.home_score}–{match.away_score}
            </span>
          ) : (
            <span className="text-[10px] text-[#2a2a45]">vs</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-row-reverse flex-1 min-w-0">
          <span className="text-sm leading-none shrink-0">{matchTeamFlag(match.away_team)}</span>
          <span className="text-xs font-semibold text-[#f1f5f9] truncate text-right">{matchTeamName(match.away_team, match.away_placeholder)}</span>
        </div>
      </div>

      {/* ── Row 3: edit controls ────────────────────────────────────── */}
      <form action={formAction}>
        <input type="hidden" name="match_id"    value={match.id} />
        <input type="hidden" name="match_label" value={matchLabel} />

        <div className="flex items-center gap-1.5 flex-wrap">

          {/* Status select */}
          <select
            name="status"
            value={statusVal}
            onChange={(e) => setStatusVal(e.target.value)}
            className="h-8 rounded-lg bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] text-xs px-2 focus:outline-none focus:border-[#38BDF8]/60 transition-colors"
          >
            {STATUS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Score inputs */}
          <div className="flex items-center gap-1 shrink-0">
            <ScoreInput
              name="home_score"
              value={homeScoreVal}
              onChange={setHomeScoreVal}
              placeholder={matchTeamCode(match.home_team, match.home_placeholder)}
            />
            <span className="text-[#475569] text-xs select-none">–</span>
            <ScoreInput
              name="away_score"
              value={awayScoreVal}
              onChange={setAwayScoreVal}
              placeholder={matchTeamCode(match.away_team, match.away_placeholder)}
            />
          </div>

          {/* Save button */}
          <button
            type="submit"
            disabled={isPending}
            className="h-8 px-3 bg-[#38BDF8] text-[#0a0a12] text-xs font-bold rounded-lg hover:bg-[#7DD3FC] disabled:opacity-40 transition-colors flex items-center gap-1 shrink-0"
          >
            {isPending
              ? <><Loader2 size={11} className="animate-spin" />Guardando</>
              : "Guardar"}
          </button>

          {/* Predictions link */}
          <Link
            href={`/admin/matches/${match.id}`}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#2a2a45] text-[#64748b] hover:text-[#94a3b8] hover:border-[#3a3a60] transition-colors shrink-0"
            title="Ver partido completo"
          >
            <ExternalLink size={11} />
          </Link>

        </div>

        {/* Feedback */}
        {state && "error" in state && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#ef4444]">
            <AlertCircle size={11} className="shrink-0" />{state.error}
          </div>
        )}
        {state && "success" in state && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#38BDF8]">
            <Check size={11} className="shrink-0" />
            {state.scored > 0
              ? `Guardado · ${state.scored} pred${state.scored === 1 ? "" : "s"} calculada${state.scored === 1 ? "" : "s"}`
              : "Guardado"}
          </div>
        )}
      </form>

    </div>
  );
}

function ScoreInput({
  name, value, onChange, placeholder,
}: {
  name:        string;
  value:       string | number;
  onChange:    (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="number"
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={0}
      max={30}
      placeholder="–"
      className="w-10 h-8 text-center text-sm font-bold rounded-lg bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] placeholder:text-[#2a2a45] focus:outline-none focus:border-[#38BDF8]/60 tabular-nums transition-colors"
      style={{ MozAppearance: "textfield" } as React.CSSProperties}
      title={placeholder}
    />
  );
}
