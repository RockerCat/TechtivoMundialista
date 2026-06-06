import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getMatchesWithPredictions } from "@/lib/db/matches";
import { getUserGroupsWithMeta, isGroupMember, getActivePlayerCount } from "@/lib/db/groups";
import { getGroupLeaderboard } from "@/lib/db/leaderboard";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import {
  matchClosedReason,
  formatKickoff,
  detectCurrentStage,
  matchTeamName,
  matchTeamFlag,
  PHASE_LABELS,
  PHASE_SCORING,
  type MatchWithPrediction,
} from "@/lib/matches";
import type { LeaderboardEntry } from "@/lib/groups";
import { Check } from "lucide-react";
import Link from "next/link";
import LiveMatchPoller from "@/components/dashboard/LiveMatchPoller";
import LiveMatchCard from "@/components/dashboard/LiveMatchCard";
import PrizePoolCard from "@/components/dashboard/PrizePoolCard";
import CalendarView from "@/components/dashboard/CalendarView";
import { computePrizePool } from "@/lib/groups";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Admins have their own panel — they never see the player dashboard
  if (await isAdmin(user.id)) redirect("/admin");

  // Disabled accounts are blocked from all app pages
  if (await isUserDisabled(user.id)) redirect("/disabled");

  // Non-members (accounts created without an invite) cannot access the game
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  const username = user.user_metadata?.username as string | undefined;
  const displayName = username ?? user.email?.split("@")[0] ?? "jugador";

  const [matches, groups] = await Promise.all([
    getMatchesWithPredictions(user.id),
    getUserGroupsWithMeta(user.id),
  ]);

  const community   = groups[0] ?? null;
  const [leaderboard, activePlayers] = await Promise.all([
    community ? getGroupLeaderboard(community.id) : Promise.resolve([]),
    community ? getActivePlayerCount(community.id) : Promise.resolve(0),
  ]);
  const userEntry   = leaderboard.find((e) => e.user_id === user.id) ?? null;

  // Scheduled matches with open prediction window and no prediction yet
  const pendingCount = matches.filter(
    (m) => m.status === "scheduled" && matchClosedReason(m) === null && !m.prediction
  ).length;

  // Live matches sorted by kickoff — shown as a group when ≥1 exist.
  const liveMatches = matches
    .filter((m) => m.status === "live")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  // Fallback featured match (used only when no live matches).
  const fallbackMatch: MatchWithPrediction | null = (() => {
    const open = matches.find((m) => m.status === "scheduled" && matchClosedReason(m) === null);
    if (open) return open;
    const scheduled = matches
      .filter((m) => m.status === "scheduled")
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
    if (scheduled) return scheduled;
    return matches
      .filter((m) => m.status === "finished")
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())[0] ?? null;
  })();

  const currentStage   = detectCurrentStage(matches);
  const hasLiveMatch   = matches.some((m) => m.status === "live");

  const prizePool = community
    ? computePrizePool(
        {
          entry_fee:        community.entry_fee        ?? 0,
          first_place_pct:  community.first_place_pct  ?? 70,
          second_place_pct: community.second_place_pct ?? 30,
        },
        activePlayers   // active players only — excludes admins and disabled users
      )
    : null;

  return (
    <div className="max-w-[1320px] mx-auto px-4 py-6">
      <LiveMatchPoller hasLiveMatch={hasLiveMatch} />
      {/*
        DOM order: [user-summary] [matches] [leaderboard]
        Mobile (flex-col): user-summary → matches → leaderboard
        Desktop (lg:grid):  user-summary | matches | leaderboard
      */}
      {/*
        Mobile  (flex-col + order): matches(1) → user+scoring(2) → leaderboard(3)
        Desktop (lg:grid, explicit col-start/row-start): order ignored, cols 1|2|3
      */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[220px_1fr_200px] lg:items-start lg:gap-6">

        {/* ── Center: featured area + group blocks ─────────────────── */}
        {/* Mobile: order-1 (first). Desktop: col-2 via explicit grid placement. */}
        <main className="order-1 lg:order-none lg:col-start-2 lg:row-start-1 min-w-0">
          {liveMatches.length > 0
            ? <LiveMatchesSection matches={liveMatches} />
            : fallbackMatch && <FeaturedMatchCard match={fallbackMatch} />
          }
          <CalendarView matches={matches} />
        </main>

        {/* ── Left: user summary + scoring card ────────────────────── */}
        {/* Mobile: order-2 (below matches). Desktop: col-1 via grid. */}
        <aside className="order-2 lg:order-none lg:col-start-1 lg:row-start-1 flex flex-col gap-4">
          <UserSummaryPanel
            displayName={displayName}
            userEntry={userEntry}
            pendingCount={pendingCount}
          />
          <ScoringCard stage={currentStage} />
        </aside>

        {/* ── Right: leaderboard + prize pool ──────────────────────── */}
        {/* Mobile: order-3 (after groups). Desktop: col-3 via grid. */}
        {leaderboard.length > 0 && (
          <aside className="order-3 lg:order-none lg:col-start-3 lg:row-start-1">
            <div className="lg:sticky lg:top-[64px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto flex flex-col gap-4">
              <LeaderboardPanel leaderboard={leaderboard} currentUserId={user.id} />
              {prizePool && (
                <PrizePoolCard pool={prizePool} leaderboard={leaderboard} />
              )}
            </div>
          </aside>
        )}

      </div>
    </div>
  );
}

