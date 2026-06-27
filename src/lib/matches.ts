import type { ClassificationMatch } from "./classification";
import { computeGroupStandings, computeBestThirds } from "./classification";
import { projectKnockoutBracket } from "./bracket";

// ── Domain types ──────────────────────────────────────────────────────

export type Team = {
  id: string;
  name: string;
  code: string;
  flag_emoji: string | null;
};

export type MatchStatus = "scheduled" | "live" | "finished";
export type MatchStage =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export type Match = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  match_number: number | null;
  starts_at: string;
  stage: MatchStage;
  group_code: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  venue: string | null;
  // Which team advanced via penalty shootout — for bracket/display only.
  // NEVER used by scoring functions; scoring only reads home_score/away_score.
  advancing_team_id: string | null;
  created_at: string;
  home_team: Team | null;
  away_team: Team | null;
};

export type Prediction = {
  id: string;
  match_id: string;
  user_id: string;
  home_score: number;
  away_score: number;
  points: number;
  points_reason: string | null;
  scored_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchWithPrediction = Match & {
  prediction: Prediction | null;
};

// ── Action result ─────────────────────────────────────────────────────

export type PredictionActionResult =
  | { error: string; devMessage?: string }
  | { success: true; prediction: Prediction };

export type PredictionActionState = PredictionActionResult | null;

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Returns the reason predictions are closed, or null if the window is open.
 * Two possible reasons mirror the backend RPC exceptions:
 *   "match_not_scheduled" — status is not 'scheduled' (admin set live/finished)
 *   "match_started"       — kickoff time has already passed
 * Frontend uses this for UX labels; the real enforcement lives in the RPC.
 */
export function matchClosedReason(
  match: Pick<Match, "starts_at" | "status">
): "match_not_scheduled" | "match_started" | null {
  if (match.status !== "scheduled") return "match_not_scheduled";
  if (Date.now() >= new Date(match.starts_at).getTime()) return "match_started";
  return null;
}

/** True if the prediction window is still open. Mirrors backend cutoff exactly. */
export function isMatchOpen(match: Pick<Match, "starts_at" | "status">): boolean {
  return matchClosedReason(match) === null;
}

export function matchTeamName(team: Team | null, placeholder: string | null): string {
  return team?.name ?? placeholder ?? "Por definir";
}
export function matchTeamCode(team: Team | null, placeholder: string | null): string {
  return team?.code ?? placeholder ?? "TBD";
}
export function matchTeamFlag(team: Team | null): string {
  return team?.flag_emoji ?? "🏳️";
}

/** Human-readable date/time label for a match. */
export function formatKickoff(startsAt: string): string {
  const date = new Date(startsAt);

  const time = date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });

  // Compare dates in Bogota timezone — same logic used by CalendarView's colombiaDateKey.
  // Using server local time (.getDate() etc.) would silently use UTC on Vercel and
  // shift matches near midnight into the wrong day.
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });  // "YYYY-MM-DD"
  const matchStr = date.toLocaleDateString("en-CA", { timeZone: "America/Bogota" }); // "YYYY-MM-DD"

  // Anchor both dates at noon UTC so the day diff is always a whole number.
  const diffDays = Math.round(
    (new Date(matchStr + "T12:00:00Z").getTime() - new Date(todayStr + "T12:00:00Z").getTime())
    / 86_400_000
  );

  if (diffDays === -1) return `Ayer · ${time}`;
  if (diffDays === 0)  return `Hoy · ${time}`;
  if (diffDays === 1)  return `Mañana · ${time}`;

  return date.toLocaleDateString("es-CO", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
    timeZone: "America/Bogota",
  }) + ` · ${time}`;
}

export type ScoringResult = {
  points: number;
  reason: "Marcador exacto" | "Resultado acertado" | "Sin puntos";
};

/** Compute what points a prediction earns against a known final score. */
export function simulatePoints(
  predHome: number, predAway: number,
  actualHome: number, actualAway: number,
  stage: MatchStage
): ScoringResult {
  const { exact, result } = PHASE_SCORING[stage];
  if (predHome === actualHome && predAway === actualAway) {
    return { points: exact, reason: "Marcador exacto" };
  }
  const predResult   = Math.sign(predHome - predAway);
  const actualResult = Math.sign(actualHome - actualAway);
  if (predResult === actualResult) {
    return { points: result, reason: "Resultado acertado" };
  }
  return { points: 0, reason: "Sin puntos" };
}

/** Compact "19 Jun, 06:25 a. m." label for prediction timestamps. */
export function formatPredictionTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  const day  = date.toLocaleDateString("es-CO", {
    day:   "numeric",
    month: "short",
    timeZone: "America/Bogota",
  }).replace(" de ", " ");
  const time = date.toLocaleTimeString("es-CO", {
    hour:   "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  });
  return `${day}, ${time}`;
}

/** Day bucket key used for grouping matches in the dashboard. */
export function matchDayKey(startsAt: string): string {
  const date = new Date(startsAt);
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    timeZone: "America/Bogota",
  });
}

export const STAGE_LABELS: Record<MatchStage, string> = {
  group:         "Fase de grupos",
  round_of_32:   "Dieciseisavos de final",
  round_of_16:   "Octavos de final",
  quarter_final: "Cuartos de final",
  semi_final:    "Semifinal",
  third_place:   "Tercer puesto",
  final:         "Final",
};

