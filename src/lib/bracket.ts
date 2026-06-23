// ── Knockout bracket projection ──────────────────────────────────────────
//
// Pure, read-only enrichment layer on top of src/lib/classification.ts.
// It does NOT compute standings itself (computeGroupStandings /
// computeBestThirds remain the single source of truth) — it only resolves
// the placeholder text already stored on each knockout match
// ("Winner Group A", "Best 3rd (A/B/C/D/F)", "Winner M73", ...) into the
// team that currently occupies that bracket slot, for DISPLAY purposes.
//
// Nothing here is persisted: a match whose home_team/away_team are already
// set in the database (real, manually confirmed) is always left untouched —
// projection only fills in slots that are still null.

import { compareStandings } from "./classification";
import type {
  ClassificationTeam,
  GroupStanding,
  TeamStanding,
  KnockoutPreviewMatch,
} from "./classification";

export type BracketTeam = ClassificationTeam;

export type ProjectedKnockoutMatch = KnockoutPreviewMatch & {
  // True when home_team/away_team was filled in by this projection rather
  // than coming from a persisted, manually-confirmed value.
  home_team_projected: boolean;
  away_team_projected: boolean;
};

// FIFA World Cup 2026 format: 12 groups of 4, top 2 of each group advance
// automatically, plus the best 8 of the 12 third-placed teams. See
// CLAUDE.md "World Cup 2026 Structure" / computeBestThirds in
// classification.ts.
const BEST_THIRDS_QUALIFYING_COUNT = 8;

// ── Placeholder grammar ──────────────────────────────────────────────────
// Matches the exact strings seeded in
// supabase/migrations/035_knockout_fixtures.sql — that text IS the
// official FIFA bracket mapping for this tournament; we only parse it,
// never invent or hardcode a substitute mapping.

type ParsedPlaceholder =
  | { kind: "group_winner"; group: string }
  | { kind: "group_runner_up"; group: string }
  | { kind: "best_third"; candidateGroups: string[] }
  | { kind: "match_winner"; matchNumber: number }
  | { kind: "match_loser"; matchNumber: number }
  | { kind: "unresolvable" };

function parsePlaceholder(placeholder: string | null): ParsedPlaceholder {
  if (!placeholder) return { kind: "unresolvable" };

  let m = placeholder.match(/^Winner Group ([A-Z])$/);
  if (m) return { kind: "group_winner", group: m[1] };

  m = placeholder.match(/^Runner-up Group ([A-Z])$/);
  if (m) return { kind: "group_runner_up", group: m[1] };

  m = placeholder.match(/^Best 3rd \(([A-Z](?:\/[A-Z])+)\)$/);
  if (m) return { kind: "best_third", candidateGroups: m[1].split("/") };

  m = placeholder.match(/^Winner M(\d+)$/);
  if (m) return { kind: "match_winner", matchNumber: Number(m[1]) };

  m = placeholder.match(/^Loser M(\d+)$/);
  if (m) return { kind: "match_loser", matchNumber: Number(m[1]) };

  return { kind: "unresolvable" };
}

// ── Group-stage resolvers ─────────────────────────────────────────────

function resolveGroupWinner(group: string, groups: GroupStanding[]): BracketTeam | null {
  return groups.find((g) => g.group_code === group)?.teams[0]?.team ?? null;
}

function resolveGroupRunnerUp(group: string, groups: GroupStanding[]): BracketTeam | null {
  return groups.find((g) => g.group_code === group)?.teams[1]?.team ?? null;
}

// ── Best-third assignment ──────────────────────────────────────────────
//
// Each "Best 3rd (...)" slot lists a fixed set of candidate groups (taken
// verbatim from the official fixture table). Resolving slots one at a time
// — "exactly one candidate qualifies" — is too strict: most of the time
// SEVERAL of a slot's candidate groups are among the current top-8 thirds,
// and the real constraint is global, not per-slot: every qualifying third
// must be used in AT MOST ONE slot, and every slot must draw from a third
// whose group it actually lists. That is a bipartite-matching problem
// (qualifying thirds ←→ slots), not a per-slot lookup.
//
// We solve it with Kuhn's augmenting-path algorithm: thirds are tried in
// rank order (best first, exactly the order computeBestThirds produces),
// and slots are tried in the order they were given. Once a better-ranked
// third is matched to a slot, it stays matched (possibly reassigned to a
// different slot via an augmenting path) for the rest of the run — so a
// worse-ranked third can never "bump" a better-ranked one out of the
// matching. Iterating in this fixed order makes the result deterministic,
// and gives the maximum number of slots that CAN be resolved: a slot is
// left unmatched (kept as a placeholder) only when no valid assignment for
// it exists in this maximum matching, e.g. none of its candidate groups
// currently has a qualifying third, or every qualifying third in its
// candidate set is already required to fill some other slot.

