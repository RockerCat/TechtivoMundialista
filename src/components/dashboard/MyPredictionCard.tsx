"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Lock, Loader2 } from "lucide-react";
import { savePredictionAction } from "@/app/actions/predictions";
import type { Prediction, PredictionActionState } from "@/lib/matches";
import type { ScoringResult } from "@/lib/matches";

interface Props {
  matchId:      string;
  myPrediction: Prediction | null;
  mySim:        ScoringResult | null;
  isScheduled:  boolean;
  isLive:       boolean;
  isFinished:   boolean;
  hasScore:     boolean;
  homeScore:    number | null;
  awayScore:    number | null;
}

export default function MyPredictionCard({
  matchId,
  myPrediction,
  mySim,
  isScheduled,
  isLive,
  isFinished,
  hasScore,
  homeScore,
  awayScore,
}: Props) {

  // ── Per-match save ────────────────────────────────────────────────
  const [formState, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    savePredictionAction,
    null
  );
  const [isEditing, setIsEditing] = useState(!myPrediction && isScheduled);
  useEffect(() => {
    if (formState && "success" in formState) setIsEditing(false);
  }, [formState]);

  const saved = (formState && "success" in formState) ? formState.prediction : myPrediction;
  const gotPoints = isFinished && !!saved && (saved as { points?: number; scored_at?: string }).scored_at
    && ((saved as { points?: number }).points ?? 0) > 0;

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 space-y-4">

      <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">
        Mi pronóstico
      </p>

      {/* ── Scheduled: editable form ─────────────────────────────── */}
      {isScheduled && (
        <>
          {isEditing ? (
            <form action={formAction} className="flex flex-col items-center gap-3">
              <input type="hidden" name="match_id" value={matchId} />

              {/* Score inputs centered */}
              <div className="flex items-center gap-3">
                <ScoreInput name="home_score" defaultValue={saved?.home_score} disabled={isPending} />
                <span className="text-[#64748b] text-xl font-light select-none">–</span>
                <ScoreInput name="away_score" defaultValue={saved?.away_score} disabled={isPending} />
              </div>

              {formState && "error" in formState && (
                <p className="text-xs text-[#ef4444]">{formState.error}</p>
              )}

              {/* Save button centered */}
              <button
                type="submit"
                disabled={isPending}
                className="h-11 px-8 bg-[#38BDF8] text-[#0a0a12] text-sm font-bold rounded-xl hover:bg-[#7DD3FC] disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {isPending
                  ? <><Loader2 size={14} className="animate-spin" />Guardando...</>
                  : <><Check size={14} strokeWidth={2.5} />{saved ? "Actualizar pronóstico" : "Guardar pronóstico"}</>}
              </button>

              {saved && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
                >
                  Cancelar
                </button>
              )}
            </form>
          ) : (
            /* Saved view */
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#38BDF8] shrink-0" />
                <p className="text-2xl font-black font-mono text-[#f1f5f9] tabular-nums">
                  {saved!.home_score}
                  <span className="text-[#64748b] mx-2 font-light">–</span>
                  {saved!.away_score}
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors shrink-0"
              >
                Editar
              </button>
            </div>
          )}

          {/* No-prediction prompt */}
          {!saved && !isEditing && (
            <div className="flex items-center gap-2">
              <span className="text-[#f59e0b]">⚠</span>
              <p className="text-sm text-[#f59e0b]/80">No ingresaste pronóstico</p>
              <button
                onClick={() => setIsEditing(true)}
                className="ml-auto text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
              >
                Agregar
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Live: read-only + locked ──────────────────────────────── */}
      {isLive && (
        <div className="space-y-3">
          {saved ? (
            <p className="text-2xl font-black font-mono text-[#f1f5f9] tabular-nums">
              {saved.home_score}
              <span className="text-[#64748b] mx-2 font-light">–</span>
              {saved.away_score}
            </p>
          ) : (
            <p className="text-sm text-[#64748b]">No ingresaste pronóstico</p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
            <Lock size={12} className="shrink-0" />
            Pronóstico cerrado
          </div>
          {mySim && hasScore && saved && (
            <div className="border-t border-[#1e1e35] pt-3">
              <MySituationLine mySim={mySim} isFinished={false} />
            </div>
          )}
        </div>
      )}

      {/* ── Finished: read-only + points ─────────────────────────── */}
      {isFinished && (
        <div className="space-y-3">
          {saved ? (
            <p className="text-2xl font-black font-mono text-[#f1f5f9] tabular-nums">
              {saved.home_score}
              <span className="text-[#64748b] mx-2 font-light">–</span>
              {saved.away_score}
            </p>
          ) : (
            <p className="text-sm text-[#64748b]">No ingresaste pronóstico</p>
          )}
          {hasScore && homeScore !== null && awayScore !== null && (
            <div className="text-xs text-[#64748b]">
              Resultado final:{" "}
              <span className="font-bold text-[#94a3b8] font-mono">{homeScore}–{awayScore}</span>
            </div>
          )}
          {mySim && hasScore && (
            <div className="border-t border-[#1e1e35] pt-3 space-y-1">
              <MySituationLine mySim={mySim} isFinished={true} />
              {saved && (saved as { scored_at?: string }).scored_at && (
                <p className={`text-sm font-black font-mono ${gotPoints ? "text-[#38BDF8]" : "text-[#ef4444]/70"}`}>
                  {gotPoints ? `+${(saved as { points: number }).points} pts` : "0 pts"}
                </p>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

function MySituationLine({ mySim, isFinished }: { mySim: ScoringResult; isFinished: boolean }) {
  if (mySim.reason === "Marcador exacto") {
    return (
      <p className="text-sm text-[#38BDF8] font-semibold">
        🟢 {isFinished ? "Acertaste el marcador exacto" : "Vas sumando marcador exacto"}
        {" "}· <span className="font-black">+{mySim.points} pts</span>
      </p>
    );
  }
  if (mySim.reason === "Resultado acertado") {
    return (
      <p className="text-sm text-[#f59e0b] font-semibold">
        🟡 {isFinished ? "Acertaste el ganador" : "Vas sumando ganador correcto"}
        {" "}· <span className="font-black">+{mySim.points} pts</span>
      </p>
    );
  }
  return (
    <p className="text-sm text-[#ef4444]/80 font-semibold">
      🔴 {isFinished ? "No acertaste" : "Tu pronóstico ya no puede cumplirse"}
    </p>
  );
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
      className="w-16 h-14 text-center text-2xl font-black rounded-2xl bg-[#2a2a50] border-2 border-[#5252a0] text-[#f1f5f9] placeholder:text-[#5252a0] hover:border-[#6a6ac0] focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 focus:bg-[#38BDF8]/[0.05] disabled:opacity-40 tabular-nums transition-colors outline-none"
      style={{ MozAppearance: "textfield" } as React.CSSProperties}
    />
  );
}
