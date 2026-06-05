"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { matchClosedReason, type MatchWithPrediction } from "@/lib/matches";
import { saveGroupPredictionsAction, type GroupSaveState } from "@/app/actions/predictions";
import MatchRowInGroup from "./MatchRowInGroup";
import { Check, ChevronRight, Loader2 } from "lucide-react";

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

// Returns a muted timing hint for the next scheduled match in this block,
// e.g. "hoy", "mañana", "en 3 h", "en 2 días". Returns null when no
// upcoming match exists (all finished or already live).
function computeNextMatchHint(matches: MatchWithPrediction[]): string | null {
  const now = Date.now();
  const next = matches
    .filter((m) => m.status === "scheduled" && new Date(m.starts_at).getTime() > now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];

  if (!next) return null;

  const diffMs    = new Date(next.starts_at).getTime() - now;
  const diffMins  = Math.ceil(diffMs / 60_000);
  const diffHours = diffMs / 3_600_000;

  if (diffMins  < 60)  return `en ${diffMins} min`;
  if (diffHours < 24)  return `en ${Math.round(diffHours)} h`;

  const kickoff  = new Date(next.starts_at);
  const today    = new Date();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);

  if (isSameCalendarDay(kickoff, today))    return "hoy";
  if (isSameCalendarDay(kickoff, tomorrow)) return "mañana";

  const diffDays = Math.ceil(diffMs / 86_400_000);
  if (diffDays <= 30) return `en ${diffDays} días`;

  return null;
}

interface GroupMatchBlockProps {
  label: string;
  matches: MatchWithPrediction[];
  isDefaultOpen?: boolean;
}

export default function GroupMatchBlock({ label, matches, isDefaultOpen = false }: GroupMatchBlockProps) {
  const [state, formAction, isPending] = useActionState<GroupSaveState, FormData>(
    saveGroupPredictionsAction,
    null
  );

  const [isDirty, setIsDirty] = useState(false);
  const [isOpen, setIsOpen] = useState(isDefaultOpen);

  useEffect(() => {
    if (state?.success) setIsDirty(false);
  }, [state?.success]);

  const pendingCount = useMemo(
    () => matches.filter(
      (m) => m.status === "scheduled" && matchClosedReason(m) === null && !m.prediction
    ).length,
    [matches]
  );

  const nextHint = useMemo(() => computeNextMatchHint(matches), [matches]);

  const hasOpenMatches = matches.some((m) => matchClosedReason(m) === null);
  const hasPending     = pendingCount > 0;

  const buttonClass = cn(
    "w-full h-10 rounded-xl text-xs font-semibold border transition-all",
    isDirty
      ? "bg-[#00c85a] border-[#00c85a] text-[#0a0a12] hover:bg-[#00e87a] shadow-[0_0_20px_rgba(0,200,90,0.2)]"
      : state?.success
      ? "bg-[#00c85a]/10 border-[#00c85a]/30 text-[#00c85a]"
      : "bg-transparent border-[#1e1e35] text-[#2a2a45] cursor-default"
  );

  return (
    <div>
      {/* ── Accordion header ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left mb-2.5 group"
      >
        <ChevronRight
          size={10}
          className={cn(
            "text-[#64748b] transition-transform duration-200 shrink-0",
            isOpen && "rotate-90"
          )}
        />
        <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest shrink-0">
          {label}
        </span>
        <span className="text-[10px] text-[#64748b] shrink-0">
          {matches.length} partido{matches.length !== 1 ? "s" : ""}
          {hasPending ? ` · ${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}` : ""}
        </span>
        {hasPending && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0" aria-hidden />
        )}
        {nextHint && (
          <span className="text-[10px] text-[#64748b] shrink-0">{nextHint}</span>
        )}
        <div className="flex-1 h-px bg-[#1e1e35]" />
      </button>

      {/* ── Collapsible content (CSS grid height animation) ────────── */}
      <div
        className={cn(
          "grid transition-all duration-[250ms] ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden min-h-0">
          {/* small bottom padding so last card isn't clipped during animation */}
          <div className="pb-1">
            <form action={formAction}>
              <div className="flex flex-col gap-2 mb-3">
                {matches.map((match) => (
                  <MatchRowInGroup
                    key={match.id}
                    match={match}
                    error={state?.errors?.[match.id]}
                    onDirty={() => setIsDirty(true)}
                  />
                ))}
              </div>

              {hasOpenMatches && (
                <>
                  <button
                    type="submit"
                    disabled={isPending || (!isDirty && !state?.success)}
                    className={buttonClass}
                  >
                    {isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={12} className="animate-spin" />
                        Guardando...
                      </span>
                    ) : state?.success && !isDirty ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Check size={12} strokeWidth={2.5} />
                        Guardado
                      </span>
                    ) : (
                      `Guardar ${label}`
                    )}
                  </button>

                  {isDirty && !isPending && (
                    <div className="flex items-center justify-center gap-1.5 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00c85a]" />
                      <span className="text-[10px] text-[#00c85a]/70">Cambios sin guardar</span>
                    </div>
                  )}
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
