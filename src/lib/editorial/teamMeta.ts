// ── Editorial metadata per team ──────────────────────────────────────
// Static, hand-curated narrative tags used by the news generator to
// produce non-generic result sentences (see buildResultNarrative in
// src/lib/news.ts). Keyed by team `code` (matches teams.code).
//
// This is intentionally separate from the `teams` table: it's editorial
// opinion, not match data, and doesn't need a migration to change.

export type TeamEditorialTag =
  | "defending_champion" // campeón vigente del último Mundial
  | "historic_power"      // potencia histórica del fútbol mundial
  | "community_favorite"  // equipo seguido mayoritariamente por la comunidad
  | "host"                // selección anfitriona del torneo
  | "revelation";         // selección revelación / sorpresa del torneo

export type TeamEditorialMeta = {
  tags: TeamEditorialTag[];
  /** Optional reusable phrase for future narrative templates. */
  note?: string;
};

// Add/adjust entries here as the tournament narrative evolves —
// no code changes needed elsewhere, buildResultNarrative reads from this map.
export const TEAM_EDITORIAL_META: Record<string, TeamEditorialMeta> = {
  ARG: { tags: ["defending_champion"] },
  BRA: { tags: ["historic_power"] },
  COL: { tags: ["community_favorite"] },
  USA: { tags: ["host"] },
  MEX: { tags: ["host"] },
  CAN: { tags: ["host"] },
};

export function getTeamEditorialMeta(code: string | null | undefined): TeamEditorialMeta | null {
  if (!code) return null;
  return TEAM_EDITORIAL_META[code] ?? null;
}

export function teamHasTag(code: string | null | undefined, tag: TeamEditorialTag): boolean {
  return getTeamEditorialMeta(code)?.tags.includes(tag) ?? false;
}
