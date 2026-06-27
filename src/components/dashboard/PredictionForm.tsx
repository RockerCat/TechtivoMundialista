"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, AlertCircle, Lock, Pencil } from "lucide-react";
import { savePredictionAction } from "@/app/actions/predictions";
import type { Prediction, PredictionActionState } from "@/lib/matches";

interface PredictionFormProps {
  matchId: string;
  isOpen: boolean;
  closedReason?: "match_not_scheduled" | "match_started" | null;
  currentPrediction: Prediction | null;
}

const CLOSED_LABELS: Record<string, string> = {
  match_not_scheduled: "Predicciones cerradas",
  match_started:       "El partido ya comenzó",
};

// ── Draft helpers ─────────────────────────────────────────────────────
// Persist in-progress score inputs so a hard reload (triggered by the global
// error page or an iOS WebView eviction) doesn't wipe what the user typed.
// router.refresh() from LiveMatchPoller does NOT reset uncontrolled inputs,
// so drafts are only needed for actual page reloads.

type Draft = { home?: number; away?: number };

function draftKey(matchId: string) {
  return `pollita_draft_${matchId}`;
}

function readDraft(matchId: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(matchId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(matchId: string, home: string, away: string): void {
  try {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    localStorage.setItem(
      draftKey(matchId),
      JSON.stringify({ home: isNaN(h) ? undefined : h, away: isNaN(a) ? undefined : a })
    );
  } catch {}
}

function clearDraft(matchId: string): void {
  try {
    localStorage.removeItem(draftKey(matchId));
  } catch {}
}

export default function PredictionForm({
  matchId,
  isOpen,
  closedReason,
  currentPrediction,
}: PredictionFormProps) {
  const [state, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    savePredictionAction,
    null
  );

  // Tracks user intent to enter/exit edit mode independently of save state.
  // null means "follow the default" (edit when no prediction exists).
  const [editingOverride, setEditingOverride] = useState<boolean | null>(null);

  // Derive edit mode:
  // – After a save (savedThisSession=true), always show saved state.
  // – Otherwise respect user override if set, or default to (!currentPrediction).
  const savedThisSession = !!(state && "success" in state);
  const isEditing = savedThisSession
    ? false
    : editingOverride !== null
    ? editingOverride
    : !currentPrediction;

  // Load draft from localStorage on first mount. Only relevant when the user
  // has no saved prediction yet — if there's already a saved one, the server
  // data is authoritative and we don't want stale draft values to show.
  const [draft] = useState<Draft | null>(() => {
    if (currentPrediction) return null;
    if (typeof window === "undefined") return null;
    return readDraft(matchId);
  });

  // Refs hold the latest typed values for writing to localStorage without
  // causing re-renders on every keystroke.
  const latestHome = useRef<string>(
    String(draft?.home ?? currentPrediction?.home_score ?? "")
  );
  const latestAway = useRef<string>(
    String(draft?.away ?? currentPrediction?.away_score ?? "")
  );

  function handleScoreChange(field: "home" | "away", value: string) {
    if (field === "home") latestHome.current = value;
    else latestAway.current = value;
    writeDraft(matchId, latestHome.current, latestAway.current);
  }

  // Clear draft after a successful save and when the match closes.
  // These are external side-effects (localStorage), not setState calls,
  // so using useEffect here is appropriate.
  useEffect(() => {
    if (savedThisSession) clearDraft(matchId);
  }, [savedThisSession, matchId]);

  useEffect(() => {
    if (!isOpen) clearDraft(matchId);
  }, [isOpen, matchId]);

  // Scores to display in the saved/read-only view
  const savedPrediction =
    state && "success" in state ? state.prediction : currentPrediction;

  // Default values for the score inputs:
  // just-saved prediction > existing server prediction > unsaved draft
  const displayPrediction =
    state && "success" in state ? state.prediction : currentPrediction;
  const homeDefault = displayPrediction?.home_score ?? draft?.home;
  const awayDefault = displayPrediction?.away_score ?? draft?.away;

  // ── Match closed ────────────────────────────────────────────────────
  if (!isOpen) {
    const reasonLabel = closedReason ? CLOSED_LABELS[closedReason] : null;
    return (
      <div className="mt-2 pt-2 border-t border-[#1e1e35] space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#64748b]">Tu predicción</span>
          {savedPrediction ? (
            <span className="text-xs font-mono font-semibold text-[#94a3b8]">
              {savedPrediction.home_score} – {savedPrediction.away_score}
            </span>
          ) : (
            <span className="text-xs text-[#2a2a45] italic">Sin predicción</span>
          )}
        </div>
        {reasonLabel && (
          <div className="flex items-center gap-1">
            <Lock size={10} className="text-[#2a2a45] shrink-0" />
            <span className="text-[10px] text-[#2a2a45] font-mono">{reasonLabel}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Saved state — show scores + edit button ──────────────────────────
  if (savedPrediction && !isEditing) {
    return (
      <div className="mt-2 pt-2 border-t border-[#1e1e35]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={13} className="text-[#38BDF8]" />
            <span className="text-xs text-[#94a3b8]">Tu predicción</span>
            <span className="text-sm font-black font-mono text-[#f1f5f9]">
              {savedPrediction.home_score} – {savedPrediction.away_score}
            </span>
          </div>
          <button
            onClick={() => setEditingOverride(true)}
            className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
          >
            <Pencil size={11} />
            Editar
          </button>
        </div>
      </div>
    );
  }

  // ── Editing / new prediction ─────────────────────────────────────────
  return (
    <div className="mt-3 pt-3 border-t border-[#1e1e35]">
      <form action={formAction}>
        <input type="hidden" name="match_id" value={matchId} />

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#94a3b8] shrink-0">Tu predicción:</span>

          <div className="flex items-center gap-1.5 flex-1">
            <ScoreInput
              name="home_score"
              defaultValue={homeDefault}
              disabled={isPending}
              onChange={(v) => handleScoreChange("home", v)}
            />
            <span className="text-[#64748b] text-sm font-light">—</span>
            <ScoreInput
              name="away_score"
              defaultValue={awayDefault}
              disabled={isPending}
              onChange={(v) => handleScoreChange("away", v)}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 h-9 px-3 bg-[#38BDF8] text-[#0a0a12] text-xs font-bold rounded-xl hover:bg-[#7DD3FC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "..." : savedPrediction ? "Actualizar" : "Guardar"}
          </button>

          {savedPrediction && (
            <button
              type="button"
              onClick={() => setEditingOverride(false)}
              className="shrink-0 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>

        {/* Error feedback */}
        {state && "error" in state && (
          <div className="flex items-start gap-1.5 mt-2">
            <AlertCircle size={12} className="text-[#ef4444] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[#ef4444]">{state.error}</p>
              {state.devMessage && (
                <p className="text-[10px] text-[#f59e0b] font-mono mt-0.5 break-all">
                  {state.devMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function ScoreInput({
  name,
  defaultValue,
  disabled,
  onChange,
}: {
  name: string;
  defaultValue?: number;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
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
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className="w-11 h-9 text-center text-base font-black rounded-xl bg-[#20203a] border border-[#2a2a45] text-[#f1f5f9] placeholder:text-[#2a2a45] focus:border-[#38BDF8]/60 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/10 disabled:opacity-50 tabular-nums"
      style={{ MozAppearance: "textfield" } as React.CSSProperties}
    />
  );
}
