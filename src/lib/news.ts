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

// ── Narrative classification ─────────────────────────────────────────
// Classifies a finished match by score *magnitude* first. Clean sheet
// is a modifier layered on top — not its own category — so a 1-0 and
// a 6-0 no longer fall into the same bucket just because the loser
// didn't score.

export type ResultCategory =
  | "draw_no_goals"
  | "draw_with_goals"
  | "narrow_win"
  | "comfortable_win"
  | "rout"
  | "high_scoring";

export function classifyResultCategory(homeScore: number, awayScore: number): ResultCategory {
  const totalGoals = homeScore + awayScore;
  if (homeScore === awayScore) {
    return totalGoals === 0 ? "draw_no_goals" : "draw_with_goals";
  }
  const diff = Math.abs(homeScore - awayScore);
  if (diff >= 3) return "rout";
  if (totalGoals >= 5) return "high_scoring";
  return diff === 1 ? "narrow_win" : "comfortable_win";
}

/** Win categories split by clean-sheet modifier — the actual headline/body pool keys. */
type HeadlineCategoryKey =
  | "draw_no_goals"
  | "draw_with_goals"
  | "narrow_clean"
  | "narrow_open"
  | "comfortable_clean"
  | "comfortable_open"
  | "rout_clean"
  | "rout_open"
  | "high_scoring";

function resolveHeadlineCategory(homeScore: number, awayScore: number): HeadlineCategoryKey {
  const base = classifyResultCategory(homeScore, awayScore);
  if (base === "draw_no_goals" || base === "draw_with_goals" || base === "high_scoring") {
    return base;
  }
  const cleanSheet = homeScore === 0 || awayScore === 0;
  if (base === "narrow_win")      return cleanSheet ? "narrow_clean"      : "narrow_open";
  if (base === "comfortable_win") return cleanSheet ? "comfortable_clean" : "comfortable_open";
  return cleanSheet ? "rout_clean" : "rout_open"; // base === "rout"
}

/** Secondary storyline driven by pollita stats rather than the scoreline. */
export type PollitaAngle = "all_lost" | "nobody_exact" | "exact_feast" | "few_exact" | null;

export function classifyPollitaAngle(ctx: NewsContext): PollitaAngle {
  const { total_preds, exact_count, zero_count } = ctx;
  if (total_preds === 0) return null;
  if (zero_count === total_preds) return "all_lost";
  if (exact_count === 0) return "nobody_exact";
  if (exact_count >= 3) return "exact_feast";
  if (total_preds >= 10 && exact_count / total_preds <= 0.12) return "few_exact";
  return null;
}

// ── Deterministic template selection ──────────────────────────────────
// Same match always picks the same variant (idempotent regeneration),
// different matches spread across the pool because the seed mixes the
// match id with score/prediction facts that vary match to match.

function hashSeed(ctx: NewsContext): number {
  let h = 0;
  for (let i = 0; i < ctx.match_id.length; i++) {
    h = (h * 31 + ctx.match_id.charCodeAt(i)) | 0;
  }
  h ^= ctx.home_score * 131 + ctx.away_score * 257 + ctx.total_preds * 17 + ctx.exact_count * 41;
  return Math.abs(h);
}

function pick<T>(pool: readonly T[], seed: number, salt = 0): T {
  return pool[(seed + salt) % pool.length];
}

// ── Headline template pools ───────────────────────────────────────────
// (a, b) => sentence, without the score — the score is appended
// uniformly at the call site so every headline still shows it.

type Pair = (a: string, b: string) => string;

