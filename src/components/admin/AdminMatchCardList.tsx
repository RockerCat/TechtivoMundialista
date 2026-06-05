"use client";

import type { Match } from "@/lib/matches";
import MatchEditorCard from "./MatchEditorCard";

export default function AdminMatchCardList({ matches }: { matches: Match[] }) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-[#94a3b8]">
        No hay partidos con los filtros seleccionados.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {matches.map((match) => (
        <MatchEditorCard key={match.id} match={match} />
      ))}
    </div>
  );
}