// ── Simplified phase names used in scoring / rules UI ─────────────────

export const PHASE_LABELS: Record<MatchStage, string> = {
  group:         "Fase 1",
  round_of_32:   "Fase 2",
  round_of_16:   "Fase 3",
  quarter_final: "Fase 4",
  semi_final:    "Semifinal",
  third_place:   "Semifinal",
  final:         "Final",
};

// ── Short labels for tabs (dashboard phase selector) ──────────────────

export const STAGE_SHORT_LABELS: Record<MatchStage, string> = {
  group:         "Grupos",
  round_of_32:   "Dieciseisavos",
  round_of_16:   "Octavos",
  quarter_final: "Cuartos",
  semi_final:    "Semifinal",
  third_place:   "3er puesto",
  final:         "Final",
};

// ── Scoring table rows — single source of truth for rules + drawer ────

export const SCORING_TABLE_ROWS: { stage: MatchStage; label: string }[] = [
  { stage: "group",         label: "Fase 1 — Grupos"         },
  { stage: "round_of_32",   label: "Fase 2 — Dieciseisavos"  },
  { stage: "round_of_16",   label: "Fase 3 — Octavos"        },
  { stage: "quarter_final", label: "Fase 4 — Cuartos"        },
  { stage: "semi_final",    label: "Semifinal"                },
  { stage: "final",         label: "Final"                    },
];

// ── Phase equivalency rows — single source of truth for rules page ────

export const PHASE_EQUIV_ROWS: { phase: string; desc: string }[] = [
  { phase: "Fase 1",    desc: "Fase de grupos"   },
  { phase: "Fase 2",    desc: "Dieciseisavos"    },
  { phase: "Fase 3",    desc: "Octavos de final" },
  { phase: "Fase 4",    desc: "Cuartos de final" },
  { phase: "Semifinal", desc: "Semifinal"        },
  { phase: "Final",     desc: "Final"            },
];

export type ScoringRule = { exact: number; result: number };

export const PHASE_SCORING: Record<MatchStage, ScoringRule> = {
  group:         { exact: 3, result: 1 },
  round_of_32:   { exact: 4, result: 2 },
  round_of_16:   { exact: 5, result: 3 },
  quarter_final: { exact: 6, result: 4 },
  semi_final:    { exact: 7, result: 5 },
  third_place:   { exact: 7, result: 5 },
  final:         { exact: 8, result: 6 },
};

/** Returns the stage of the current active phase (first non-finished match). */
export function detectCurrentStage(
  matches: Pick<Match, "stage" | "status">[]
): MatchStage {
  const live = matches.find((m) => m.status === "live");
  if (live) return live.stage;
  const scheduled = matches.find((m) => m.status === "scheduled");
  if (scheduled) return scheduled.stage;
  // All matches finished — use the last known stage
  return matches[matches.length - 1]?.stage ?? "group";
}

/**
 * Resolves knockout match placeholders using bracket projection (same logic as Copa).
 * Matches whose home_team/away_team are already set in the DB are never overwritten.
 * Group-stage matches pass through unchanged.
 */
export function resolveKnockoutTeams(
  matches: MatchWithPrediction[]
): MatchWithPrediction[] {
  const hasUnresolved = matches.some(
    (m) => m.stage !== "group" && (m.home_team === null || m.away_team === null)
  );
  if (!hasUnresolved) return matches;

  const groupClassificationMatches: ClassificationMatch[] = matches
    .filter((m) => m.stage === "group")
    .map((m) => ({
      group_code: m.group_code,
      home_score: m.home_score,
      away_score: m.away_score,
      status: m.status,
      home_team: m.home_team,
      away_team: m.away_team,
    }));

  const groups     = computeGroupStandings(groupClassificationMatches);
  const bestThirds = computeBestThirds(groups);

  const byStage = (stage: MatchStage) =>
    matches.filter((m) => m.stage === stage) as unknown as import("./classification").KnockoutPreviewMatch[];

  const projected = projectKnockoutBracket({
    groups,
    bestThirds,
    roundOf32:     byStage("round_of_32"),
    roundOf16:     byStage("round_of_16"),
    quarterFinals: byStage("quarter_final"),
    semiFinals:    byStage("semi_final"),
    thirdPlace:    byStage("third_place"),
    finals:        byStage("final"),
  });

  const resolvedMap = new Map<string, { home_team: Team | null; away_team: Team | null }>();
  for (const stage of [
    projected.roundOf32,
    projected.roundOf16,
    projected.quarterFinals,
    projected.semiFinals,
    projected.thirdPlace,
    projected.finals,
  ]) {
    for (const m of stage) {
      resolvedMap.set(m.id, {
        home_team: m.home_team as Team | null,
        away_team: m.away_team as Team | null,
      });
    }
  }

  return matches.map((m) => {
    const resolved = resolvedMap.get(m.id);
    if (!resolved) return m;
    return {
      ...m,
      home_team: m.home_team ?? resolved.home_team,
      away_team: m.away_team ?? resolved.away_team,
    };
  });
}
