"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Match } from "@/lib/matches";
import AdminCalendarRow from "./AdminCalendarRow";

// ── Quick filters ─────────────────────────────────────────────────────

type QuickFilter = "all" | "live" | "today" | "upcoming" | "finished";

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "all",      label: "Todos"      },
  { id: "live",     label: "En vivo"    },
  { id: "today",    label: "Hoy"        },
  { id: "upcoming", label: "Próximos"   },
  { id: "finished", label: "Finalizados"},
];

// ── Date helpers ──────────────────────────────────────────────────────

function colombiaDateKey(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString("en-CA", {
    timeZone: "America/Bogota",
  }); // "YYYY-MM-DD"
}

function todayColombiaKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

function formatDateHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  const raw = date.toLocaleDateString("es-CO", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ── Quick-filter logic ────────────────────────────────────────────────

function applyQuickFilter(matches: Match[], filter: QuickFilter): Match[] {
  const todayKey = todayColombiaKey();
  if (filter === "all")      return matches;
  if (filter === "live")     return matches.filter((m) => m.status === "live");
  if (filter === "finished") return matches.filter((m) => m.status === "finished");
  if (filter === "today")    return matches.filter((m) => colombiaDateKey(m.starts_at) === todayKey);
  if (filter === "upcoming") return matches.filter(
    (m) => m.status === "scheduled" && colombiaDateKey(m.starts_at) >= todayKey
  );
  return matches;
}

// ── Date section ──────────────────────────────────────────────────────

function DateSection({ dateKey, matches }: { dateKey: string; matches: Match[] }) {
  const todayKey  = todayColombiaKey();
  const isPast    = dateKey < todayKey;
  const [open, setOpen] = useState(!isPast); // past sections start collapsed

  const live     = matches.filter((m) => m.status === "live").length;
  const finished = matches.filter((m) => m.status === "finished").length;
  const sched    = matches.filter((m) => m.status === "scheduled").length;
  const isToday  = dateKey === todayKey;

  return (
    <section>
      {/* Sticky date header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="sticky top-[48px] z-20 w-full flex items-center gap-2 bg-[#080810]/95 backdrop-blur-sm py-2 mb-2 text-left group"
      >
        {open
          ? <ChevronDown  size={12} className="text-[#475569] shrink-0" />
          : <ChevronRight size={12} className="text-[#475569] shrink-0" />}

        <span className={cn(
          "text-xs font-bold uppercase tracking-wide",
          isToday ? "text-[#38BDF8]" : "text-[#94a3b8]"
        )}>
          {formatDateHeader(dateKey)}
          {isToday && <span className="ml-1.5 text-[9px] font-mono text-[#38BDF8]/70">hoy</span>}
        </span>

        {/* Stats pills */}
        <div className="flex items-center gap-1 ml-1">
          <span className="text-[9px] text-[#475569]">{matches.length} partidos</span>
          {live > 0 && (
            <span className="text-[9px] font-bold text-[#ef4444] bg-[#ef4444]/10 px-1 rounded">
              {live} vivo
            </span>
          )}
          {finished > 0 && (
            <span className="text-[9px] text-[#38BDF8]/60 bg-[#38BDF8]/5 px-1 rounded">
              {finished} fin.
            </span>
          )}
          {sched > 0 && (
            <span className="text-[9px] text-[#475569] bg-[#18182a] px-1 rounded">
              {sched} prog.
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-2 mb-4">
          {matches.map((m) => (
            <AdminCalendarRow key={m.id} match={m} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function AdminCalendarView({ matches }: { matches: Match[] }) {
  const [filter, setFilter] = useState<QuickFilter>(() =>
    matches.some((m) => m.status === "live") ? "live" : "all"
  );

  const filtered = useMemo(() => applyQuickFilter(matches, filter), [matches, filter]);

  const days = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of filtered) {
      const key = colombiaDateKey(m.starts_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const liveCount = matches.filter((m) => m.status === "live").length;

  return (
    <div>
      {/* Quick filter tabs */}
      <div className="flex items-center gap-1 flex-wrap mb-4">
        {QUICK_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
              filter === id
                ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/25"
                : "bg-[#18182a] text-[#94a3b8] border border-[#2a2a45] hover:text-[#f1f5f9]"
            )}
          >
            {label}
            {id === "live" && liveCount > 0 && (
              <span className="text-[9px] font-bold text-[#ef4444] bg-[#ef4444]/10 px-1 rounded">
                {liveCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {days.length === 0 && (
        <div className="text-center py-12 text-sm text-[#94a3b8]">
          {filter === "live"     ? "No hay partidos en vivo." :
           filter === "today"    ? "No hay partidos hoy." :
           filter === "upcoming" ? "No hay próximos partidos." :
           filter === "finished" ? "No hay partidos finalizados." :
           "No hay partidos con estos filtros."}
        </div>
      )}

      {/* Date sections */}
      {days.map(([dateKey, dayMatches]) => (
        <DateSection key={dateKey} dateKey={dateKey} matches={dayMatches} />
      ))}
    </div>
  );
}
