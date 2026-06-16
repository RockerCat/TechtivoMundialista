import type { MatchStage } from "@/lib/matches";

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
    const leader = leaderboard[0];
    lines.push(
      "",
      leader.total_points > 0
        ? `🏆 Líder: ${leader.display_name} con ${leader.total_points} pt${leader.total_points !== 1 ? "s" : ""}.`
        : "🏆 La tabla aún no tiene puntos registrados."
    );

    if (leaderboard.length >= 2) {
      const second = leaderboard[1];
      const gap    = leader.total_points - second.total_points;
      if (gap > 0) {
        lines.push(`${second.display_name} persigue a ${gap} pt${gap !== 1 ? "s" : ""}.`);
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
