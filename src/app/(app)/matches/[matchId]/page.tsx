import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isUserDisabled } from "@/lib/db/admin";
import { isGroupMember, getUserGroupsWithMeta } from "@/lib/db/groups";
import { getMatchDetailPredictions, type MatchPredictionEntry } from "@/lib/db/matches";
import {
  formatKickoff,
  PHASE_LABELS,
  PHASE_SCORING,
  simulatePoints,
  type Match,
  type Prediction,
  type MatchStage,
  type ScoringResult,
} from "@/lib/matches";
import { cn } from "@/lib/utils";
import LiveMatchPoller from "@/components/dashboard/LiveMatchPoller";
import MatchDetailHeaderWrapper from "@/components/dashboard/MatchDetailHeaderWrapper";
import MyPredictionCard from "@/components/dashboard/MyPredictionCard";

// ── Data types ────────────────────────────────────────────────────────

type MatchWithTeams = Match & {
  home_team: { id: string; name: string; code: string; flag_emoji: string | null };
  away_team: { id: string; name: string; code: string; flag_emoji: string | null };
};

// ── Page ─────────────────────────────────────────────────────────────

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isAdmin(user.id)) redirect("/admin");
  if (await isUserDisabled(user.id)) redirect("/disabled");
  if (!(await isGroupMember(user.id))) redirect("/no-access");

  // ── Fetch match ───────────────────────────────────────────────────
  const { data: rawMatch } = await supabase
    .from("matches")
    .select("*, home_team:home_team_id(*), away_team:away_team_id(*)")
    .eq("id", matchId)
    .single();

  if (!rawMatch) redirect("/dashboard");
  const match = rawMatch as MatchWithTeams;

  // ── Fetch own prediction + group in parallel ──────────────────────
  const [predResult, groups] = await Promise.all([
    supabase
      .from("predictions")
      .select("*")
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .maybeSingle(),
    getUserGroupsWithMeta(user.id),
  ]);

  const myPrediction = predResult.data as Prediction | null;
  const community    = groups[0] ?? null;

  // ── Fetch group predictions (live / finished only) ────────────────
  const revealed = match.status === "live" || match.status === "finished";
  const allPreds: MatchPredictionEntry[] =
    revealed && community
      ? await getMatchDetailPredictions(matchId, community.id)
      : [];

  // ── Derived data ──────────────────────────────────────────────────
  const stage     = match.stage as MatchStage;
  const isLive     = match.status === "live";
  const isFinished = match.status === "finished";
  const hasScore   = match.home_score !== null && match.away_score !== null;

  // Simulated/actual points per prediction
  type RichPred = MatchPredictionEntry & { sim: ScoringResult };
  const richPreds: RichPred[] = revealed && hasScore
    ? allPreds.map((p) => ({
        ...p,
        sim: isFinished && p.points_reason
          ? {
              points: p.points,
              reason: p.points_reason as ScoringResult["reason"],
            }
          : simulatePoints(
              p.pred_home, p.pred_away,
              match.home_score!, match.away_score!,
              stage
            ),
      }))
    : allPreds.map((p) => ({ ...p, sim: { points: 0, reason: "Sin puntos" as const } }));

  // Distribution
  const dist   = { home: 0, draw: 0, away: 0 };
  for (const p of allPreds) {
    if      (p.pred_home > p.pred_away) dist.home++;
    else if (p.pred_home < p.pred_away) dist.away++;
    else                                dist.draw++;
  }
  const distTotal = allPreds.length;
  const pct = (n: number) => distTotal > 0 ? Math.round((n / distTotal) * 100) : 0;

  // Top scores
  const scoreMap = new Map<string, number>();
  for (const p of allPreds) {
    const k = `${p.pred_home}-${p.pred_away}`;
    scoreMap.set(k, (scoreMap.get(k) ?? 0) + 1);
  }
  const topScores = [...scoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Live ranking (sorted by simulated pts)
  const liveRanking = isLive && hasScore
    ? [...richPreds].sort((a, b) => b.sim.points - a.sim.points)
    : [];

  // My situation
  const mySim = myPrediction && hasScore
    ? simulatePoints(
        myPrediction.home_score, myPrediction.away_score,
        match.home_score!, match.away_score!,
        stage
      )
    : null;

  // Community insights
  const insights = buildInsights(allPreds, richPreds, match, isFinished);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <LiveMatchPoller hasLiveMatch={isLive} activeInterval={3_000} />

      {/* Back */}
      <a
        href="/dashboard"
        className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors inline-flex items-center gap-1"
      >
        ← Inicio
      </a>

      {/* ── Match header ──────────────────────────────────────────── */}
      <MatchDetailHeaderWrapper
        homeScore={match.home_score}
        awayScore={match.away_score}
        isLive={isLive}
      >
        <MatchHeader match={match} />
      </MatchDetailHeaderWrapper>

      {/* ── Mi Pronóstico ─────────────────────────────────────────── */}
      <MyPredictionCard
        matchId={match.id}
        myPrediction={myPrediction}
        mySim={mySim}
        isScheduled={match.status === "scheduled"}
        isLive={isLive}
        isFinished={isFinished}
        hasScore={hasScore}
        homeScore={match.home_score}
        awayScore={match.away_score}
      />

      {/* ── Pre-kickoff message ────────────────────────────────────── */}
      {!revealed && (
        <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 text-center">
          <p className="text-sm text-[#64748b]">
            Los pronósticos de los demás se revelarán cuando comience el partido.
          </p>
        </div>
      )}

      {revealed && (
        <>
          {/* ── Si el partido terminara ahora (live only) ─────────── */}
          {isLive && hasScore && liveRanking.length > 0 && (
            <section>
              <SectionHeader title="Si el partido terminara ahora…" />
              <LiveRankingCard ranking={liveRanking} currentUserId={user.id} />
            </section>
          )}

          {/* ── Distribución de pronósticos ───────────────────────── */}
          {distTotal > 0 && (
            <section>
              <SectionHeader title="Distribución de pronósticos" />
              <DistributionCard
                dist={dist}
                total={distTotal}
                pct={pct}
                homeName={match.home_team.name}
                awayName={match.away_team.name}
              />
            </section>
          )}

          {/* ── Marcadores más repetidos ──────────────────────────── */}
          {topScores.length > 0 && (
            <section>
              <SectionHeader title="Marcadores más populares" />
              <TopScoresCard topScores={topScores} total={distTotal} />
            </section>
          )}

          {/* ── Tabla de pronósticos ──────────────────────────────── */}
          {richPreds.length > 0 && (
            <section>
              <SectionHeader
                title={isLive ? "Pronósticos (simulado)" : "Tabla de pronósticos"}
              />
              <PredictionsTable
                preds={richPreds}
                currentUserId={user.id}
                isLive={isLive}
                isFinished={isFinished}
                hasScore={hasScore}
              />
            </section>
          )}

          {/* ── Comunidad ─────────────────────────────────────────── */}
          {insights.length > 0 && (
            <section>
              <SectionHeader title="Comunidad" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.map((ins, i) => (
                  <InsightCard key={i} insight={ins} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

    </div>
  );
}

// ── Insight computation ───────────────────────────────────────────────

type Insight =
  | { type: "popular";       score: string; count: number }
  | { type: "unanimous";     winner: string }
  | { type: "lone_believer"; name: string; team: string }
  | { type: "nobody_exact" }
  | { type: "nobody_right" };

function buildInsights(
  preds: MatchPredictionEntry[],
  rich:  (MatchPredictionEntry & { sim: ScoringResult })[],
  match: MatchWithTeams,
  isFinished: boolean
): Insight[] {
  if (preds.length < 2) return [];
  const insights: Insight[] = [];

  // Most popular score (≥ 2 people)
  const scoreMap = new Map<string, number>();
  for (const p of preds) {
    const k = `${p.pred_home}-${p.pred_away}`;
    scoreMap.set(k, (scoreMap.get(k) ?? 0) + 1);
  }
  const [[topScore, topCount]] = [...scoreMap.entries()].sort((a, b) => b[1] - a[1]);
  if (topCount >= 2) {
    insights.push({ type: "popular", score: topScore, count: topCount });
  }

  // All predictions for same winner/result
  const results = preds.map(p => Math.sign(p.pred_home - p.pred_away));
  const allSame  = results.every(r => r === results[0]);
  if (allSame) {
    const r0 = results[0];
    const winner =
      r0 >  0 ? match.home_team.name :
      r0 <  0 ? match.away_team.name :
      "el empate";
    insights.push({ type: "unanimous", winner });
  }

  // One lone believer (only when ≥ 3 predictions)
  if (!allSame && preds.length >= 3) {
    for (const r of [-1, 0, 1] as const) {
      const believers = preds.filter(p => Math.sign(p.pred_home - p.pred_away) === r);
      if (believers.length === 1) {
        const team =
          r > 0  ? match.home_team.name :
          r < 0  ? match.away_team.name :
          "el empate";
        insights.push({ type: "lone_believer", name: believers[0].display_name, team });
      }
    }
  }

  // Nobody predicted the exact score (finished)
  if (isFinished && match.home_score !== null) {
    const exactHits = rich.filter(p => p.sim.reason === "Marcador exacto");
    if (exactHits.length === 0) {
      insights.push({ type: "nobody_exact" });
    }
    const rightHits = rich.filter(p => p.sim.points > 0);
    if (rightHits.length === 0) {
      insights.push({ type: "nobody_right" });
    }
  }

  return insights;
}

// ── Section components ────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wide mb-3">
      {title}
    </h2>
  );
}

// ── Match header ──────────────────────────────────────────────────────

function MatchHeader({ match }: { match: MatchWithTeams }) {
  const { home_team, away_team, status, stage, group_code } = match;
  const hasScore = match.home_score !== null && match.away_score !== null;
  const phaseLabel = PHASE_LABELS[stage as MatchStage];

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5">

      {/* Status + meta */}
      <div className="flex items-center justify-between mb-4">
        <StatusBadge status={status} />
        <div className="text-right">
          <p className="text-[10px] text-[#64748b]">{phaseLabel}</p>
          {group_code && (
            <p className="text-[10px] text-[#64748b]">Grupo {group_code}</p>
          )}
        </div>
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-4">
        <TeamDisplay team={home_team} side="home" />

        <div className="shrink-0 text-center min-w-[80px]">
          {status === "scheduled" ? (
            <p className="text-xs text-[#64748b] font-mono">
              {formatKickoff(match.starts_at)}
            </p>
          ) : hasScore ? (
            <p className={cn(
              "text-3xl font-black tabular-nums",
              status === "live" ? "text-[#ef4444] animate-live-pulse" : "text-[#f1f5f9]"
            )}>
              {match.home_score}
              <span className={cn(
                "mx-2 font-light",
                status === "live" ? "text-[#ef4444]/40" : "text-[#2a2a45]"
              )}>–</span>
              {match.away_score}
            </p>
          ) : (
            <p className="text-xl font-black text-[#2a2a45]">–</p>
          )}
        </div>

        <TeamDisplay team={away_team} side="away" />
      </div>

      {/* Kickoff for non-scheduled */}
      {status !== "scheduled" && (
        <p className="text-[10px] text-[#64748b] text-center mt-3">
          {formatKickoff(match.starts_at)}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/25">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ef4444]" />
        </span>
        <span className="text-xs font-black text-[#ef4444] uppercase tracking-wide">EN VIVO</span>
      </div>
    );
  }
  if (status === "finished") {
    return (
      <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest">
        FINALIZADO
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#00c85a]" />
      <span className="text-[10px] font-bold text-[#00c85a] uppercase tracking-widest">PROGRAMADO</span>
    </div>
  );
}

function TeamDisplay({
  team,
  side,
}: {
  team: { name: string; flag_emoji: string | null };
  side: "home" | "away";
}) {
  return (
    <div className={cn(
      "flex-1 flex flex-col items-center gap-1.5 min-w-0",
      side === "away" && "items-center"
    )}>
      <span className="text-4xl leading-none">{team.flag_emoji ?? "🏴"}</span>
      <span className="text-xs font-bold text-[#f1f5f9] text-center truncate w-full">
        {team.name}
      </span>
    </div>
  );
}

// ── Live ranking ──────────────────────────────────────────────────────

const MEDALS = ["🥇", "🥈", "🥉"] as const;

function LiveRankingCard({
  ranking,
  currentUserId,
}: {
  ranking: (MatchPredictionEntry & { sim: ScoringResult })[];
  currentUserId: string;
}) {
  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
      {ranking.map((entry, i) => {
        const isMe   = entry.user_id === currentUserId;
        const medal  = i < 3 ? MEDALS[i] : null;
        const pts    = entry.sim.points;
        const reason = entry.sim.reason;

        return (
          <div
            key={entry.user_id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 border-b border-[#1e1e35] last:border-b-0",
              isMe && "bg-[#00c85a]/[0.05]"
            )}
          >
            <div className="w-7 shrink-0 text-center">
              {medal ? (
                <span className="text-base leading-none">{medal}</span>
              ) : (
                <span className="text-xs font-mono text-[#64748b]">#{i + 1}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-bold truncate",
                isMe ? "text-[#00c85a]" : "text-[#f1f5f9]"
              )}>
                {entry.display_name}
                {isMe && <span className="text-[10px] text-[#00c85a]/60 font-mono ml-1.5">tú</span>}
              </p>
              <p className="text-[10px] text-[#64748b] font-mono">
                {entry.pred_home}–{entry.pred_away}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className={cn(
                "text-lg font-black tabular-nums",
                pts > 0 ? (reason === "Marcador exacto" ? "text-[#f59e0b]" : "text-[#00c85a]") : "text-[#2a2a45]"
              )}>
                {pts > 0 ? `+${pts}` : "0"}
              </p>
              <p className="text-[9px] text-[#64748b]">pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Distribution ──────────────────────────────────────────────────────

function DistributionCard({
  dist, total, pct, homeName, awayName,
}: {
  dist: { home: number; draw: number; away: number };
  total: number;
  pct: (n: number) => number;
  homeName: string;
  awayName: string;
}) {
  const bars = [
    { label: `🏠 ${homeName}`, count: dist.home, p: pct(dist.home), color: "bg-[#3b82f6]" },
    { label: "🤝 Empate",      count: dist.draw, p: pct(dist.draw), color: "bg-[#64748b]" },
    { label: `✈️ ${awayName}`, count: dist.away, p: pct(dist.away), color: "bg-[#8b5cf6]" },
  ];

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-5 space-y-3">
      {bars.map(({ label, count, p, color }) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#94a3b8]">{label}</span>
            <span className="text-xs font-bold text-[#f1f5f9] tabular-nums">
              {p}%
              <span className="text-[#64748b] font-normal ml-1">({count})</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1e1e35] overflow-hidden">
            <div
              className={cn("h-full rounded-full", color)}
              style={{ width: `${p}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-[10px] text-[#64748b] text-right">{total} pronóstico{total !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ── Top scores ────────────────────────────────────────────────────────

function TopScoresCard({ topScores, total }: { topScores: [string, number][]; total: number }) {
  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
      {topScores.map(([score, count], i) => (
        <div
          key={score}
          className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e35] last:border-b-0"
        >
          <span className="text-xs font-mono text-[#64748b] w-5 shrink-0">{i + 1}.</span>
          <span className="text-sm font-black font-mono text-[#f1f5f9] flex-1">{score}</span>
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-1.5 w-16 rounded-full bg-[#1e1e35] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#00c85a]/60"
                style={{ width: total > 0 ? `${Math.round((count / total) * 100)}%` : "0%" }}
              />
            </div>
            <span className="text-xs text-[#94a3b8] tabular-nums w-16 text-right">
              {count} persona{count !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Predictions table ─────────────────────────────────────────────────

function PredictionsTable({
  preds,
  currentUserId,
  isLive,
  isFinished,
  hasScore,
}: {
  preds: (MatchPredictionEntry & { sim: ScoringResult })[];
  currentUserId: string;
  isLive: boolean;
  isFinished: boolean;
  hasScore: boolean;
}) {
  const sorted = [...preds].sort((a, b) => b.sim.points - a.sim.points || a.display_name.localeCompare(b.display_name));

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2.5 border-b border-[#1e1e35]">
        <span className="text-[10px] text-[#64748b] uppercase tracking-widest">Jugador</span>
        <span className="text-[10px] text-[#64748b] uppercase tracking-widest text-center w-14">Pred</span>
        <span className="text-[10px] text-[#64748b] uppercase tracking-widest text-right w-14">Pts</span>
        <span className="text-[10px] text-[#64748b] uppercase tracking-widest text-right w-20">Resultado</span>
      </div>

      {sorted.map((entry) => {
        const isMe  = entry.user_id === currentUserId;
        const pts   = hasScore ? entry.sim.points : null;
        const rsn   = hasScore ? entry.sim.reason : null;

        const ptsColor =
          pts === null    ? "text-[#64748b]" :
          pts === 0       ? "text-[#ef4444]/70" :
          rsn === "Marcador exacto" ? "text-[#f59e0b]" :
          "text-[#00c85a]";

        const rsnLabel =
          rsn === "Marcador exacto"   ? "Exacto"  :
          rsn === "Resultado acertado"? "Ganador" :
          rsn === "Sin puntos"        ? (isFinished ? "—" : "×") :
          "—";

        return (
          <div
            key={entry.user_id}
            className={cn(
              "grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-4 py-3 border-b border-[#1e1e35] last:border-b-0",
              isMe && "bg-[#00c85a]/[0.04]"
            )}
          >
            <p className={cn(
              "text-sm font-semibold truncate",
              isMe ? "text-[#00c85a]" : "text-[#f1f5f9]"
            )}>
              {entry.display_name}
              {isMe && <span className="text-[10px] text-[#00c85a]/60 font-mono ml-1">tú</span>}
            </p>

            <span className="text-sm font-mono font-bold text-[#94a3b8] text-center w-14 tabular-nums">
              {entry.pred_home}–{entry.pred_away}
            </span>

            <span className={cn("text-sm font-black tabular-nums text-right w-14", ptsColor)}>
              {pts !== null ? (pts > 0 ? `+${pts}` : "0") : "—"}
            </span>

            <span className={cn(
              "text-[11px] font-mono text-right w-20 shrink-0",
              rsn === "Marcador exacto"    ? "text-[#f59e0b]" :
              rsn === "Resultado acertado" ? "text-[#00c85a]/80" :
              "text-[#64748b]"
            )}>
              {rsnLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Community insights ────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  let emoji = "💡";
  let title = "";
  let body  = "";

  switch (insight.type) {
    case "popular":
      emoji = "🏆";
      title = "Marcador favorito";
      body  = `${insight.score} (${insight.count} personas)`;
      break;
    case "unanimous":
      emoji = "🔥";
      title = "Todos de acuerdo";
      body  = `Todo el grupo apostó por ${insight.winner}`;
      break;
    case "lone_believer":
      emoji = "😱";
      title = "El único que creyó";
      body  = `${insight.name} fue el único que apostó por ${insight.team}`;
      break;
    case "nobody_exact":
      emoji = "⚡";
      title = "Nadie predijo el marcador exacto";
      body  = "Este resultado sorprendió a todos";
      break;
    case "nobody_right":
      emoji = "😬";
      title = "Nadie acertó";
      body  = "El grupo entero se fue a cero en este partido";
      break;
  }

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 leading-none mt-0.5">{emoji}</span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#94a3b8] mb-0.5">{title}</p>
          <p className="text-sm text-[#f1f5f9] leading-snug">{body}</p>
        </div>
      </div>
    </div>
  );
}