export type BestThirdSlot = { id: string; candidateGroups: string[] };

export function resolveBestThirdAssignments({
  bestThirds,
  slots,
}: {
  bestThirds: TeamStanding[];
  slots: BestThirdSlot[];
}): Map<string, BracketTeam> {
  // Sort defensively rather than trusting the caller's array order — the
  // priority rule ("better-ranked thirds win") only holds if this is the
  // same FIFA ranking computeBestThirds produces.
  const qualifiers = [...bestThirds].sort(compareStandings).slice(0, BEST_THIRDS_QUALIFYING_COUNT);
  const slotToQualifier = new Map<string, number>(); // slot.id -> index into `qualifiers`

  function findSlot(qualifierIndex: number, visitedSlots: Set<string>): boolean {
    const group = qualifiers[qualifierIndex].group_code;
    for (const slot of slots) {
      if (visitedSlots.has(slot.id) || !slot.candidateGroups.includes(group)) continue;
      visitedSlots.add(slot.id);

      const occupant = slotToQualifier.get(slot.id);
      if (occupant === undefined || findSlot(occupant, visitedSlots)) {
        slotToQualifier.set(slot.id, qualifierIndex);
        return true;
      }
    }
    return false;
  }

  qualifiers.forEach((_, qualifierIndex) => findSlot(qualifierIndex, new Set()));

  const assignments = new Map<string, BracketTeam>();
  for (const [slotId, qualifierIndex] of slotToQualifier) {
    assignments.set(slotId, qualifiers[qualifierIndex].team);
  }
  return assignments;
}

// ── Previous-round outcome tracking ───────────────────────────────────

type MatchOutcome = { winner: BracketTeam | null; loser: BracketTeam | null };

// Determines the winner/loser of an already-projected match using ONLY
// persisted result fields (status/scores/advancing_team_id) — never
// guesses ahead of what's actually been played.
function computeOutcome(match: {
  status: string;
  home_score: number | null;
  away_score: number | null;
  advancing_team_id: string | null;
  home_team: BracketTeam | null;
  away_team: BracketTeam | null;
}): MatchOutcome {
  const unresolved: MatchOutcome = { winner: null, loser: null };

  if (match.status !== "finished") return unresolved;
  if (match.home_score === null || match.away_score === null) return unresolved;
  if (!match.home_team || !match.away_team) return unresolved;

  if (match.home_score !== match.away_score) {
    return match.home_score > match.away_score
      ? { winner: match.home_team, loser: match.away_team }
      : { winner: match.away_team, loser: match.home_team };
  }

  // Level after regulation/extra time — a knockout match can't end in a
  // draw, so this was decided by penalties. advancing_team_id is the only
  // source of truth for who actually went through (CLAUDE.md: penalty
  // shootouts never affect the official scoreline used for scoring).
  if (match.advancing_team_id === match.home_team.id) {
    return { winner: match.home_team, loser: match.away_team };
  }
  if (match.advancing_team_id === match.away_team.id) {
    return { winner: match.away_team, loser: match.home_team };
  }
  return unresolved; // finished + level, but penalty winner not recorded yet
}

// ── Placeholder → team resolution ─────────────────────────────────────

function resolveSide(
  placeholder: string | null,
  groups: GroupStanding[],
  bestThirdAssignments: Map<string, BracketTeam>,
  slotId: string,
  outcomes: Map<number, MatchOutcome>
): BracketTeam | null {
  const parsed = parsePlaceholder(placeholder);
  switch (parsed.kind) {
    case "group_winner":    return resolveGroupWinner(parsed.group, groups);
    case "group_runner_up": return resolveGroupRunnerUp(parsed.group, groups);
    case "best_third":      return bestThirdAssignments.get(slotId) ?? null;
    case "match_winner":    return outcomes.get(parsed.matchNumber)?.winner ?? null;
    case "match_loser":     return outcomes.get(parsed.matchNumber)?.loser ?? null;
    case "unresolvable":    return null;
  }
}