const HEADLINE_POOLS: Record<HeadlineCategoryKey, readonly Pair[]> = {
  draw_no_goals: [
    (a, b) => `Sin goles entre ${a} y ${b}`,
    (a, b) => `${a} y ${b} no se hicieron daño`,
    (a, b) => `Cero a cero entre ${a} y ${b}`,
    (a, b) => `${a} y ${b} empataron sin goles`,
    (a, b) => `Tablero en blanco para ${a} y ${b}`,
    (a, b) => `Ni ${a} ni ${b} encontraron el arco rival`,
    (a, b) => `${a} y ${b} se neutralizaron por completo`,
    (a, b) => `Paridad total entre ${a} y ${b}`,
  ],
  draw_with_goals: [
    (a, b) => `Empate de película entre ${a} y ${b}`,
    (a, b) => `${a} y ${b} repartieron puntos`,
    (a, b) => `Punto para cada uno: ${a} y ${b}`,
    (a, b) => `${a} y ${b} dejaron todo igual`,
    (a, b) => `Ninguno cedió entre ${a} y ${b}`,
    (a, b) => `${a} y ${b} se fueron parejos`,
    (a, b) => `Reparto de puntos entre ${a} y ${b}`,
    (a, b) => `${a} y ${b} firmaron un duelo sin vencedores`,
    (a, b) => `${a} y ${b} sellaron tablas`,
    (a, b) => `Empate sin ganadores entre ${a} y ${b}`,
  ],
  narrow_clean: [
    (a, b) => `${a} sufre, pero se lleva los tres puntos ante ${b}`,
    (a, b) => `${a} resuelve por la mínima ante ${b}`,
    (a, b) => `${a} golpea una vez y le alcanza para vencer a ${b}`,
    (a, b) => `${a} encuentra el gol justo para superar a ${b}`,
    (a, b) => `Un gol bastó para que ${a} superara a ${b}`,
    (a, b) => `${a} se queda con un partido cerrado ante ${b}`,
    (a, b) => `${a} gana ajustado y deja en cero a ${b}`,
    (a, b) => `${b} no pudo descontar y cayó ante ${a}`,
    (a, b) => `${a} suma de a tres en un partido trabado ante ${b}`,
    (a, b) => `${a} aguanta el resultado y vence a ${b}`,
  ],
  narrow_open: [
    (a, b) => `${a} se impone en un partido reñido ante ${b}`,
    (a, b) => `${a} sale adelante por la mínima diferencia ante ${b}`,
    (a, b) => `${b} apretó, pero ${a} se quedó con el triunfo`,
    (a, b) => `${a} resiste el empuje de ${b} y se lleva el triunfo`,
    (a, b) => `Triunfo ajustado de ${a} sobre ${b}`,
    (a, b) => `${a} se lleva un partido cerrado ante ${b}`,
    (a, b) => `${b} vendió cara la derrota ante ${a}`,
    (a, b) => `${a} gana en un duelo de pocos márgenes ante ${b}`,
  ],
  comfortable_clean: [
    (a, b) => `${a} controla de principio a fin y vence a ${b}`,
    (a, b) => `${a} domina y deja en cero a ${b}`,
    (a, b) => `${a} se impone con autoridad ante ${b}`,
    (a, b) => `${a} maneja el partido y gana sin sobresaltos ante ${b}`,
    (a, b) => `${a} resuelve cómodo frente a ${b}`,
    (a, b) => `${b} no encontró respuestas ante ${a}`,
    (a, b) => `${a} fue superior a ${b} y se quedó con los tres puntos`,
    (a, b) => `Victoria sólida de ${a} ante ${b}`,
    (a, b) => `${a} no dejó dudas en su triunfo ante ${b}`,
    (a, b) => `${a} cerró el arco y ganó con comodidad ante ${b}`,
  ],
  comfortable_open: [
    (a, b) => `${a} se impone con claridad ante ${b}`,
    (a, b) => `${a} fue más y se llevó el triunfo ante ${b}`,
    (a, b) => `${a} marcó diferencia frente a ${b}`,
    (a, b) => `Triunfo cómodo de ${a} sobre ${b}`,
    (a, b) => `${a} no tuvo grandes problemas ante ${b}`,
    (a, b) => `${b} no alcanzó a igualar el ritmo de ${a}`,
    (a, b) => `${a} se quedó con un partido controlado ante ${b}`,
    (a, b) => `${a} sacó ventaja y se llevó los tres puntos ante ${b}`,
  ],
  rout_clean: [
    (a, b) => `Festival de ${a} ante ${b}`,
    (a, b) => `${a} firma una goleada contundente ante ${b}`,
    (a, b) => `${a} no tuvo piedad y aplastó a ${b}`,
    (a, b) => `Golpe de autoridad: ${a} arrasa con ${b}`,
    (a, b) => `${a} resuelve con autoridad frente a ${b}`,
    (a, b) => `Lluvia de goles de ${a} sobre ${b}`,
    (a, b) => `${b} no tuvo respuesta ante el dominio de ${a}`,
    (a, b) => `${a} pasó por encima de ${b}`,
    (a, b) => `Goleada sin atenuantes de ${a} sobre ${b}`,
    (a, b) => `${a} dio una paliza y dejó en cero a ${b}`,
  ],
  rout_open: [
    (a, b) => `${a} se impone en un partido de muchos goles ante ${b}`,
    (a, b) => `Goleada de ${a} sobre ${b}`,
    (a, b) => `${a} marcó diferencia clara ante ${b}`,
    (a, b) => `${a} ganó con autoridad ante ${b}`,
    (a, b) => `Triunfo amplio de ${a} sobre ${b}`,
    (a, b) => `${a} fue netamente superior a ${b}`,
    (a, b) => `${b} no pudo seguirle el paso a ${a}`,
    (a, b) => `${a} dominó de punta a punta ante ${b}`,
  ],
  high_scoring: [
    (a, b) => `Partidazo de goles entre ${a} y ${b}`,
    (a, b) => `${a} se llevó un partido de ida y vuelta ante ${b}`,
    (a, b) => `Festival ofensivo entre ${a} y ${b}`,
    (a, b) => `${a} y ${b} regalaron un partido cargado de goles`,
    (a, b) => `${a} resolvió un duelo de toma y dame ante ${b}`,
    (a, b) => `Goles para todos, pero el triunfo fue de ${a} ante ${b}`,
    (a, b) => `${a} ganó un partido vibrante ante ${b}`,
    (a, b) => `Emoción asegurada entre ${a} y ${b}, con triunfo para ${a}`,
  ],
};

