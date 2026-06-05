"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Check, AlertCircle, ChevronDown, ChevronUp, Users, Settings2 } from "lucide-react";
import {
  updateMatchResultAction,
  updateMatchFixtureAction,
  getMatchPredictionsAction,
  type UpdateMatchState,
  type UpdateFixtureState,
  type MatchPrediction,
} from "@/app/actions/admin";
import { matchTeamName, matchTeamCode, matchTeamFlag, type Match } from "@/lib/matches";

// ── Helpers ───────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "scheduled", label: "🗓 Programado" },
  { value: "live",      label: "🔴 En vivo"   },
  { value: "finished",  label: "✓ Finalizado" },
] as const;

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest">
      {children}
    </label>
  );
}

function AdminInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 rounded-xl bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] text-sm px-3 focus:outline-none focus:border-[#38BDF8]/60 focus:ring-2 focus:ring-[#38BDF8]/10 transition-colors placeholder:text-[#2a2a45] ${className}`}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-[#2a2a45] text-[#94a3b8]",
    live:      "bg-[#ef4444]/15 text-[#ef4444]",
    finished:  "bg-[#38BDF8]/15 text-[#38BDF8]",
  };
  const labels: Record<string, string> = {
    scheduled: "Programado", live: "En vivo", finished: "Finalizado",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${colors[status] ?? colors.scheduled}`}>
      {labels[status] ?? status}
    </span>
  );
}

function FormFeedback({ state }: { state: UpdateMatchState | UpdateFixtureState }) {
  if (!state) return null;
  if ("error" in state) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#ef4444]">
        <AlertCircle size={12} className="shrink-0" />{state.error}
      </div>
    );
  }
  const scored = "scored" in state ? state.scored : null;
  return (
    <div className="flex items-center gap-2 text-xs text-[#38BDF8]">
      <Check size={12} className="shrink-0" />
      {scored !== null && scored > 0
        ? `Guardado · ${scored} predicción${scored === 1 ? "" : "es"} recalculada${scored === 1 ? "" : "s"}`
        : "Guardado correctamente"}
    </div>
  );
}

// ── Predictions panel (inline, expandable) ────────────────────────────

function PredictionsPanel({ matchId }: { matchId: string }) {
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const [predictions, setPredictions] = useState<MatchPrediction[] | null>(null);
  const [fetchError, setFetchError]   = useState<string | null>(null);

  async function toggle() {
    if (!open && predictions === null) {
      setLoading(true);
      const result = await getMatchPredictionsAction(matchId);
      setLoading(false);
      if (result.error) { setFetchError(result.error); return; }
      setPredictions(result.predictions ?? []);
    }
    setOpen((v) => !v);
  }

  return (
    <div className="border-t border-[#1e1e35]">
      {/* Toggle button */}
      <button
        onClick={toggle}
        disabled={loading}
        className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-[#94a3b8] hover:text-[#94a3b8] hover:bg-[#18182a]/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Users size={12} />
          )}
          {predictions !== null
            ? `Ver pronósticos (${predictions.length})`
            : "Ver pronósticos"}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Error */}
      {fetchError && (
        <p className="px-5 pb-3 text-xs text-[#ef4444]">{fetchError}</p>
      )}

      {/* Predictions table */}
      {open && predictions !== null && (
        <div className="px-5 pb-4">
          {predictions.length === 0 ? (
            <p className="text-xs text-[#64748b] py-2">
              No existen pronósticos para este partido.
            </p>
          ) : (
            <div className="rounded-xl overflow-hidden border border-[#1e1e35]">
              {/* Header */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 bg-[#0e0e1d] text-[9px] font-semibold text-[#64748b] uppercase tracking-widest">
                <span>Usuario</span>
                <span className="text-center">Pronóstico</span>
                <span className="text-right">Enviado</span>
              </div>
              {/* Rows */}
              <div className="divide-y divide-[#1e1e35]">
                {predictions.map((p) => {
                  const wasModified = p.updated_at !== p.submitted_at;
                  return (
                    <div key={p.user_id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#f1f5f9] truncate">
                          {p.display_name}
                        </p>
                        {wasModified && (
                          <p className="text-[9px] text-[#f59e0b]">modificado</p>
                        )}
                      </div>
                      <div className="text-center">
                        <span className="font-mono text-xs font-black text-[#f1f5f9]">
                          {p.home_score}–{p.away_score}
                        </span>
                        {p.points !== null && p.points !== undefined && (
                          <p className={`text-[9px] font-mono ${p.points > 0 ? "text-[#38BDF8]" : "text-[#64748b]"}`}>
                            {p.points > 0 ? `+${p.points}` : "0"} pts
                          </p>
                        )}
                      </div>
                      <p className="text-[9px] text-[#64748b] text-right tabular-nums">
                        {new Date(p.submitted_at).toLocaleString("es-CO", {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                          timeZone: "America/Bogota",
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function MatchEditorCard({ match }: { match: Match }) {
  const [resultState, resultAction, resultPending] =
    useActionState<UpdateMatchState, FormData>(updateMatchResultAction, null);

  const [fixtureState, fixtureAction, fixturePending] =
    useActionState<UpdateFixtureState, FormData>(updateMatchFixtureAction, null);

  // Controlled state for the result form — synced from props so the form
  // always reflects the latest server-confirmed values after a save.
  const [statusVal,    setStatusVal]    = useState<string>(match.status);
  const [homeScoreVal, setHomeScoreVal] = useState(match.home_score ?? "");
  const [awayScoreVal, setAwayScoreVal] = useState(match.away_score ?? "");

  useEffect(() => { setStatusVal(match.status); },           [match.status]);
  useEffect(() => { setHomeScoreVal(match.home_score ?? ""); }, [match.home_score]);
  useEffect(() => { setAwayScoreVal(match.away_score ?? ""); }, [match.away_score]);

  // Controlled state for the fixture form
  const [startsAtVal, setStartsAtVal] = useState(toDatetimeLocal(match.starts_at));
  const [groupCodeVal, setGroupCodeVal] = useState(match.group_code ?? "");

  useEffect(() => { setStartsAtVal(toDatetimeLocal(match.starts_at)); }, [match.starts_at]);
  useEffect(() => { setGroupCodeVal(match.group_code ?? ""); },          [match.group_code]);

  // Human-readable label passed to server actions for activity logging
  const matchLabel = `${matchTeamCode(match.home_team, match.home_placeholder)} vs ${matchTeamCode(match.away_team, match.away_placeholder)}${match.group_code ? ` · Grupo ${match.group_code}` : ""}`;

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">

      {/* Match header */}
      <div className="px-5 py-4 border-b border-[#1e1e35]">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl leading-none">{matchTeamFlag(match.home_team)}</span>
            <span className="text-sm font-bold text-[#f1f5f9] truncate">{matchTeamName(match.home_team, match.home_placeholder)}</span>
          </div>
          <div className="shrink-0 text-center px-2">
            {match.home_score !== null && match.away_score !== null ? (
              <span className="text-base font-black text-[#f1f5f9] tabular-nums">
                {match.home_score}–{match.away_score}
              </span>
            ) : (
              <span className="text-xs text-[#2a2a45] font-bold">vs</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-1 flex-row-reverse min-w-0">
            <span className="text-xl leading-none">{matchTeamFlag(match.away_team)}</span>
            <span className="text-sm font-bold text-[#f1f5f9] truncate text-right">{matchTeamName(match.away_team, match.away_placeholder)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={match.status} />
          {match.group_code && (
            <span className="text-[10px] text-[#64748b] font-mono">Grupo {match.group_code}</span>
          )}
          <span className="text-[10px] text-[#64748b] font-mono">
            {new Date(match.starts_at).toISOString().replace("T", " ").slice(0, 16)} UTC
          </span>
        </div>
      </div>

      <div className="divide-y divide-[#1e1e35]">

        {/* ── Section 1: Resultado ─────────────────────────────────── */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-4">
            Resultado
          </p>
          <form action={resultAction} className="flex flex-col gap-4">
            <input type="hidden" name="match_id"    value={match.id} />
            <input type="hidden" name="match_label" value={matchLabel} />

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Estado</FieldLabel>
              <select
                name="status"
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
                className="h-10 rounded-xl bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] text-sm px-3 focus:outline-none focus:border-[#38BDF8]/60 focus:ring-2 focus:ring-[#38BDF8]/10 transition-colors"
              >
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <FieldLabel>{matchTeamCode(match.home_team, match.home_placeholder)} (local)</FieldLabel>
                <AdminInput
                  type="number" name="home_score"
                  value={homeScoreVal} onChange={(e) => setHomeScoreVal(e.target.value)}
                  min={0} max={30} placeholder="–"
                  className="text-center tabular-nums"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>{matchTeamCode(match.away_team, match.away_placeholder)} (visitante)</FieldLabel>
                <AdminInput
                  type="number" name="away_score"
                  value={awayScoreVal} onChange={(e) => setAwayScoreVal(e.target.value)}
                  min={0} max={30} placeholder="–"
                  className="text-center tabular-nums"
                />
              </div>
            </div>

            <FormFeedback state={resultState} />

            <button
              type="submit" disabled={resultPending}
              className="h-9 px-4 bg-[#38BDF8] text-[#0a0a12] text-xs font-bold rounded-xl hover:bg-[#7DD3FC] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {resultPending ? <><Loader2 size={12} className="animate-spin" />Guardando...</> : "Guardar resultado"}
            </button>

            {match.status !== "finished" && (
              <p className="text-[10px] text-[#64748b]">
                Al marcar como <strong className="text-[#f1f5f9]">Finalizado</strong> se recalculan los puntos automáticamente.
              </p>
            )}
          </form>
        </div>

        {/* ── Section 2: Fixture ───────────────────────────────────── */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-4">
            Fixture
          </p>
          <form action={fixtureAction} className="flex flex-col gap-4">
            <input type="hidden" name="match_id"    value={match.id} />
            <input type="hidden" name="match_label" value={matchLabel} />

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Kickoff (UTC)</FieldLabel>
              <AdminInput
                type="datetime-local" name="starts_at"
                value={startsAtVal} onChange={(e) => setStartsAtVal(e.target.value)}
                className="w-full"
              />
              <p className="text-[10px] text-[#64748b]">La hora ingresada se guardará como UTC.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Grupo</FieldLabel>
              <AdminInput
                type="text" name="group_code"
                value={groupCodeVal} onChange={(e) => setGroupCodeVal(e.target.value.toUpperCase())}
                maxLength={10} placeholder="A, B, C …"
                className="uppercase w-28"
              />
            </div>

            <FormFeedback state={fixtureState} />

            <button
              type="submit" disabled={fixturePending}
              className="h-9 px-4 bg-[#18182a] border border-[#2a2a45] text-[#94a3b8] text-xs font-semibold rounded-xl hover:border-[#38BDF8]/40 hover:text-[#38BDF8] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {fixturePending ? <><Loader2 size={12} className="animate-spin" />Guardando...</> : "Guardar fixture"}
            </button>
          </form>
        </div>

        {/* ── Section 3: Predictions (expandable) ─────────────────── */}
        <PredictionsPanel matchId={match.id} />

        {/* ── Section 4: Advanced edit link ───────────────────────── */}
        <div className="border-t border-[#1e1e35] px-5 py-3">
          <Link
            href={`/admin/matches/${match.id}/advanced`}
            className="inline-flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#f59e0b] transition-colors"
          >
            <Settings2 size={12} />
            Edición avanzada
          </Link>
        </div>

      </div>
    </div>
  );
}
