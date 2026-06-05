"use client";

import { useActionState, useState, useEffect } from "react";
import { AlertTriangle, Check, AlertCircle, Loader2 } from "lucide-react";
import {
  advancedEditMatchAction,
  type AdvancedEditState,
} from "@/app/actions/admin";
import {
  matchTeamCode,
  STAGE_LABELS,
  type Match,
  type Team,
} from "@/lib/matches";

// ── Helpers ───────────────────────────────────────────────────────────

const STAGE_OPTIONS = [
  "group", "round_of_32", "round_of_16", "quarter_final",
  "semi_final", "third_place", "final",
] as const;

const STATUS_OPTIONS = [
  { value: "scheduled", label: "🗓 Programado" },
  { value: "live",      label: "🔴 En vivo"   },
  { value: "finished",  label: "✓ Finalizado" },
] as const;

function toDatetimeLocal(iso: string): string {
  const d   = new Date(iso);
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

function AdminInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-xl bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] text-sm px-3 focus:outline-none focus:border-[#f59e0b]/60 focus:ring-2 focus:ring-[#f59e0b]/10 transition-colors placeholder:text-[#2a2a45] ${className}`}
    />
  );
}

function AdminSelect({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-xl bg-[#0e0e1d] border border-[#2a2a45] text-[#f1f5f9] text-sm px-3 focus:outline-none focus:border-[#f59e0b]/60 focus:ring-2 focus:ring-[#f59e0b]/10 transition-colors ${className}`}
    >
      {children}
    </select>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-[#f59e0b]/70 uppercase tracking-widest mb-4">
      {children}
    </p>
  );
}

// ── Main component ────────────────────────────────────────────────────

interface Props {
  match: Match;
  teams: Team[];
}

export default function AdvancedMatchEditor({ match, teams }: Props) {
  const [state, formAction, isPending] =
    useActionState<AdvancedEditState, FormData>(advancedEditMatchAction, null);

  // ── Controlled team fields ─────────────────────────────────────────
  const [homeTeamId, setHomeTeamId] = useState(match.home_team_id ?? "");
  const [awayTeamId, setAwayTeamId] = useState(match.away_team_id ?? "");
  const [homePlaceholder, setHomePlaceholder] = useState(match.home_placeholder ?? "");
  const [awayPlaceholder, setAwayPlaceholder] = useState(match.away_placeholder ?? "");

  // ── Controlled fixture fields ──────────────────────────────────────
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(match.starts_at));
  const [stage,    setStage]    = useState<string>(match.stage);
  const [groupCode, setGroupCode] = useState(match.group_code ?? "");
  const [matchNumber, setMatchNumber] = useState(match.match_number?.toString() ?? "");
  const [venue, setVenue] = useState(match.venue ?? "");

  // ── Controlled result fields ───────────────────────────────────────
  const [status,    setStatus]    = useState<string>(match.status);
  const [homeScore, setHomeScore] = useState(match.home_score?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(match.away_score?.toString() ?? "");

  // ── Confirmation state ─────────────────────────────────────────────
  const [confirmPending, setConfirmPending] = useState(false);

  // Reset confirmation when the action succeeds
  useEffect(() => {
    if (state && "success" in state) setConfirmPending(false);
  }, [state]);

  const matchLabel = `${matchTeamCode(match.home_team, match.home_placeholder)} vs ${matchTeamCode(match.away_team, match.away_placeholder)}`;

  return (
    <div className="space-y-4">

      {/* ── Warning banner ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/[0.05] px-5 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-[#f59e0b] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#f59e0b]">
              Herramienta administrativa avanzada
            </p>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Cambios incorrectos pueden afectar el calendario, resultados,
              clasificación, pronósticos y rankings de todos los usuarios.
              Usar únicamente para correcciones de emergencia.
            </p>
          </div>
        </div>
      </div>

      {/* ── Form ───────────────────────────────────────────────────── */}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="match_id"    value={match.id} />
        <input type="hidden" name="match_label" value={matchLabel} />

        {/* ── Sección: Equipos ──────────────────────────────────── */}
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
          <div className="px-5 py-4">
            <SectionTitle>Equipos</SectionTitle>

            <div className="grid grid-cols-1 gap-5">

              {/* Home team */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#f1f5f9]">Local</p>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Equipo</FieldLabel>
                  <AdminSelect
                    name="home_team_id"
                    value={homeTeamId}
                    onChange={(e) => {
                      setHomeTeamId(e.target.value);
                      if (e.target.value) setHomePlaceholder("");
                    }}
                  >
                    <option value="">— Sin equipo (usar placeholder) —</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.flag_emoji ?? "🏳️"} {t.name} ({t.code})
                      </option>
                    ))}
                  </AdminSelect>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Placeholder</FieldLabel>
                  <AdminInput
                    type="text"
                    name="home_placeholder"
                    value={homePlaceholder}
                    onChange={(e) => setHomePlaceholder(e.target.value)}
                    placeholder="ej. Winner Group A"
                    disabled={!!homeTeamId}
                    className={homeTeamId ? "opacity-30 cursor-not-allowed" : ""}
                  />
                  {homeTeamId && (
                    <p className="text-[10px] text-[#64748b]">
                      El placeholder se limpia cuando hay un equipo seleccionado.
                    </p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#1e1e35]" />

              {/* Away team */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#f1f5f9]">Visitante</p>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Equipo</FieldLabel>
                  <AdminSelect
                    name="away_team_id"
                    value={awayTeamId}
                    onChange={(e) => {
                      setAwayTeamId(e.target.value);
                      if (e.target.value) setAwayPlaceholder("");
                    }}
                  >
                    <option value="">— Sin equipo (usar placeholder) —</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.flag_emoji ?? "🏳️"} {t.name} ({t.code})
                      </option>
                    ))}
                  </AdminSelect>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Placeholder</FieldLabel>
                  <AdminInput
                    type="text"
                    name="away_placeholder"
                    value={awayPlaceholder}
                    onChange={(e) => setAwayPlaceholder(e.target.value)}
                    placeholder="ej. Runner-up Group B"
                    disabled={!!awayTeamId}
                    className={awayTeamId ? "opacity-30 cursor-not-allowed" : ""}
                  />
                  {awayTeamId && (
                    <p className="text-[10px] text-[#64748b]">
                      El placeholder se limpia cuando hay un equipo seleccionado.
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Sección: Fixture ──────────────────────────────────── */}
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
          <div className="px-5 py-4">
            <SectionTitle>Fixture</SectionTitle>

            <div className="flex flex-col gap-4">

              <div className="flex flex-col gap-1.5">
                <FieldLabel>Kickoff (UTC)</FieldLabel>
                <AdminInput
                  type="datetime-local"
                  name="starts_at"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
                <p className="text-[10px] text-[#64748b]">
                  La hora se guarda como UTC. La app convierte a hora Colombia (COT = UTC−5).
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <FieldLabel>Etapa</FieldLabel>
                <AdminSelect
                  name="stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                >
                  {STAGE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                  ))}
                </AdminSelect>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Grupo</FieldLabel>
                  <AdminInput
                    type="text"
                    name="group_code"
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    placeholder="A, B, C …"
                    className="uppercase"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Número de partido</FieldLabel>
                  <AdminInput
                    type="number"
                    name="match_number"
                    value={matchNumber}
                    onChange={(e) => setMatchNumber(e.target.value)}
                    min={1}
                    max={200}
                    placeholder="73"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <FieldLabel>Sede / Estadio</FieldLabel>
                <AdminInput
                  type="text"
                  name="venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="SoFi Stadium — Inglewood, CA"
                />
              </div>

            </div>
          </div>
        </div>

        {/* ── Sección: Resultado ────────────────────────────────── */}
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
          <div className="px-5 py-4">
            <SectionTitle>Resultado</SectionTitle>

            <div className="flex flex-col gap-4">

              <div className="flex flex-col gap-1.5">
                <FieldLabel>Estado</FieldLabel>
                <AdminSelect
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </AdminSelect>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Goles local</FieldLabel>
                  <AdminInput
                    type="number"
                    name="home_score"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    min={0} max={30}
                    placeholder="–"
                    className="text-center tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Goles visitante</FieldLabel>
                  <AdminInput
                    type="number"
                    name="away_score"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    min={0} max={30}
                    placeholder="–"
                    className="text-center tabular-nums"
                  />
                </div>
              </div>

              {status === "finished" && (
                <p className="text-[10px] text-[#f59e0b]">
                  Al guardar como Finalizado, los puntos se recalcularán automáticamente.
                </p>
              )}

            </div>
          </div>
        </div>

        {/* ── Feedback ──────────────────────────────────────────── */}
        {state && "error" in state && (
          <div className="flex items-center gap-2 text-xs text-[#ef4444] px-1">
            <AlertCircle size={12} className="shrink-0" />
            {state.error}
          </div>
        )}
        {state && "success" in state && (
          <div className="flex items-center gap-2 text-xs text-[#38BDF8] px-1">
            <Check size={12} className="shrink-0" />
            {state.scored > 0
              ? `Guardado · ${state.scored} predicción${state.scored === 1 ? "" : "es"} recalculada${state.scored === 1 ? "" : "s"}`
              : "Cambios guardados correctamente"}
          </div>
        )}

        {/* ── Confirmación ──────────────────────────────────────── */}
        {!confirmPending ? (
          <button
            type="button"
            onClick={() => setConfirmPending(true)}
            disabled={isPending}
            className="w-full h-10 rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/[0.07] text-[#f59e0b] text-xs font-bold hover:bg-[#f59e0b]/[0.13] hover:border-[#f59e0b]/60 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle size={12} />
            Guardar cambios avanzados
          </button>
        ) : (
          <div className="rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/[0.05] px-5 py-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-[#f59e0b] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#f59e0b] mb-1">
                  ¿Confirmar cambios avanzados?
                </p>
                <p className="text-[11px] text-[#94a3b8]">
                  Esta acción es irreversible desde la interfaz. Verifica los datos
                  antes de confirmar. Los pronósticos existentes se mantendrán; solo
                  se recalculan los puntos si el partido queda como Finalizado.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmPending(false)}
                className="flex-1 h-9 rounded-xl border border-[#2a2a45] text-[#94a3b8] text-xs font-semibold hover:border-[#3a3a60] hover:text-[#f1f5f9] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 h-9 rounded-xl bg-[#f59e0b] text-[#0a0a12] text-xs font-bold hover:bg-[#fbbf24] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {isPending
                  ? <><Loader2 size={12} className="animate-spin" />Guardando...</>
                  : "Sí, aplicar cambios"}
              </button>
            </div>
          </div>
        )}

      </form>
    </div>
  );
}