// ── Pollita-angle headline pools ──────────────────────────────────────
// Used when the prediction stats are more newsworthy than the score
// itself (exact_feast / all_lost), or when the score-based headline
// category has just been used too many times in a row.

type PollitaTemplate = (ctx: NewsContext, score: string) => string;

const POLLITA_HEADLINE_POOLS: Record<Exclude<PollitaAngle, null>, readonly PollitaTemplate[]> = {
  exact_feast: [
    (ctx, score) => `${ctx.exact_count} hinchas le pegaron al marcador exacto en ${ctx.home_name} ${score} ${ctx.away_name}`,
    (ctx, score) => `Lluvia de exactos en ${ctx.home_name} ${score} ${ctx.away_name}`,
    (ctx, score) => `${ctx.exact_count} participantes clavaron el ${score} entre ${ctx.home_name} y ${ctx.away_name}`,
    (ctx, score) => `El ${score} entre ${ctx.home_name} y ${ctx.away_name} tuvo ${ctx.exact_count} adivinos en la pollita`,
    (ctx, score) => `Casi nadie se equivocó: ${ctx.exact_count} exactos en ${ctx.home_name} ${score} ${ctx.away_name}`,
    (ctx, score) => `${ctx.exact_count} jugadores de la pollita vieron venir el ${score}`,
    (ctx, score) => `Pollita en su mejor versión: ${ctx.exact_count} exactos con el ${score}`,
    (ctx, score) => `${ctx.home_name} ${score} ${ctx.away_name} dejó ${ctx.exact_count} ganadores de pleno`,
  ],
  all_lost: [
    (ctx, score) => `Nadie en la pollita vio venir el ${ctx.home_name} ${score} ${ctx.away_name}`,
    (ctx, score) => `El ${score} de ${ctx.home_name} y ${ctx.away_name} dejó a todos sin puntos`,
    (_ctx, score) => `Sorpresa total: ningún pronóstico sobrevivió al ${score}`,
    (ctx, score) => `${ctx.home_name} ${score} ${ctx.away_name} fue una trampa para toda la pollita`,
    (ctx, score) => `Cero aciertos en ${ctx.home_name} ${score} ${ctx.away_name}`,
    (ctx, score) => `Nadie acertó nada en ${ctx.home_name} ${score} ${ctx.away_name}`,
  ],
  nobody_exact: [
    (ctx, score) => `El marcador exacto de ${ctx.home_name} ${score} ${ctx.away_name} no tuvo dueño`,
    (ctx, score) => `Nadie clavó el ${score} entre ${ctx.home_name} y ${ctx.away_name}`,
    (ctx, score) => `El exacto se les escapó a todos en ${ctx.home_name} ${score} ${ctx.away_name}`,
    (ctx, score) => `${ctx.home_name} ${score} ${ctx.away_name}: ni uno acertó el resultado preciso`,
    (_ctx, score) => `El ${score} fue esquivo para los pronósticos exactos`,
    (_ctx, score) => `Nadie en la pollita dio en el clavo con el ${score}`,
  ],
  few_exact: [
    (ctx, score) => `Pocos vieron venir el ${score}: solo ${ctx.exact_count} de ${ctx.total_preds} acertó de lleno`,
    (ctx, score) => `El ${score} tuvo dueños contados: ${ctx.exact_count} exactos entre ${ctx.total_preds} pronósticos`,
    () => `El marcador exacto tuvo pocos dueños en la pollita`,
    (ctx, score) => `Apenas ${ctx.exact_count} de ${ctx.total_preds} clavaron el ${score}`,
    (ctx, score) => `${ctx.exact_count} privilegiados acertaron el ${score} exacto`,
    (_ctx, score) => `El ${score} exacto fue un club exclusivo en la pollita`,
  ],
};

