"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { STAGE_LABELS, STAGE_SHORT_LABELS, type MatchWithPrediction, type MatchStage } from "@/lib/matches";
import GroupMatchBlock from "./GroupMatchBlock";

const STAGE_ORDER: MatchStage[] = [
  "group",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];


function defaultStage(matches: MatchWithPrediction[]): MatchStage {
  for (const m of matches) {
    if (m.status === "live") return m.stage as MatchStage;
  }
  const counts = new Map<MatchStage, number>();
  for (const m of matches) {
    if (m.status === "scheduled") {
      const s = m.stage as MatchStage;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  if (counts.size > 0) {
    return [...counts.entries()].sort(([, a], [, b]) => b - a)[0][0];
  }
  for (const s of [...STAGE_ORDER].reverse()) {
    if (matches.some((m) => m.stage === s)) return s;
  }
  return "group";
}

// For group stage: one block per group_code (A, B, C, …), sorted alphabetically.
// When group_code is missing (migration not yet applied), assigns matches
// round-robin to A–D so the 2-column group-card grid always renders properly.
const FALLBACK_GROUPS = ["A", "B", "C", "D"] as const;

function groupByGroupCode(
  matches: MatchWithPrediction[]
): { key: string; label: string; matches: MatchWithPrediction[] }[] {
  const buckets = new Map<string, MatchWithPrediction[]>();
  let fallbackIdx = 0;

  for (const m of matches) {
    const code = m.group_code ?? FALLBACK_GROUPS[fallbackIdx++ % FALLBACK_GROUPS.length];
    if (!buckets.has(code)) buckets.set(code, []);
    buckets.get(code)!.push(m);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, groupMatches]) => ({
      key: code,
      label: `Grupo ${code}`,
      matches: groupMatches,
    }));
}

// For knockout stages: one block per calendar day, labelled by date.
function groupByDay(
  matches: MatchWithPrediction[]
): { key: string; label: string; matches: MatchWithPrediction[] }[] {
  const now = new Date();
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const buckets = new Map<number, MatchWithPrediction[]>();
  for (const m of matches) {
    const d = new Date(m.starts_at);
    const dayMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (!buckets.has(dayMs)) buckets.set(dayMs, []);
    buckets.get(dayMs)!.push(m);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayMs, dayMatches]) => {
      const diff = Math.round((dayMs - todayMs) / 86_400_000);
      const d = new Date(dayMs);

      let label: string;
      if (diff === 0)       label = "Hoy";
      else if (diff === 1)  label = "Mañana";
      else if (diff === -1) label = "Ayer";
      else {
        label = d.toLocaleDateString("es-CO", {
          weekday: "short",
          day:     "numeric",
          month:   "short",
          timeZone: "UTC",
        });
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }

      return { key: String(dayMs), label, matches: dayMatches };
    });
}

interface PhaseMatchViewProps {
  matches: MatchWithPrediction[];
}

export default function PhaseMatchView({ matches }: PhaseMatchViewProps) {
  const availableStages = useMemo(
    () => STAGE_ORDER.filter((s) => matches.some((m) => m.stage === s)),
    [matches]
  );

  const [activeStage, setActiveStage] = useState<MatchStage>(() => defaultStage(matches));

  const stageMatches = useMemo(
    () => matches.filter((m) => m.stage === activeStage),
    [matches, activeStage]
  );

  // Group stage → by group_code; all other stages → by calendar day
  const blocks = useMemo(
    () =>
      activeStage === "group"
        ? groupByGroupCode(stageMatches)
        : groupByDay(stageMatches),
    [activeStage, stageMatches]
  );

  // Default-open: the block that contains the earliest scheduled (not yet started) match.
  // Returns null when all matches are finished → every accordion starts collapsed.
  const defaultOpenKey = useMemo(() => {
    let earliestMs = Infinity;
    let key: string | null = null;
    for (const block of blocks) {
      for (const m of block.matches) {
        if (m.status !== "scheduled") continue;
        const t = new Date(m.starts_at).getTime();
        if (t < earliestMs) { earliestMs = t; key = block.key; }
      }
    }
    return key;
  }, [blocks]);

  if (matches.length === 0) {
    return (
      <div className="bg-[#18182a] border border-dashed border-[#2a2a45] rounded-2xl p-8 text-center">
        <p className="text-2xl mb-2">⚽</p>
        <p className="text-sm font-bold text-[#f1f5f9] mb-1">No hay partidos aún</p>
        <p className="text-xs text-[#94a3b8]">
          Los partidos del Mundial 2026 aparecerán aquí cuando estén programados.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Phase tabs — plain text, active in green */}
      {availableStages.length > 0 && (
        <div className="flex gap-6 mb-6 overflow-x-auto no-scrollbar">
          {availableStages.map((stage) => (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={cn(
                "shrink-0 text-sm font-semibold pb-0.5 whitespace-nowrap transition-colors",
                activeStage === stage
                  ? "text-[#00c85a]"
                  : "text-[#64748b] hover:text-[#94a3b8]"
              )}
            >
              {STAGE_SHORT_LABELS[stage]}
            </button>
          ))}
        </div>
      )}

      {/* 2-column grid of group blocks */}
      {blocks.length === 0 ? (
        <p className="text-sm text-[#64748b] text-center py-12">
          Sin partidos en esta fase.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blocks.map(({ key, label, matches: blockMatches }) => (
            <GroupMatchBlock
              key={key}
              label={label}
              matches={blockMatches}
              isDefaultOpen={key === defaultOpenKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}
