import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/db/admin";
import AdvancedMatchEditor from "@/components/admin/AdvancedMatchEditor";
import { matchTeamCode, type Match, type Team } from "@/lib/matches";

interface PageProps {
  params: Promise<{ matchId: string }>;
}

export default async function AdvancedMatchEditPage({ params }: PageProps) {
  const { matchId } = await params;

  const supabase = await createClient();

  // Admin check — server-side, before rendering anything
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) notFound();

  const [{ data: matchData }, { data: teamsData }] = await Promise.all([
    supabase
      .from("matches")
      .select("*, home_team:home_team_id(*), away_team:away_team_id(*)")
      .eq("id", matchId)
      .single(),
    supabase
      .from("teams")
      .select("id, name, code, flag_emoji")
      .order("name", { ascending: true }),
  ]);

  if (!matchData) notFound();

  const match = matchData as Match;
  const teams = (teamsData ?? []) as Team[];

  const matchLabel = `${matchTeamCode(match.home_team, match.home_placeholder)} vs ${matchTeamCode(match.away_team, match.away_placeholder)}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] text-[#f59e0b]/60 font-mono uppercase tracking-widest mb-1">
            Admin / Partidos / Edición avanzada
          </p>
          <h1 className="text-2xl font-black text-[#f1f5f9]">{matchLabel}</h1>
          {match.match_number && (
            <p className="text-xs text-[#94a3b8] mt-0.5 font-mono">M{match.match_number}</p>
          )}
        </div>
        <div className="flex items-center gap-2 pt-1 shrink-0 text-xs text-[#94a3b8]">
          <Link href={`/admin/matches/${matchId}`} className="hover:text-[#f1f5f9] transition-colors">
            ← Detalle
          </Link>
          <span className="text-[#2a2a45]">·</span>
          <Link href="/admin/matches" className="hover:text-[#f1f5f9] transition-colors">
            Partidos
          </Link>
        </div>
      </div>

      <AdvancedMatchEditor match={match} teams={teams} />

    </div>
  );
}