// ── buildHeadline ─────────────────────────────────────────────────────
// Returns a single concise headline. Keeps it under ~80 chars.
//
// opts.preferPollitaAngle lets the caller nudge away from the score-based
// pool (e.g. when the same result category has shown up in the last few
// news posts) towards a prediction-stats-driven headline instead.

export function buildHeadline(
  ctx: NewsContext,
  opts: { preferPollitaAngle?: boolean } = {},
): string {
  const { home_flag, away_flag, home_name, away_name, home_score, away_score } = ctx;
  const score = `${home_score}–${away_score}`;
  const seed  = hashSeed(ctx);

  const angle = classifyPollitaAngle(ctx);
  const useAngle =
    angle === "exact_feast" || angle === "all_lost" || (!!angle && !!opts.preferPollitaAngle);

  if (angle && useAngle) {
    const template = pick(POLLITA_HEADLINE_POOLS[angle], seed, 5);
    return `${home_flag} ${template(ctx, score)} ${away_flag}`;
  }

  if (home_score === away_score) {
    const category = home_score + away_score === 0 ? "draw_no_goals" : "draw_with_goals";
    const sentence  = pick(HEADLINE_POOLS[category], seed)(home_name, away_name);
    return `${home_flag} ${sentence} ${score} ${away_flag}`;
  }

  const homeWon  = home_score > away_score;
  const winner   = homeWon ? home_name : away_name;
  const loser    = homeWon ? away_name : home_name;
  const winFlag  = homeWon ? home_flag : away_flag;
  const loseFlag = homeWon ? away_flag : home_flag;

  const category = resolveHeadlineCategory(home_score, away_score);
  const sentence = pick(HEADLINE_POOLS[category], seed)(winner, loser);
  return `${winFlag} ${sentence} ${score} ${loseFlag}`;
}

// ── Body narrative pools ──────────────────────────────────────────────
// (a, b, scoreLabel) => sentence, prefixed with the ⚽ emoji already
// used by the previous single-template version.

type BodyTemplate = (a: string, b: string, score: string) => string;

