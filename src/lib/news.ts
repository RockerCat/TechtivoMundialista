import type { MatchStage } from "@/lib/matches";
import { getTeamEditorialMeta } from "@/lib/editorial/teamMeta";

// ── Types ─────────────────────────────────────────────────────────────

export type NewsRow = {
  id:         string;
  match_id:   string;
  headline:   string;
  body:       string;
  image_type: NewsImageType;
  created_at: string;
};

export type LeaderboardSnapshotEntry = {
  display_name: string;
  total_points: number;
  rank:         number;
};

export type NewsContext = {
  match_id:     string;
  stage:        MatchStage;
  home_score:   number;
  away_score:   number;
  home_name:    string;
  home_code:    string;
  home_flag:    string;
  away_name:    string;
  away_code:    string;
  away_flag:    string;
  group_code:   string | null;
  match_number: number | null;
  venue:        string | null;
  total_preds:  number;
  exact_count:  number;
  winner_count: number;
  zero_count:   number;
  exact_names:  string[];
  winner_names: string[];
  leaderboard:  LeaderboardSnapshotEntry[];
  /** True only for Colombia's first chronological match in the tournament (by starts_at). */
  is_colombia_debut: boolean;
};

// ── Image types ───────────────────────────────────────────────────────
// Maps to static images in /public/editorial/.
// No external service involved — value is picked by selectImageType().

export type NewsImageType =
  | "home_win"
  | "away_win"
  | "draw"
  | "goal_fest"
  | "shutout"
  | "exacto_fest"
  | "all_lost"
  | "default";

// ── Stage labels used in news body ────────────────────────────────────

const STAGE_NEWS_LABEL: Record<MatchStage, string> = {
  group:         "fase de grupos",
  round_of_32:   "dieciseisavos de final",
  round_of_16:   "octavos de final",
  quarter_final: "cuartos de final",
  semi_final:    "semifinales",
  third_place:   "tercer puesto",
  final:         "Gran Final",
};

// ── selectImageType ───────────────────────────────────────────────────
// Pure function — picks the editorial image label from match context.
// Priority: special narrative > result direction.

export function selectImageType(ctx: NewsContext): NewsImageType {
  const { home_score, away_score, exact_count, total_preds, zero_count } = ctx;
  const totalGoals = home_score + away_score;

  // All participants missed completely
  if (total_preds > 0 && zero_count === total_preds) return "all_lost";

  // Three or more exact scores is headline news
  if (exact_count >= 3) return "exacto_fest";

  // High-scoring match (5+ goals total)
  if (totalGoals >= 5) return "goal_fest";

  // One side kept a clean sheet (and someone scored)
  if ((home_score === 0 || away_score === 0) && totalGoals > 0) return "shutout";

  // Result direction
  if (home_score > away_score) return "home_win";
  if (away_score > home_score) return "away_win";
  return "draw";
}

// ── buildHeadline ─────────────────────────────────────────────────────
// Returns a single concise headline. Keeps it under ~80 chars.

export function buildHeadline(ctx: NewsContext): string {
  const { home_flag, away_flag, home_name, away_name, home_score, away_score } = ctx;
  const score = `${home_score}–${away_score}`;
  const totalGoals = home_score + away_score;

  if (home_score === away_score) {
    if (totalGoals === 0) {
      return `${home_flag} Sin goles: ${home_name} ${score} ${away_name} ${away_flag}`;
    }
    return `${home_flag} Empate de película: ${home_name} ${score} ${away_name} ${away_flag}`;
  }

  const [winner, loser, winFlag, loseFlag, winScore, loseScore] =
    home_score > away_score
      ? [home_name, away_name, home_flag, away_flag, home_score, away_score]
      : [away_name, home_name, away_flag, home_flag, away_score, home_score];

  const diff = winScore - loseScore;

  if (loseScore === 0) {
    return `${winFlag} ${winner} deja en cero a ${loser} ${score} ${loseFlag}`;
  }
  if (diff >= 3) {
    return `${winFlag} Goleada: ${winner} aplasta a ${loser} ${score} ${loseFlag}`;
  }
  return `${winFlag} ${winner} vence a ${loser} ${score} ${loseFlag}`;
}

// ── buildResultNarrative ─────────────────────────────────────────────
// Returns a single narrative sentence describing the result, picking
// the most relevant storyline instead of a generic recap.
// Priority: Colombia debut win > defending champion > narrow win > draw > generic.

export function buildResultNarrative(ctx: NewsContext): string {
  const { home_name, away_name, home_score, away_score, home_code, away_code, is_colombia_debut } = ctx;
  const score = `${home_score}-${away_score}`;

  if (home_score === away_score) {
    return `⚽ ${home_name} y ${away_name} repartieron puntos en un duelo parejo: ${score}.`;
  }

  const homeWon = home_score > away_score;
  const winner      = homeWon ? home_name : away_name;
  const loser       = homeWon ? away_name : home_name;
  const winnerCode  = homeWon ? home_code : away_code;
  const winScore    = homeWon ? home_score : away_score;
  const loseScore   = homeWon ? away_score : home_score;
  const winnerScoreLabel = `${winScore}-${loseScore}`;

  if (is_colombia_debut && winnerCode === "COL") {
    return `⚽ Colombia comenzó con victoria su participación en el Mundial tras imponerse ${winnerScoreLabel} a ${loser}.`;
  }

  if (getTeamEditorialMeta(winnerCode)?.tags.includes("defending_champion")) {
    return `⚽ El campeón vigente hizo valer su jerarquía y venció ${winnerScoreLabel} a ${loser}.`;
  }

  if (winScore - loseScore === 1 && winScore <= 2) {
    return `⚽ ${winner} sufrió, pero ganó ${winnerScoreLabel} ante ${loser}.`;
  }

  return `⚽ ${winner} venció ${winnerScoreLabel} a ${loser}.`;
}

