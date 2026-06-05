"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  formatKickoff,
  matchClosedReason,
  matchTeamName,
  matchTeamFlag,
  type MatchWithPrediction,
  type Team,
} from "@/lib/matches";
import { Check, Lock } from "lucide-react";
import { useGoalCelebration } from "@/hooks/useGoalCelebration";
import GoalCelebrationOverlay from "./GoalCelebrationOverlay";


interface MatchRowInGroupProps {
  match: MatchWithPrediction;
  error?: string;
  onDirty?: () => void;
}

export default function MatchRowInGroup({ match, error, onDirty }: MatchRowInGroupProps) {
  const { home_team, away_team, status } = match;
  const router = useRouter();

  // Navigate to the match detail page when clicking anywhere that is not
  // an interactive form element (input, button, select).
  function handleCardClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as Element).closest("input, button, select, a")) return;
    router.push(`/matches/${match.id}`);
  }

  const goalAnim = useGoalCelebration(
    { home: match.home_score, away: match.away_score },
    status === "live"
  );


  const [localDirty, setLocalDirty] = useState(false);
  function handleInputChange() {
    if (!localDirty) { setLocalDirty(true); onDirty?.(); }
  }

  const saved      = match.prediction;
  const isOpen     = matchClosedReason(match) === null;
  const isLive     = status === "live";
  const isFinished = status === "finished";
  const hasScore   = match.home_score !== null && match.away_score !== null;

  // ──────────────────────────────────────────────────────────────────
  // 🔴  EN VIVO — most prominent card state
  // ──────────────────────────────────────────────────────────────────
  if (isLive) {
    return (
      <div
        onClick={handleCardClick}
        className={cn(
          "relative rounded-xl border border-[#ef4444]/35 bg-gradient-to-br from-[#ef4444]/[0.12] to-[#18182a] overflow-hidden cursor-pointer transition-all hover:border-[#ef4444]/55",
          // Goal animation replaces the ambient live-glow for its 2 s run.
          goalAnim ? "animate-goal-card" : "animate-live-glow"
        )}
      >
        <GoalCelebrationOverlay active={goalAnim} />

        <div className="px-4 py-4">

          {/* Badge row — pill background makes it unmistakable */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/20">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
              </span>
              <span className="text-xs font-black text-[#ef4444] uppercase tracking-wide">EN VIVO</span>
            </div>
            <span className="text-[10px] text-[#94a3b8]">{formatKickoff(match.starts_at)}</span>
          </div>

          {/* Teams + live score */}
          <div className="flex items-center gap-3 mb-3">
            <TeamSide team={home_team} placeholder={match.home_placeholder} side="home" large />
            <div className="shrink-0 text-center px-2">
              {hasScore ? (
                <span className="text-2xl font-black text-[#ef4444] tabular-nums animate-live-pulse">
                  {match.home_score}
                  <span className="text-[#ef4444]/40 mx-1.5 font-light">–</span>
                  {match.away_score}
                </span>
              ) : (
                <span className="text-xl font-black text-[#ef4444] animate-live-pulse">–</span>
              )}
            </div>
            <TeamSide team={away_team} placeholder={match.away_placeholder} side="away" large />
          </div>

          {/* Mi pronóstico — same visual weight as live score for instant comparison */}
          <div className="pt-2.5 border-t border-[#ef4444]/15">
            <div className="flex items-center justify-between">
              {saved ? (
                <div>
                  <p className="text-[10px] text-[#94a3b8] mb-0.5">Mi pronóstico</p>
                  <p className="text-xl font-black font-mono text-[#f1f5f9] tabular-nums leading-none">
                    {saved.home_score}
                    <span className="text-[#94a3b8] mx-1.5 font-light text-lg">–</span>
                    {saved.away_score}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs leading-none text-[#f59e0b]">⚠</span>
                  <span className="text-xs text-[#f59e0b]/90">No ingresaste pronóstico</span>
                </div>
              )}
              <span className="flex items-center gap-1 text-[10px] text-[#94a3b8]">
                <Lock size={9} className="shrink-0" />Cerrado
              </span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // ⚪  FINALIZADO
  // ──────────────────────────────────────────────────────────────────
  if (isFinished && hasScore) {
    const hasPred   = !!saved;
    const isScored  = hasPred && saved.scored_at !== null;
    const gotPoints = isScored && saved.points > 0;
    const gotZero   = isScored && saved.points === 0;

    const borderClass =
      gotPoints ? "border-[#38BDF8]/40" :
      gotZero   ? "border-[#ef4444]/30" :
                  "border-[#2a2a45]";
    const bgClass =
      gotPoints ? "bg-[#38BDF8]/[0.06]" :
      gotZero   ? "bg-[#ef4444]/[0.05]" :
                  "bg-[#18182a]";
    const glowStyle =
      gotPoints ? { boxShadow: "0 0 0 1px rgba(56,189,248,0.20), 0 0 24px rgba(56,189,248,0.09)" } :
      gotZero   ? { boxShadow: "0 0 0 1px rgba(239,68,68,0.18), 0 0 20px rgba(239,68,68,0.07)" } :
                  {};

    return (
      <div
        onClick={handleCardClick}
        className={cn("rounded-xl border cursor-pointer transition-all", borderClass, bgClass)}
        style={glowStyle}
      >
        <div className="px-3 py-3">

          {/* Status row */}
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest">
              FINALIZADO
            </span>
            {!isScored && (
              <span className="text-[10px] text-[#94a3b8]">{formatKickoff(match.starts_at)}</span>
            )}
          </div>

          {/* Teams + final score */}
          <div className="flex items-center gap-2 mb-3">
            <TeamSide team={home_team} placeholder={match.home_placeholder} side="home" />
            <div className="shrink-0 w-14 text-center">
              <span className="text-base font-black text-[#f1f5f9] tabular-nums">
                {match.home_score}–{match.away_score}
              </span>
            </div>
            <TeamSide team={away_team} placeholder={match.away_placeholder} side="away" />
          </div>

          {/* Mi pronóstico + points badge */}
          <div className="flex items-center justify-between pt-2.5 border-t border-[#1e1e35]">
            {hasPred ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#94a3b8]">Mi pronóstico</span>
                <span className="font-mono font-bold text-xs text-[#94a3b8]">
                  {saved.home_score}–{saved.away_score}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs leading-none text-[#f59e0b]">⚠</span>
                <span className="text-xs text-[#f59e0b]/90">No ingresaste pronóstico</span>
              </div>
            )}

            {isScored ? (
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black border shrink-0",
                gotPoints
                  ? "bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30"
                  : "bg-[#ef4444]/12 text-[#ef4444] border-[#ef4444]/25"
              )}>
                <span>{gotPoints ? "✓" : "✕"}</span>
                <span className="font-mono">{gotPoints ? `+${saved.points}` : "0"} pts</span>
              </div>
            ) : !hasPred ? (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black border shrink-0 bg-[#1e1e35] text-[#94a3b8] border-[#2a2a45]">
                <span>✕</span>
                <span className="font-mono">0 pts</span>
              </div>
            ) : null}
          </div>

          {/* Points reason — clearly readable */}
          {isScored && saved.points_reason && (
            <p className={cn(
              "text-[10px] font-mono uppercase tracking-widest mt-1.5 text-right",
              gotPoints ? "text-[#38BDF8]/80" : "text-[#94a3b8]"
            )}>
              {saved.points_reason}
            </p>
          )}

        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // 🟢  PROGRAMADO + ABIERTO
  // ──────────────────────────────────────────────────────────────────
  if (isOpen) {
    const isPending = !saved && !localDirty;
    const isSaved   =  saved && !localDirty;

    return (
      <div
        onClick={handleCardClick}
        className={cn(
          "rounded-xl border cursor-pointer transition-all",
          isPending
            ? "border-[#f59e0b]/30 bg-[#f59e0b]/[0.04] hover:border-[#f59e0b]/50"
            : "border-[#2a2a45] bg-[#18182a] hover:border-[#3a3a60]"
        )}
      >
        <div className="px-3 py-2.5">

          {/* Status badge + optional amber alert */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] shrink-0" />
              <span className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-widest">
                PRONOSTICAR
              </span>
            </div>
            {isPending && (
              <span className="text-[#f59e0b] text-xs leading-none">⚠</span>
            )}
          </div>

          {/* Teams + inputs in one horizontal row.
              The inputs section has a fixed shrink-0 width so team names
              can use whatever space remains — truncation prevents overflow. */}
          <input type="hidden" name="match_id" value={match.id} />
          <div className="flex items-center gap-1.5 mb-2 w-full">

            {/* Home team */}
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="text-base leading-none shrink-0">{matchTeamFlag(home_team)}</span>
              <span className="text-xs font-semibold text-[#f1f5f9] truncate">{matchTeamName(home_team, match.home_placeholder)}</span>
            </div>

            {/* Score inputs — fixed width prevents compression */}
            <div className="shrink-0 flex items-center gap-1">
              <ScoreInput name={`home_${match.id}`} defaultValue={saved?.home_score} onChange={handleInputChange} />
              <span className="text-[#94a3b8] text-xs font-light select-none">–</span>
              <ScoreInput name={`away_${match.id}`} defaultValue={saved?.away_score} onChange={handleInputChange} />
            </div>

            {/* Away team */}
            <div className="flex items-center gap-1 flex-row-reverse min-w-0 flex-1">
              <span className="text-base leading-none shrink-0">{matchTeamFlag(away_team)}</span>
              <span className="text-xs font-semibold text-[#f1f5f9] truncate text-right">{matchTeamName(away_team, match.away_placeholder)}</span>
            </div>

          </div>

          {/* Date + saved indicator */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#94a3b8]">{formatKickoff(match.starts_at)}</span>
            {isSaved && (
              <div className="flex items-center gap-1">
                <Check size={9} className="text-[#38BDF8] shrink-0" />
                <span className="text-[10px] text-[#38BDF8]">Guardado</span>
              </div>
            )}
          </div>

          {error && <p className="text-[10px] text-[#ef4444] mt-1.5">{error}</p>}

        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // 🔒  CERRADO
  // ──────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={handleCardClick}
      className="rounded-xl border border-[#2a2a45] bg-[#18182a] cursor-pointer transition-all hover:border-[#3a3a60]"
    >
      <div className="px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Lock size={9} className="text-[#94a3b8] shrink-0" />
            <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest">CERRADO</span>
          </div>
          <span className="text-[10px] text-[#94a3b8]">{formatKickoff(match.starts_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <TeamSide team={home_team} placeholder={match.home_placeholder} side="home" />
          {/* "vs" raised from near-invisible to readable */}
          <span className="shrink-0 text-[10px] text-[#64748b] w-14 text-center">vs</span>
          <TeamSide team={away_team} placeholder={match.away_placeholder} side="away" />
        </div>
        <div className="mt-2">
          {saved ? (
            <span className="text-xs text-[#94a3b8]">
              Tu pronóstico:{" "}
              <span className="font-mono font-bold text-[#94a3b8]">{saved.home_score}–{saved.away_score}</span>
            </span>
          ) : (
            <span className="text-xs text-[#64748b]">Sin predicción</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamSide({ team, placeholder, side, large = false }: { team: Team | null; placeholder: string | null; side: "home" | "away"; large?: boolean }) {
  return (
    <div className={cn("flex items-center gap-1.5 flex-1 min-w-0", side === "away" && "flex-row-reverse")}>
      <span className={cn("leading-none shrink-0", large ? "text-2xl" : "text-lg")}>
        {matchTeamFlag(team)}
      </span>
      <span className={cn(
        "font-semibold text-[#f1f5f9] truncate",
        large ? "text-sm" : "text-xs",
        side === "away" && "text-right"
      )}>
        {matchTeamName(team, placeholder)}
      </span>
    </div>
  );
}

function ScoreInput({ name, defaultValue, onChange }: { name: string; defaultValue?: number; onChange?: () => void }) {
  return (
    <input
      type="number"
      name={name}
      min={0}
      max={30}
      step={1}
      defaultValue={defaultValue ?? ""}
      placeholder="0"
      onChange={onChange}
      className="w-11 h-9 text-center text-base font-black rounded-xl bg-[#2a2a50] border-2 border-[#5252a0] text-[#f1f5f9] placeholder:text-[#5252a0] hover:border-[#6a6ac0] focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 focus:bg-[#38BDF8]/[0.05] tabular-nums transition-colors outline-none"
      style={{ MozAppearance: "textfield" } as React.CSSProperties}
    />
  );
}