const BODY_NARRATIVE_POOLS: Record<HeadlineCategoryKey, readonly BodyTemplate[]> = {
  draw_no_goals: [
    (a, b, score) => `⚽ ${a} y ${b} no se movieron del cero: ${score}.`,
    (a, b, score) => `⚽ Ninguno encontró el arco en el ${score} entre ${a} y ${b}.`,
    (a, b, score) => `⚽ ${a} y ${b} se neutralizaron por completo, ${score}.`,
    (a, b) => `⚽ Partido sin goles entre ${a} y ${b}.`,
    (a, b) => `⚽ ${a} y ${b} repartieron puntos sin inquietar los arcos.`,
    (a, b, score) => `⚽ Cero emociones en el marcador: ${a} ${score} ${b}.`,
  ],
  draw_with_goals: [
    (a, b, score) => `⚽ ${a} y ${b} repartieron puntos en un duelo parejo: ${score}.`,
    (a, b, score) => `⚽ Empate justo entre ${a} y ${b}, ${score}.`,
    (a, b, score) => `⚽ ${a} y ${b} se fueron sin sacarse ventaja, ${score}.`,
    (a, b, score) => `⚽ Ninguno cedió: ${a} y ${b} terminaron ${score}.`,
    (a, b, score) => `⚽ ${a} y ${b} firmaron tablas con un ${score} para el recuerdo.`,
    (a, b, score) => `⚽ Reparto de puntos entre ${a} y ${b}, ${score}.`,
  ],
  narrow_clean: [
    (a, b, score) => `⚽ ${a} sufrió, pero ganó ${score} ante ${b}.`,
    (a, b, score) => `⚽ ${a} resolvió por la mínima frente a ${b}, ${score}.`,
    (a, b, score) => `⚽ Un partido cerrado terminó ${score} a favor de ${a}.`,
    (a, b, score) => `⚽ ${b} vendió cara la derrota ante ${a}, que ganó ${score}.`,
    (a, b, score) => `⚽ ${a} aguantó el resultado y se quedó con los tres puntos, ${score}.`,
    (a, b, score) => `⚽ ${a} encontró el gol justo para superar a ${b}, ${score}.`,
  ],
  narrow_open: [
    (a, b, score) => `⚽ ${a} se impuso ajustado ${score} a ${b}.`,
    (a, b, score) => `⚽ ${a} resistió el empuje de ${b} y ganó ${score}.`,
    (a, b, score) => `⚽ Triunfo apretado de ${a} sobre ${b}, ${score}.`,
    (a, b, score) => `⚽ ${b} apretó hasta el final, pero ${a} se llevó el triunfo ${score}.`,
    (a, b, score) => `⚽ ${a} se quedó con un partido de pocos márgenes, ${score}.`,
    (a, b, score) => `⚽ ${a} venció ${score} en un duelo reñido ante ${b}.`,
  ],
  comfortable_clean: [
    (a, b, score) => `⚽ ${a} controló de principio a fin y venció ${score} a ${b}.`,
    (a, b, score) => `⚽ ${a} dominó sin sobresaltos y ganó ${score} a ${b}.`,
    (a, b, score) => `⚽ ${b} no encontró respuestas ante ${a}, que ganó ${score}.`,
    (a, b, score) => `⚽ ${a} manejó el partido y se quedó con el triunfo, ${score}.`,
    (a, b, score) => `⚽ Victoria sólida de ${a} sobre ${b}, ${score}.`,
    (a, b, score) => `⚽ ${a} cerró el arco y ganó con comodidad, ${score}.`,
  ],
  comfortable_open: [
    (a, b, score) => `⚽ ${a} se impuso con claridad, ${score} a ${b}.`,
    (a, b, score) => `⚽ ${a} marcó diferencia y ganó ${score} a ${b}.`,
    (a, b, score) => `⚽ Triunfo cómodo de ${a} sobre ${b}, ${score}.`,
    (a, b, score) => `⚽ ${b} no alcanzó el ritmo de ${a}, que ganó ${score}.`,
    (a, b, score) => `⚽ ${a} controló el partido y se llevó los tres puntos, ${score}.`,
    (a, b, score) => `⚽ ${a} sacó ventaja clara y venció ${score} a ${b}.`,
  ],
  rout_clean: [
    (a, b, score) => `⚽ ${a} resolvió con autoridad y goleó ${score} a ${b}.`,
    (a, b, score) => `⚽ Festival de ${a}, que aplastó ${score} a ${b}.`,
    (a, b, score) => `⚽ ${a} no tuvo piedad y goleó a ${b}, ${score}.`,
    (a, b, score) => `⚽ ${b} no tuvo respuesta ante el dominio de ${a}, ${score}.`,
    (a, b, score) => `⚽ Goleada contundente de ${a} sobre ${b}, ${score}.`,
    (a, b, score) => `⚽ ${a} pasó por encima de ${b} con un categórico ${score}.`,
  ],
  rout_open: [
    (a, b, score) => `⚽ ${a} goleó ${score} a ${b} en un partido de muchos goles.`,
    (a, b, score) => `⚽ Triunfo amplio de ${a} sobre ${b}, ${score}.`,
    (a, b, score) => `⚽ ${a} fue netamente superior y ganó ${score} a ${b}.`,
    (a, b, score) => `⚽ ${b} no pudo seguirle el paso a ${a}, que ganó ${score}.`,
    (a, b, score) => `⚽ ${a} dominó de punta a punta y se llevó un ${score}.`,
    (a, b, score) => `⚽ Goleada de ${a} sobre ${b}, ${score}.`,
  ],
  high_scoring: [
    (a, b, score) => `⚽ Partidazo de goles: ${a} se quedó con el triunfo ${score} ante ${b}.`,
    (a, b, score) => `⚽ ${a} ganó un duelo de ida y vuelta, ${score}, ante ${b}.`,
    (a, b, score) => `⚽ Festival ofensivo con triunfo de ${a}, ${score}, sobre ${b}.`,
    (a, b, score) => `⚽ ${a} y ${b} regalaron goles; el triunfo fue de ${a}, ${score}.`,
    (a, b, score) => `⚽ ${a} resolvió un duelo vibrante ante ${b}, ${score}.`,
    (a, b, score) => `⚽ Emoción asegurada: ${a} se llevó el ${score} ante ${b}.`,
  ],
};

