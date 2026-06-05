"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { type MatchWithPrediction } from "@/lib/matches";
import CalendarView from "./CalendarView";
import PhaseMatchView from "./PhaseMatchView";

type View = "calendar" | "groups";

const STORAGE_KEY = "dashboard_view_v1";

interface DashboardViewToggleProps {
  matches: MatchWithPrediction[];
}

export default function DashboardViewToggle({ matches }: DashboardViewToggleProps) {
  // Default: calendar on mobile, calendar everywhere (user can switch to groups)
  const [view, setView] = useState<View>("calendar");
  const [mounted, setMounted] = useState(false);

  // Read persisted preference after hydration to avoid SSR mismatch
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as View | null;
    if (stored === "calendar" || stored === "groups") setView(stored);
    setMounted(true);
  }, []);

  function handleSwitch(v: View) {
    setView(v);
    localStorage.setItem(STORAGE_KEY, v);
  }

  return (
    <div>
      {/* Toggle bar */}
      <div className="flex items-center gap-1 mb-4 bg-[#18182a] border border-[#2a2a45] rounded-xl p-1 self-start w-fit">
        <ToggleBtn
          active={view === "calendar"}
          onClick={() => handleSwitch("calendar")}
          icon={<CalendarDays size={13} strokeWidth={1.8} />}
          label="Calendario"
        />
        <ToggleBtn
          active={view === "groups"}
          onClick={() => handleSwitch("groups")}
          icon={<Layers size={13} strokeWidth={1.8} />}
          label="Grupos"
        />
      </div>

      {/* View — show calendar immediately (SSR-safe), fade in preference after hydration */}
      {!mounted || view === "calendar"
        ? <CalendarView matches={matches} />
        : <PhaseMatchView matches={matches} />
      }
    </div>
  );
}

function ToggleBtn({
  active, onClick, icon, label,
}: {
  active:  boolean;
  onClick: () => void;
  icon:    React.ReactNode;
  label:   string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
        active
          ? "bg-[#00c85a]/15 text-[#00c85a] border border-[#00c85a]/25"
          : "text-[#64748b] hover:text-[#94a3b8]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