// ── buildBody ─────────────────────────────────────────────────────────
// Builds the news body as a block of plain text.
// Each logical section is separated by a blank line.
// No markdown — the UI renders it pre-wrapped.

export function buildBody(ctx: NewsContext): string {
  const {
    home_flag, away_flag, home_name, away_name, home_score, away_score,
    stage, group_code, total_preds, exact_count, winner_count, zero_count,
    exact_names, winner_names, leaderboard,
  } = ctx;

  const stageLabel = STAGE_NEWS_LABEL[stage] ?? stage;
  const groupLabel = group_code ? ` — Grupo ${group_code}` : "";
  const score      = `${home_score}–${away_score}`;
  const lines: string[] = [];

  // ── Partido ──────────────────────────────────────────────────────
  lines.push(
    `${home_flag} ${home_name} ${score} ${away_flag} ${away_name}`,
    `${capitalize(stageLabel)}${groupLabel}.`,
    "",
    buildResultNarrative(ctx),
  );

  // ── Pronósticos ──────────────────────────────────────────────────
  if (total_preds === 0) {
    lines.push("", "Nadie registró pronóstico para este partido.");
  } else {
    lines.push("", `${total_preds} pronóstico${total_preds !== 1 ? "s" : ""} registrado${total_preds !== 1 ? "s" : ""}.`);

    if (exact_count > 0) {
      const who = formatNames(exact_names, exact_count);
      lines.push(
        exact_count === 1
          ? `⚡ Marcador exacto: ${who}.`
          : `⚡ ${exact_count} marcadores exactos: ${who}.`
      );
    }

    if (winner_count > 0) {
      const who = formatNames(winner_names, winner_count);
      lines.push(
        winner_count === 1
          ? `✓ Resultado acertado: ${who}.`
          : `✓ ${winner_count} resultados acertados: ${who}.`
      );
    }

    if (zero_count > 0 && zero_count === total_preds) {
      lines.push("❌ Nadie acertó el resultado en esta ocasión.");
    } else if (zero_count > 0) {
      lines.push(`${zero_count} participante${zero_count !== 1 ? "s" : ""} sin puntos.`);
    }
  }

  // ── Liderato ──────────────────────────────────────────────────────
  if (leaderboard.length > 0) {
    // Leader tier = everyone at the lowest rank value present (ties
    // share a rank, so this can be more than one person).
    const leaderRank = Math.min(...leaderboard.map((e) => e.rank));
    const leaders    = leaderboard.filter((e) => e.rank === leaderRank);
    const leaderPts  = leaders[0].total_points;

    if (leaderPts === 0) {
      lines.push("", "🏆 La tabla aún no tiene puntos registrados.");
    } else if (leaders.length === 1) {
      const leader = leaders[0];
      lines.push("", `🏆 Líder: ${leader.display_name} con ${leaderPts} pt${leaderPts !== 1 ? "s" : ""}.`);

      // Chasers = everyone at the next distinct rank below the leader.
      // Using rank (not a fixed index) keeps ties together — if two or
      // more people share second place, all of them are included.
      const chaserRank = leaderboard
        .filter((e) => e.rank > leaderRank)
        .reduce<number | null>((min, e) => (min === null || e.rank < min ? e.rank : min), null);

      if (chaserRank !== null) {
        const chasers     = leaderboard.filter((e) => e.rank === chaserRank);
        const chaserNames = chasers.map((c) => c.display_name);
        const gap         = leaderPts - chasers[0].total_points;
        const ptsLabel    = `${gap} pt${gap !== 1 ? "s" : ""}`;

        if (chasers.length <= 3) {
          const verb = chasers.length === 1 ? "persigue" : "persiguen";
          lines.push(`${joinNames(chaserNames)} ${verb} a ${ptsLabel}.`);
        } else {
          lines.push(`${chasers.length} participantes persiguen a ${ptsLabel}: ${joinNames(chaserNames)}.`);
        }
      }
    } else {
      // Tied leadership — no chasers line, regardless of who else is below.
      const leaderNames = leaders.map((l) => l.display_name);
      const ptsLabel     = `${leaderPts} pt${leaderPts !== 1 ? "s" : ""}`;

      if (leaders.length <= 3) {
        lines.push("", `🏆 ${joinNames(leaderNames)} comparten el liderato con ${ptsLabel}.`);
      } else {
        lines.push("", `🏆 ${leaders.length} líderes comparten el liderato con ${ptsLabel}: ${joinNames(leaderNames)}.`);
      }
    }
  }

  return lines.join("\n");
}

// ── Helpers ───────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Returns "Nombre1, Nombre2 y 3 más" format. */
function formatNames(names: string[], totalCount: number): string {
  if (names.length === 0) return `${totalCount}`;
  const extra = totalCount - names.length;
  if (extra <= 0) return joinNames(names);
  return `${joinNames(names)} y ${extra} más`;
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  const last = names[names.length - 1];
  return names.slice(0, -1).join(", ") + " y " + last;
}