// ── buildResultNarrative ─────────────────────────────────────────────
// Returns a single narrative sentence describing the result, picking
// the most relevant storyline instead of a generic recap.
// Priority: Colombia debut win > defending champion > category pool.

export function buildResultNarrative(ctx: NewsContext): string {
  const { home_name, away_name, home_score, away_score, home_code, away_code, is_colombia_debut } = ctx;
  const seed = hashSeed(ctx);

  if (home_score === away_score) {
    const score    = `${home_score}-${away_score}`;
    const category = home_score + away_score === 0 ? "draw_no_goals" : "draw_with_goals";
    return pick(BODY_NARRATIVE_POOLS[category], seed, 7)(home_name, away_name, score);
  }

  const homeWon          = home_score > away_score;
  const winner           = homeWon ? home_name : away_name;
  const loser            = homeWon ? away_name : home_name;
  const winnerCode       = homeWon ? home_code : away_code;
  const winScore         = homeWon ? home_score : away_score;
  const loseScore        = homeWon ? away_score : home_score;
  const winnerScoreLabel = `${winScore}-${loseScore}`;

  if (is_colombia_debut && winnerCode === "COL") {
    return `⚽ Colombia comenzó con victoria su participación en el Mundial tras imponerse ${winnerScoreLabel} a ${loser}.`;
  }

  if (getTeamEditorialMeta(winnerCode)?.tags.includes("defending_champion")) {
    return `⚽ El campeón vigente hizo valer su jerarquía y venció ${winnerScoreLabel} a ${loser}.`;
  }

  const category = resolveHeadlineCategory(home_score, away_score);
  return pick(BODY_NARRATIVE_POOLS[category], seed, 7)(winner, loser, winnerScoreLabel);
}

// ── buildBody ─────────────────────────────────────────────────────────
// Builds the news body as a block of plain text.
// Each logical section is separated by a blank line.
// No markdown — the UI renders it pre-wrapped.

export function buildBody(ctx: NewsContext): string {
  const {
    stage, group_code, total_preds, exact_count, winner_count, zero_count,
    exact_names, winner_names, leaderboard,
  } = ctx;

  const stageLabel = STAGE_NEWS_LABEL[stage] ?? stage;
  const groupLabel = group_code ? ` — Grupo ${group_code}` : "";
  const lines: string[] = [];

  // ── Partido ──────────────────────────────────────────────────────
  // Score is omitted here — it's already in the headline and rendered
  // separately in the detail view's match header.
  lines.push(
    `🏟️ ${capitalize(stageLabel)}${groupLabel}.`,
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
