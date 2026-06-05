"use client";

import { useEffect, useState } from "react";
import { CalendarDays, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Match } from "@/lib/matches";
import AdminCalendarView from "./AdminCalendarView";
import AdminMatchCardList from "./AdminMatchCardList";

type View = "calendar" | "cards";
const STORAGE_KEY = "admin_matches_view_v1";

export default function AdminMatchesViewToggle({ matches }: { matches: Match[] }) {
  const [view, setView]     = useState<View>("calendar");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as View | null;
    if (stored === "calendar" || stored === "cards") setView(stored);
    setMounted(true);
  }, []);

  function handleSwitch(v: View) {
    setView(v);
    localStorage.setItem(STORAGE_KEY, v);
  }

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center gap-1 mb-5 bg-[#11111c] border border-[#1e1e35] rounded-xl p-1 w-fit">
        <ToggleBtn active={view === "calendar"} onClick={() => handleSwitch("calendar")}
          icon={<CalendarDays size={12} strokeWidth={1.8} />} label="Calendario" />
        <ToggleBtn active={view === "cards"}    onClick={() => handleSwitch("cards")}
          icon={<LayoutList    size={12} strokeWidth={1.8} />} label="Tarjetas"   />
      </div>

      {/* View */}
      {!mounted || view === "calendar"
        ? <AdminCalendarView matches={matches} />
        : <AdminMatchCardList matches={matches} />
      }
    </div>
  );
}

function ToggleBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button onClick={onClick} className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
      active ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/25"
             : "text-[#64748b] hover:text-[#94a3b8]"
    )}>
      {icon}{label}
    </button>
  );
}
