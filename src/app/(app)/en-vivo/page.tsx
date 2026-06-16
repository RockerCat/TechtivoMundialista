import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMatchesWithPredictions, syncStartedMatches } from "@/lib/db/matches";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import { isGroupMember } from "@/lib/db/groups";
import {
  matchClosedReason,
  matchTeamName,
  matchTeamFlag,
  formatKickoff,
  type MatchWithPrediction,
} from "@/lib/matches";
import { cn } from "@/lib/utils";
import LiveMatchCard from "@/components/dashboard/LiveMatchCard";
import LiveMatchPoller from "@/components/dashboard/LiveMatchPoller";

export default async function EnVivoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isAdmin(user.id)) redirect("/admin");
  if (await isUserDisabled(user.id)) redirect("/disabled");
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  await syncStartedMatches();

  const matches = await getMatchesWithPredictions(user.id);

  const liveMatches = matches
    .filter((m) => m.status === "live")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  // Single live match: pass straight through to match detail
  if (liveMatches.length === 1) {
    redirect(`/matches/${liveMatches[0].id}`);
  }

  const nextMatch =
    matches
      .filter((m) => m.status === "scheduled")
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0] ??
    null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/*
        Poller is always mounted so the page auto-refreshes even when idle:
        · liveMatches > 0  → refresh every 3 s while tab is visible
        · liveMatches = 0  → refresh every 60 s (checks if any match goes live)
      */}
      <LiveMatchPoller hasLiveMatch={liveMatches.length > 0} activeInterval={3_000} />

      {liveMatches.length > 1 ? (
        <MultiLiveView matches={liveMatches} />
      ) : (
        <NoLiveView nextMatch={nextMatch} />
      )}
    </div>
  );
}

// ── Multiple live matches ─────────────────────────────────────────────

function MultiLiveView({ matches }: { matches: MatchWithPrediction[] }) {
  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
          </span>
          <h1 className="text-2xl font-black text-[#f1f5f9]">En Vivo</h1>
        </div>
        <p className="text-sm text-[#64748b]">
          {matches.length} partidos en curso ahora mismo.
        </p>
      </div>

      <div className={cn(
        "grid gap-3",
        matches.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
      )}>
        {matches.map((m) => (
          <LiveMatchCard key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}

// ── No live matches ───────────────────────────────────────────────────

function NoLiveView({ nextMatch }: { nextMatch: MatchWithPrediction | null }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#f1f5f9]">En Vivo</h1>
        <p className="text-sm text-[#64748b] mt-1">No hay partidos en curso ahora mismo.</p>
      </div>

      {nextMatch ? (
        <NextMatchCard match={nextMatch} />
      ) : (
        <div className="rounded-2xl border border-dashed border-[#1e1e35] p-10 text-center">
          <p className="text-sm text-[#64748b]">No hay partidos próximos programados.</p>
        </div>
      )}
    </div>
  );
}

// ── Next scheduled match ──────────────────────────────────────────────

function NextMatchCard({ match }: { match: MatchWithPrediction }) {
  const isOpen       = matchClosedReason(match) === null;
  const hasPrediction = !!match.prediction;
  const showWarning  = isOpen && !hasPrediction;

  return (
    <div className="flex flex-col gap-3">

      {/* Prediction warning — only when window is open and user hasn't predicted */}
      {showWarning && (
        <div className="bg-[#f59e0b]/[0.07] border border-[#f59e0b]/25 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f59e0b]">Pronóstico pendiente</p>
            <p className="text-xs text-[#94a3b8] mt-0.5 truncate">
              Todavía puedes pronosticar este partido.
            </p>
          </div>
          <Link
            href={`/matches/${match.id}`}
            className="shrink-0 bg-[#f59e0b] text-[#0a0a12] text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#fbbf24] transition-colors"
          >
            Pronosticar ahora
          </Link>
        </div>
      )}

      {/* Match card */}
      <Link
        href={`/matches/${match.id}`}
        className="block rounded-2xl border border-[#1e1e35] bg-[#11111c] p-5 hover:border-[#2a2a45] transition-all"
      >
        <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-4">
          Próximo partido
        </p>

        {/* Teams */}
        <div className="flex items-center gap-2">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <span className="text-3xl leading-none">{matchTeamFlag(match.home_team)}</span>
            <span className="text-xs font-bold text-[#f1f5f9] text-center truncate w-full">
              {matchTeamName(match.home_team, match.home_placeholder)}
            </span>
          </div>

          {/* VS divider */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <span className="text-xs font-black text-[#2a2a45] tracking-widest">vs</span>
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <span className="text-3xl leading-none">{matchTeamFlag(match.away_team)}</span>
            <span className="text-xs font-bold text-[#f1f5f9] text-center truncate w-full">
              {matchTeamName(match.away_team, match.away_placeholder)}
            </span>
          </div>
        </div>

        {/* Kickoff time */}
        <p className="text-xs text-[#64748b] text-center mt-4">
          {formatKickoff(match.starts_at)}
        </p>

        {/* Saved prediction */}
        {hasPrediction && (
          <div className="mt-4 pt-3 border-t border-[#1e1e35] flex items-center justify-center gap-1.5">
            <span className="text-[10px] text-[#38BDF8]">✓ Mi pronóstico:</span>
            <span className="font-mono font-bold text-sm text-[#38BDF8] tabular-nums">
              {match.prediction!.home_score}–{match.prediction!.away_score}
            </span>
          </div>
        )}
      </Link>

    </div>
  );
}
