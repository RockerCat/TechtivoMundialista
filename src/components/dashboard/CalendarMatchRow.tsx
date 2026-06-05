"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  matchClosedReason,
  matchTeamName,
  matchTeamFlag,
  type MatchWithPrediction,
  type PredictionActionState,
} from "@/lib/matches";
import { savePredictionAction } from "@/app/actions/predictions";
import { Check, Lock, Loader2 } from "lucide-react";
import { useGoalCelebration } from "@/hooks/useGoalCelebration";
import GoalCelebrationOverlay from "./GoalCelebrationOverlay";

/** Colombia local kickoff time — "14:00" */
function matchTime(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString("es-CO", {
    hour:     "2-digit",
    minute:   "2-digit",
    timeZone: "America/Bogota",
  });
}

export default function CalendarMatchRow({ match }: { match: MatchWithPrediction }) {
  const { home_team, away_team, status } = match;
  const router = useRouter();

  // ── Goal animation ─────────────────────────────────────────────────
  const goalAnim = useGoalCelebration(
    { home: match.home_score, away: match.away_score },
    status === "live"
  );

  // ── Per-match save ─────────────────────────────────────────────────
  const [formState, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    savePredictionAction,
    null
  );
  const [isEditing, setIsEditing] = useState(!match.prediction);
  useEffect(() => {
    if (formState && "success" in formState) setIsEditing(false);
  }, [formState]);

  const saved     = (formState && "success" in formState) ? formState.prediction : match.prediction;
  const isOpen    = matchClosedReason(match) === null;
  const isLive    = status === "live";
  const isFinished = status === "finished";
  const hasScore  = match.home_score !== null && match.away_score !== null;
  const time      = matchTime(match.starts_at);

  function handleCardClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as Element).closest("input, button, select, a")) return;
    router.push(`/matches/${match.id}`);
  }

  // ── Card styling by state ──────────────────────────────────────────
  const gotPoints  = isFinished && !!saved && ((saved as { points?: number }).points ?? 0) > 0;
  const gotZero    = isFinished && !!saved && (saved as { scored_at?: string }).scored_at && !gotPoints;
  const cardBase   = "relative rounded-2xl border overflow-hidden cursor-pointer transition-all";
  const cardClass  = isLive
    ? cn(cardBase, goalAnim ? "animate-goal-card" : "animate-live-glow",
        "border-[#ef4444]/35 bg-gradient-to-br from-[#ef4444]/[0.10] to-[#18182a] hover:border-[#ef4444]/55")
    : gotPoints
    ? cn(cardBase, "border-[#38BDF8]/35 bg-[#38BDF8]/[0.05] hover:border-[#38BDF8]/50")
    : gotZero
    ? cn(cardBase, "border-[#ef4444]/20 bg-[#ef4444]/[0.04]")
    : isOpen && !saved
    ? cn(cardBase, "border-[#f59e0b]/30 bg-[#f59e0b]/[0.03] hover:border-[#f59e0b]/50")
    : cn(cardBase, "border-[#2a2a45] bg-[#18182a] hover:border-[#3a3a60]");

  return (
    <div className={cardClass} onClick={handleCardClick}>
      {isLive && <GoalCelebrationOverlay active={goalAnim} />}

      <div className="px-3 pt-3 pb-2.5">

        {/* ── Row 1 ────────────────────────────────────────────────── */}
        {isOpen && isEditing ? (
          /* Meta row — teams appear only in the form below, no duplication */
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono tabular-nums text-[#94a3b8] shrink-0">
              {time}
            </span>
            {match.group_code && (
              <span className="text-[10px] text-[#475569]">· Grupo {match.group_code}</span>
            )}
            <div className="flex-1" />
            {/* Status indicator: ⚠ pending or ✓ saved */}
            {saved
              ? <Check size={12} className="text-[#38BDF8] shrink-0" />
              : <span className="text-[#f59e0b] text-xs shrink-0">⚠</span>}
          </div>
        ) : (
          /* Full teams row for live/finished/closed states */
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "text-[10px] font-mono tabular-nums shrink-0 w-10",
              isLive ? "text-[#ef4444]" : "text-[#94a3b8]"
            )}>
              {time}
            </span>
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="text-sm leading-none shrink-0">{matchTeamFlag(home_team)}</span>
              <span className="text-xs font-semibold text-[#f1f5f9] truncate">{matchTeamName(home_team, match.home_placeholder)}</span>
            </div>
            <div className="shrink-0 text-center px-1">
              {isLive && hasScore ? (
                <span className="text-base font-black text-[#ef4444] tabular-nums animate-live-pulse">
                  {match.home_score}<span className="text-[#ef4444]/40 mx-0.5 font-light">–</span>{match.away_score}
                </span>
              ) : isFinished && hasScore ? (
                <span className={cn("text-base font-black tabular-nums", gotPoints ? "text-[#38BDF8]" : "text-[#f1f5f9]")}>
                  {match.home_score}<span className="text-[#475569] mx-0.5 font-light">–</span>{match.away_score}
                </span>
              ) : (
                <span className="text-[10px] text-[#475569] font-bold">vs</span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-row-reverse min-w-0 flex-1">
              <span className="text-sm leading-none shrink-0">{matchTeamFlag(away_team)}</span>
              <span className="text-xs font-semibold text-[#f1f5f9] truncate text-right">{matchTeamName(away_team, match.away_placeholder)}</span>
            </div>
            <StatusPill match={match} />
          </div>
        )}

        {/* ── Row 2: prediction area ───────────────────────────────── */}
        <div className={isOpen && isEditing ? "" : "ml-12"}>{/* ml-12 aligns under teams past the time column */}
          {isLive && (
            <div className="flex items-center justify-between">
              {saved ? (
                <span className="text-[10px] text-[#94a3b8]">
                  Mi pronóstico:{" "}
                  <span className="font-mono font-bold">{saved.home_score}–{saved.away_score}</span>
                </span>
              ) : (
                <span className="text-[10px] text-[#475569]">Sin predicción</span>
              )}
              <span className="flex items-center gap-1 text-[10px] text-[#64748b]">
                <Lock size={8} />Cerrado
              </span>
            </div>
          )}

          {isFinished && (
            <div className="flex items-center justify-between">
              {saved ? (
                <span className="text-[10px] text-[#94a3b8]">
                  Pronóstico:{" "}
                  <span className="font-mono font-bold">{saved.home_score}–{saved.away_score}</span>
                </span>
              ) : (
                <span className="text-[10px] text-[#475569]">Sin pronóstico</span>
              )}
              {(saved as { scored_at?: string } | null)?.scored_at && (
                <span className={cn("text-xs font-black font-mono", gotPoints ? "text-[#38BDF8]" : "text-[#ef4444]/70")}>
                  {gotPoints ? `+${(saved as {points: number}).points} pts` : "0 pts"}
                </span>
              )}
            </div>
          )}

          {!isLive && !isFinished && !isOpen && saved && (
            <span className="text-[10px] text-[#94a3b8]">
              Pronóstico: <span className="font-mono font-bold">{saved.home_score}–{saved.away_score}</span>
            </span>
          )}
          {!isLive && !isFinished && !isOpen && !saved && (
            <span className="text-[10px] text-[#475569]">Sin predicción</span>
          )}

          {isOpen && (
            isEditing ? (
              <form action={formAction} className="flex flex-col items-center gap-2.5 pt-1">
                <input type="hidden" name="match_id" value={match.id} />

                {/* Teams with centered inputs — mirrors MatchRowInGroup open layout */}
                <div className="flex items-center gap-1.5 w-full">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="text-sm leading-none shrink-0">{matchTeamFlag(home_team)}</span>
                    <span className="text-xs font-semibold text-[#f1f5f9] truncate">{matchTeamName(home_team, match.home_placeholder)}</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <ScoreInput name="home_score" defaultValue={saved?.home_score} disabled={isPending} />
                    <span className="text-[#94a3b8] text-sm font-light select-none">–</span>
                    <ScoreInput name="away_score" defaultValue={saved?.away_score} disabled={isPending} />
                  </div>
                  <div className="flex items-center gap-1 flex-row-reverse min-w-0 flex-1">
                    <span className="text-sm leading-none shrink-0">{matchTeamFlag(away_team)}</span>
                    <span className="text-xs font-semibold text-[#f1f5f9] truncate text-right">{matchTeamName(away_team, match.away_placeholder)}</span>
                  </div>
                </div>

                {/* Save button centered below inputs */}
                <div className="flex flex-col items-center gap-1 w-full">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="h-9 px-6 bg-[#38BDF8] text-[#0a0a12] text-xs font-bold rounded-xl hover:bg-[#7DD3FC] disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    {isPending
                      ? <><Loader2 size={11} className="animate-spin" />Guardando...</>
                      : <><Check size={11} strokeWidth={2.5} />{saved ? "Actualizar" : "Guardar"}</>}
                  </button>
                  {saved && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-[9px] text-[#475569] hover:text-[#94a3b8] transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#94a3b8]">
                  <Check size={9} className="inline text-[#38BDF8] mr-0.5" />
                  {saved!.home_score}–{saved!.away_score}
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[9px] text-[#475569] hover:text-[#94a3b8]"
                >
                  Editar
                </button>
              </div>
            )
          )}

          {formState && "error" in formState && (
            <p className="text-[9px] text-[#ef4444] mt-1">{formState.error}</p>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function StatusPill({ match }: { match: MatchWithPrediction }) {
  const { status } = match;
  if (status === "live") {
    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#ef4444]/15 border border-[#ef4444]/25 shrink-0">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
        </span>
        <span className="text-[9px] font-black text-[#ef4444] uppercase tracking-wide">Vivo</span>
      </div>
    );
  }
  if (status === "finished") {
    return <span className="text-[9px] text-[#64748b] uppercase tracking-widest shrink-0">Fin.</span>;
  }
  const isOpen = matchClosedReason(match) === null;
  if (isOpen) {
    const hasPred = !!match.prediction;
    return hasPred
      ? <Check size={12} className="text-[#38BDF8] shrink-0" />
      : <span className="text-[#f59e0b] text-xs shrink-0">⚠</span>;
  }
  return <Lock size={10} className="text-[#475569] shrink-0" />;
}

function ScoreInput({
  name, defaultValue, disabled,
}: { name: string; defaultValue?: number; disabled?: boolean }) {
  return (
    <input
      type="number"
      name={name}
      min={0}
      max={30}
      step={1}
      defaultValue={defaultValue ?? ""}
      placeholder="0"
      disabled={disabled}
      required
      className="w-11 h-8 text-center text-base font-black rounded-xl bg-[#2a2a50] border-2 border-[#5252a0] text-[#f1f5f9] placeholder:text-[#5252a0] focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 disabled:opacity-40 tabular-nums transition-colors"
      style={{ MozAppearance: "textfield" } as React.CSSProperties}
    />
  );
}