// Projects a single stage (e.g. all of round_of_32), in isolation, given
// whatever outcomes have already been resolved from earlier stages.
// Mutates `outcomes` with this stage's results so later stages (passed in
// a later call, in bracket order) can resolve "Winner M##" / "Loser M##".
function projectStage(
  matches: KnockoutPreviewMatch[],
  groups: GroupStanding[],
  bestThirds: TeamStanding[],
  outcomes: Map<number, MatchOutcome>
): ProjectedKnockoutMatch[] {
  // All "Best 3rd (...)" slots in this stage are resolved together as a
  // single assignment problem (see resolveBestThirdAssignments) instead of
  // slot by slot, so the same third can never be handed out twice.
  const slots: BestThirdSlot[] = [];
  for (const match of matches) {
    if (match.home_team === null) {
      const parsed = parsePlaceholder(match.home_placeholder);
      if (parsed.kind === "best_third") {
        slots.push({ id: `${match.id}:home`, candidateGroups: parsed.candidateGroups });
      }
    }
    if (match.away_team === null) {
      const parsed = parsePlaceholder(match.away_placeholder);
      if (parsed.kind === "best_third") {
        slots.push({ id: `${match.id}:away`, candidateGroups: parsed.candidateGroups });
      }
    }
  }
  const bestThirdAssignments = resolveBestThirdAssignments({ bestThirds, slots });

  return matches.map((match) => {
    const homeIsReal = match.home_team !== null;
    const awayIsReal = match.away_team !== null;

    const projectedHome = homeIsReal
      ? match.home_team
      : resolveSide(match.home_placeholder, groups, bestThirdAssignments, `${match.id}:home`, outcomes);
    const projectedAway = awayIsReal
      ? match.away_team
      : resolveSide(match.away_placeholder, groups, bestThirdAssignments, `${match.id}:away`, outcomes);

    const projected: ProjectedKnockoutMatch = {
      ...match,
      home_team: projectedHome,
      away_team: projectedAway,
      home_team_projected: !homeIsReal && projectedHome !== null,
      away_team_projected: !awayIsReal && projectedAway !== null,
    };

    if (match.match_number !== null) {
      outcomes.set(match.match_number, computeOutcome(projected));
    }
    return projected;
  });
}

// ── Public API ────────────────────────────────────────────────────────

export type KnockoutBracketInput = {
  groups: GroupStanding[];
  bestThirds: TeamStanding[];
  roundOf32: KnockoutPreviewMatch[];
  roundOf16: KnockoutPreviewMatch[];
  quarterFinals: KnockoutPreviewMatch[];
  semiFinals: KnockoutPreviewMatch[];
  thirdPlace: KnockoutPreviewMatch[];
  finals: KnockoutPreviewMatch[];
};

export type KnockoutBracketProjection = {
  roundOf32: ProjectedKnockoutMatch[];
  roundOf16: ProjectedKnockoutMatch[];
  quarterFinals: ProjectedKnockoutMatch[];
  semiFinals: ProjectedKnockoutMatch[];
  thirdPlace: ProjectedKnockoutMatch[];
  finals: ProjectedKnockoutMatch[];
};

// Projects every knockout stage in bracket order, threading each stage's
// resolved winners/losers forward into the next. Pure function — reads
// only its arguments, returns new arrays, never touches the database.
export function projectKnockoutBracket(input: KnockoutBracketInput): KnockoutBracketProjection {
  const { groups, bestThirds } = input;
  const outcomes = new Map<number, MatchOutcome>();

  // Order matters: each stage only ever references match numbers from
  // stages projected before it (round_of_32 → ... → final/third_place).
  const roundOf32     = projectStage(input.roundOf32, groups, bestThirds, outcomes);
  const roundOf16     = projectStage(input.roundOf16, groups, bestThirds, outcomes);
  const quarterFinals = projectStage(input.quarterFinals, groups, bestThirds, outcomes);
  const semiFinals    = projectStage(input.semiFinals, groups, bestThirds, outcomes);
  const thirdPlace    = projectStage(input.thirdPlace, groups, bestThirds, outcomes);
  const finals        = projectStage(input.finals, groups, bestThirds, outcomes);

  return { roundOf32, roundOf16, quarterFinals, semiFinals, thirdPlace, finals };
}