// ── Live matches section ──────────────────────────────────────────────
// Renders one card per live match. Single match: full-width.
// Multiple matches: 2-column grid on md+, single column on mobile.

function LiveMatchesSection({ matches: liveMatches }: { matches: MatchWithPrediction[] }) {
  return (
    <div className="mb-5">
      {liveMatches.length > 1 && (
        <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-3">
          Partidos en vivo · {liveMatches.length}
        </p>
      )}
      <div className={cn(
        "grid gap-3",
        liveMatches.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
      )}>
        {liveMatches.map((m) => (
          <LiveMatchCard key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}

// ── Fallback featured match card ──────────────────────────────────────
// Used only when no live matches exist.
// Shows: scheduled (open/closed) or last finished match.

function FeaturedMatchCard({ match }: { match: MatchWithPrediction }) {
  const isFinished = match.status === "finished";
  const hasPrediction = !!match.prediction;
  const hasScore   = match.home_score !== null && match.away_score !== null;

  if (isFinished && hasScore) {
    return (
      <Link
        href={`/matches/${match.id}`}
        className="block rounded-2xl border border-[#1e1e35] bg-[#11111c] p-4 mb-5 cursor-pointer transition-all hover:border-[#2a2a45]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-2">
              Último partido
            </p>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-lg leading-none">{matchTeamFlag(match.home_team)}</span>
              <span className="text-sm font-bold text-[#f1f5f9] truncate">{matchTeamName(match.home_team, match.home_placeholder)}</span>
              <span className="text-sm font-black text-[#f1f5f9] tabular-nums mx-1">
                {match.home_score}–{match.away_score}
              </span>
              <span className="text-sm font-bold text-[#f1f5f9] truncate">{matchTeamName(match.away_team, match.away_placeholder)}</span>
              <span className="text-lg leading-none">{matchTeamFlag(match.away_team)}</span>
            </div>
            <p className="text-[10px] text-[#94a3b8]">{formatKickoff(match.starts_at)}</p>
          </div>
          {hasPrediction && match.prediction!.scored_at && (
            <div className="shrink-0 text-right">
              <span className={cn(
                "text-sm font-black tabular-nums",
                match.prediction!.points > 0 ? "text-[#38BDF8]" : "text-[#64748b]"
              )}>
                {match.prediction!.points > 0 ? `+${match.prediction!.points}` : "0"} pts
              </span>
            </div>
          )}
        </div>
      </Link>
    );
  }

  // Scheduled (open or closed)
  const isOpen = matchClosedReason(match) === null;
  return (
    <Link
      href={`/matches/${match.id}`}
      className={cn(
        "block rounded-2xl border p-4 mb-5 cursor-pointer transition-all",
        hasPrediction || !isOpen
          ? "bg-[#11111c] border-[#1e1e35] hover:border-[#2a2a45]"
          : "bg-[#f59e0b]/[0.04] border-[#f59e0b]/20 hover:border-[#f59e0b]/35"
      )}>
    <div className="flex items-start justify-between gap-3">

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-2">
          ⚽ Próximo partido
        </p>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-lg leading-none">{matchTeamFlag(match.home_team)}</span>
          <span className="text-sm font-bold text-[#f1f5f9] truncate">{matchTeamName(match.home_team, match.home_placeholder)}</span>
          <span className="text-[10px] text-[#64748b] font-bold shrink-0">vs</span>
          <span className="text-sm font-bold text-[#f1f5f9] truncate">{matchTeamName(match.away_team, match.away_placeholder)}</span>
          <span className="text-lg leading-none">{matchTeamFlag(match.away_team)}</span>
        </div>
        <p className="text-[10px] text-[#94a3b8]">{formatKickoff(match.starts_at)}</p>
      </div>

      <div className="shrink-0 text-right">
        {hasPrediction ? (
          <div>
            <div className="flex items-center justify-end gap-1 mb-0.5">
              <Check size={9} className="text-[#38BDF8]" />
              <span className="text-[10px] text-[#38BDF8]">Guardado</span>
            </div>
            <span className="font-mono font-black text-base text-[#f1f5f9] tabular-nums">
              {match.prediction!.home_score}–{match.prediction!.away_score}
            </span>
          </div>
        ) : isOpen ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-[#f59e0b]">⚠</span>
            <span className="text-xs font-semibold text-[#f59e0b]/80">Pendiente</span>
          </div>
        ) : null}
      </div>

    </div>
    </Link>
  );
}

// ── Left sidebar: user summary ────────────────────────────────────────

function UserSummaryPanel({
  displayName,
  userEntry,
  pendingCount,
}: {
  displayName: string;
  userEntry: LeaderboardEntry | null;
  pendingCount: number;
}) {
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-4 lg:p-5">

      {/* ── Header: avatar + name ── */}
      {/* Mobile: avatar smaller, rank+pts inline to the right */}
      {/* Desktop: avatar larger, "Techtivo Mundialista" subtitle, rank+pts in cards below */}
      <div className="flex items-center gap-3 mb-3 lg:mb-5">
        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-[#38BDF8]/15 border border-[#38BDF8]/20 flex items-center justify-center shrink-0">
          <span className="text-xs lg:text-sm font-black text-[#38BDF8]">{initial}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#f1f5f9] truncate">{displayName}</p>
          <p className="text-[10px] text-[#64748b] hidden lg:block">Techtivo Mundialista</p>
        </div>
        {/* Mobile only: rank + pts inline */}
        {userEntry && (
          <div className="lg:hidden shrink-0 text-right">
            <p className={cn(
              "text-lg font-black leading-none tabular-nums",
              userEntry.rank <= 3 ? "text-[#f59e0b]" : "text-[#f1f5f9]"
            )}>
              #{userEntry.rank}
            </p>
            <p className="text-[10px] text-[#64748b] tabular-nums mt-0.5">
              {userEntry.total_points} pts
            </p>
          </div>
        )}
      </div>

      {userEntry ? (
        <>
          {/* Desktop only: big rank + points stat cards */}
          <div className="hidden lg:grid grid-cols-2 gap-3 mb-3">
            <div className="bg-[#18182a] border border-[#1e1e35] rounded-xl p-3 text-center">
              <p className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1.5">
                Posición
              </p>
              <p className={cn(
                "text-3xl font-black leading-none tabular-nums",
                userEntry.rank <= 3 ? "text-[#f59e0b]" : "text-[#f1f5f9]"
              )}>
                #{userEntry.rank}
              </p>
            </div>
            <div className="bg-[#18182a] border border-[#1e1e35] rounded-xl p-3 text-center">
              <p className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1.5">
                Puntos
              </p>
              <p className="text-3xl font-black leading-none tabular-nums text-[#f1f5f9]">
                {userEntry.total_points}
              </p>
            </div>
          </div>

          {/* Secondary stats — shown on both mobile and desktop */}
          <div className="border-t border-[#1e1e35] pt-3 grid grid-cols-3 gap-1 text-center">
            <div>
              <p className="text-sm font-black text-[#f59e0b] tabular-nums">
                {userEntry.exact_count}
              </p>
              <p className="text-[10px] text-[#94a3b8]">Exactos</p>
            </div>
            <div>
              <p className="text-sm font-black text-[#38BDF8] tabular-nums">
                {userEntry.result_count}
              </p>
              <p className="text-[10px] text-[#94a3b8]">Ganadores</p>
            </div>
            <div>
              <p className={cn(
                "text-sm font-black tabular-nums",
                pendingCount > 0 ? "text-[#f59e0b]" : "text-[#64748b]"
              )}>
                {pendingCount}
              </p>
              <p className="text-[10px] text-[#94a3b8]">Pendientes</p>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-[#18182a] rounded-xl p-4 text-center">
          <p className="text-xs text-[#64748b]">
            Haz tu primera predicción para aparecer en la tabla.
          </p>
        </div>
      )}

    </div>
  );
}

// ── Left sidebar: scoring card ────────────────────────────────────────

function ScoringCard({ stage }: { stage: import("@/lib/matches").MatchStage }) {
  const phaseLabel = PHASE_LABELS[stage];
  const scoring    = PHASE_SCORING[stage];

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-4 lg:p-5">
      <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-0.5">
        Sistema de puntos
      </p>
      <p className="text-xs text-[#94a3b8] mb-4">
        Fase actual:{" "}
        <span className="font-semibold text-[#94a3b8]">{phaseLabel}</span>
      </p>

      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#94a3b8]">⚡ Marcador exacto</span>
          <span className="text-xs font-black text-[#f59e0b] tabular-nums">
            {scoring.exact} pts
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#94a3b8]">✓ Ganador correcto</span>
          <span className="text-xs font-black text-[#38BDF8] tabular-nums">
            {scoring.result} pt{scoring.result !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <Link
        href="/rules"
        className="text-[11px] text-[#64748b] hover:text-[#94a3b8] transition-colors"
      >
        Ver reglas completas →
      </Link>
    </div>
  );
}

// ── Right sidebar: leaderboard ────────────────────────────────────────

const MEDALS = ["🥇", "🥈", "🥉"] as const;

function LeaderboardPanel({
  leaderboard,
  currentUserId,
}: {
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
}) {
  const leaderPts = leaderboard[0]?.total_points ?? 0;

  return (
    <div className="bg-[#18182a] border border-[#2a2a45] rounded-2xl overflow-hidden">
      <div className="py-3 text-center border-b border-[#2a2a45]">
        <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest">
          Ranking
        </p>
      </div>
      <div className="divide-y divide-[#1e1e35]">
        {leaderboard.map((entry) => {
          const isMe  = entry.user_id === currentUserId;
          const medal = entry.rank <= 3 ? MEDALS[entry.rank - 1] : null;
          const diff  = leaderPts > 0 && entry.total_points < leaderPts
            ? leaderPts - entry.total_points
            : null;

          return (
            <div key={entry.user_id}>
              {/* "Líder actual" label — only above the first place entry */}
              {entry.rank === 1 && leaderPts > 0 && (
                <p className="px-3 pt-2 pb-0.5 text-[9px] font-mono text-[#f59e0b]/70 uppercase tracking-widest">
                  Líder actual
                </p>
              )}
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2.5",
                isMe && "bg-[#38BDF8]/5"
              )}
            >
              {/* Medal or rank */}
              <div className="w-6 shrink-0 text-center">
                {medal ? (
                  <span className="text-sm leading-none">{medal}</span>
                ) : (
                  <span className="text-[10px] font-mono text-[#94a3b8]">#{entry.rank}</span>
                )}
              </div>

              {/* Name */}
              <p className={cn(
                "text-sm flex-1 truncate",
                isMe ? "font-black text-[#f1f5f9]" : "font-normal text-[#94a3b8]"
              )}>
                {entry.display_name}
              </p>

              {/* Points + optional diff */}
              <div className="text-right shrink-0">
                <div className="flex items-baseline gap-0.5 justify-end">
                  <span className={cn(
                    "text-sm tabular-nums font-bold",
                    isMe ? "text-[#f1f5f9]" : "text-[#94a3b8]"
                  )}>
                    {entry.total_points}
                  </span>
                  <span className="text-[9px] text-[#64748b]">pts</span>
                </div>
                {diff !== null && (
                  <p className="text-[9px] text-[#ef4444]/70 tabular-nums">-{diff}</p>
                )}
              </div>
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
