import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MatchEditorCard from "@/components/admin/MatchEditorCard";
import { matchTeamCode, type Match } from "@/lib/matches";

interface PageProps {
  params: Promise<{ matchId: string }>;
}

export default async function AdminMatchDetailPage({ params }: PageProps) {
  const { matchId } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("*, home_team:home_team_id(*), away_team:away_team_id(*)")
    .eq("id", matchId)
    .single();

  if (!data) notFound();
  const match = data as Match;

  const matchLabel = `${matchTeamCode(match.home_team, match.home_placeholder)} vs ${matchTeamCode(match.away_team, match.away_placeholder)}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
            Admin / Partidos
          </p>
          <h1 className="text-2xl font-black text-[#f1f5f9]">{matchLabel}</h1>
          {match.group_code && (
            <p className="text-xs text-[#94a3b8] mt-0.5">Grupo {match.group_code}</p>
          )}
        </div>
        <div className="flex items-center gap-2 pt-1 shrink-0">
          <Link
            href="/admin/matches"
            className="text-xs text-[#94a3b8] hover:text-[#94a3b8] transition-colors"
          >
            ← Partidos
          </Link>
          <span className="text-[#2a2a45]">·</span>
          <Link
            href="/admin/dashboard"
            className="text-xs text-[#94a3b8] hover:text-[#94a3b8] transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>

      {/* Full editor — includes result, fixture, and predictions panels */}
      <MatchEditorCard match={match} />

    </div>
  );
}
