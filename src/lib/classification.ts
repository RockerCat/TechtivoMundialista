// ── Types ─────────────────────────────────────────────────────────────

export type ClassificationTeam = {
  id: string;
  name: string;
  code: string;
  flag_emoji: string | null;
};

export type TeamStanding = {
  team: ClassificationTeam;
  group_code: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
};

export type GroupStanding = {
  group_code: string;
  teams: TeamStanding[];  // sorted: index 0 = leader
  // True once every match in this group has status "finished" — i.e. the
  // 1st/2nd placements can no longer change. Used by bracket.ts to decide
  // whether a slot resolved from this group is "official" or still a
  // "projection" (CLAUDE.md §1/§3).
  group_finished: boolean;
};

export type ClassificationMatch = {
  group_code: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  home_team: ClassificationTeam | null;
  away_team: ClassificationTeam | null;
};

export type KnockoutPreviewMatch = {
  id: string;
  match_number: number | null;
  starts_at: string;
  venue: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  // Who actually advanced when a knockout match finished level and was
  // decided by penalties. NEVER used for scoring — bracket/display only.
  // See supabase/migrations/039_advancing_team.sql.
  advancing_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_team: ClassificationTeam | null;
  away_team: ClassificationTeam | null;
};

// ── FIFA tiebreak criteria ───────────────────────────────────────────────
//
// Official order (per FIFA group-stage regulations, World Cup 2026):
//   1. Points (overall, in the group).
//   2. Head-to-head mini-table, built ONLY from matches between the tied
//      teams: (a) points, (b) goal difference, (c) goals scored — all
//      restricted to those matches. If this separates only some of the
//      tied teams, criteria (a)-(c) are RE-APPLIED exclusively to the
//      matches between the teams that remain tied (a narrower mini-table,
//      not a re-use of the wider one). See resolveByHeadToHead().
//   3. Goal difference across ALL group matches.
//   4. Goals scored across ALL group matches.
//   5. Disciplinary ("fair play") points — NOT IMPLEMENTED. The app does
//      not record yellow/red cards, so this criterion cannot be computed.
//   6. FIFA World Ranking position — NOT IMPLEMENTED. The app does not
//      store FIFA ranking data.
//   7. Drawing of lots — FIFA's final tiebreaker is random and has no
//      deterministic equivalent. As a TECHNICAL FALLBACK (not an FIFA
//      criterion), teams still tied after step 4 are ordered alphabetically
//      by name, purely to keep the UI deterministic and reproducible.
//
// compareStandings() implements steps 1, 3, 4 and the step-7 fallback only.
// It is used to rank teams that did NOT play each other in the group stage
// (i.e. comparing third-placed teams across different groups — see
// computeBestThirds), where head-to-head is not applicable by definition.
//
// Within-group ranking (where head-to-head DOES apply) is handled by
// sortGroupTeams() / resolveByHeadToHead() below.

export function compareStandings(a: TeamStanding, b: TeamStanding): number {
  if (b.points     !== a.points)     return b.points     - a.points;
  if (b.goal_diff  !== a.goal_diff)  return b.goal_diff  - a.goal_diff;
  if (b.goals_for  !== a.goals_for)  return b.goals_for  - a.goals_for;
  return a.team.name.localeCompare(b.team.name); // technical fallback, not an FIFA criterion
}

// ── Head-to-head mini-table ──────────────────────────────────────────────
// Stats computed using ONLY the finished matches played between the teams
// in `teamIds` (never against teams outside that set).

type MiniStats = { points: number; goalDiff: number; goalsFor: number };

function computeMiniStats(
  teamIds: Set<string>,
  groupMatches: ClassificationMatch[]
): Map<string, MiniStats> {
  const stats = new Map<string, MiniStats>();
  for (const id of teamIds) stats.set(id, { points: 0, goalDiff: 0, goalsFor: 0 });

  for (const m of groupMatches) {
    if (m.status !== "finished" || m.home_score === null || m.away_score === null) continue;
    if (!m.home_team || !m.away_team) continue;
    if (!teamIds.has(m.home_team.id) || !teamIds.has(m.away_team.id)) continue;

    const home = stats.get(m.home_team.id)!;
    const away = stats.get(m.away_team.id)!;
    const hg = m.home_score;
    const ag = m.away_score;

    home.goalsFor += hg; away.goalsFor += ag;
    home.goalDiff += hg - ag; away.goalDiff += ag - hg;

    if (hg > ag)      home.points += 3;
    else if (hg < ag) away.points += 3;
    else { home.points += 1; away.points += 1; }
  }

  return stats;
}

// Sorts `items` descending by `sortFn`, then groups consecutive items that
// share the same `keyFn` value into buckets (each bucket = teams still tied
// after applying that criterion).

function bucketByDesc<T>(
  items: T[],
  sortFn: (a: T, b: T) => number,
  keyFn: (item: T) => string
): T[][] {
  const sorted = [...items].sort(sortFn);
  const buckets: T[][] = [];
  for (const item of sorted) {
    const last = buckets[buckets.length - 1];
    if (last && keyFn(last[0]) === keyFn(item)) last.push(item);
    else buckets.push([item]);
  }
  return buckets;
}

// Step 2: head-to-head mini-table, recursively re-applied to narrowing
// subsets per FIFA's "reapply exclusively to the teams that remain equal"
// rule. Falls through to overall stats (step 3-4) once a pass fails to
// narrow the tied set any further.

function resolveByHeadToHead(
  tied: TeamStanding[],
  groupMatches: ClassificationMatch[]
): TeamStanding[] {
  if (tied.length <= 1) return tied;

  const miniStats = computeMiniStats(new Set(tied.map((t) => t.team.id)), groupMatches);
  const keyFn = (t: TeamStanding) => {
    const s = miniStats.get(t.team.id)!;
    return `${s.points}|${s.goalDiff}|${s.goalsFor}`;
  };
  const sortFn = (a: TeamStanding, b: TeamStanding) => {
    const sa = miniStats.get(a.team.id)!;
    const sb = miniStats.get(b.team.id)!;
    if (sb.points    !== sa.points)    return sb.points    - sa.points;
    if (sb.goalDiff  !== sa.goalDiff)  return sb.goalDiff  - sa.goalDiff;
    return sb.goalsFor - sa.goalsFor;
  };

  const buckets = bucketByDesc(tied, sortFn, keyFn);

  return buckets.flatMap((bucket) => {
    if (bucket.length === 1) return bucket;
    if (bucket.length === tied.length) {
      // No progress: re-running head-to-head on the exact same set would
      // repeat the same result forever. Move on to overall group stats.
      return resolveByOverallStats(bucket);
    }
    // Narrowed subset: rebuild the mini-table using ONLY matches between
    // these remaining teams (excludes matches against the teams just
    // separated out above).
    return resolveByHeadToHead(bucket, groupMatches);
  });
}

// Steps 3-4: goal difference, then goals scored, across ALL group matches.

function resolveByOverallStats(tied: TeamStanding[]): TeamStanding[] {
  const sortFn = (a: TeamStanding, b: TeamStanding) => {
    if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
    return b.goals_for - a.goals_for;
  };
  const keyFn = (t: TeamStanding) => `${t.goal_diff}|${t.goals_for}`;

  const buckets = bucketByDesc(tied, sortFn, keyFn);
  return buckets.flatMap((bucket) =>
    bucket.length === 1 ? bucket : resolveFinalFallback(bucket)
  );
}

// Steps 5-7: fair play and FIFA ranking can't be computed (no card or
// ranking data in this app). As a TECHNICAL FALLBACK — not an FIFA
// criterion — order alphabetically so the result stays deterministic.

function resolveFinalFallback(tied: TeamStanding[]): TeamStanding[] {
  return [...tied].sort((a, b) => a.team.name.localeCompare(b.team.name));
}

// Ranks all teams within a single group following the full FIFA cascade:
// points → head-to-head mini-table (recursive) → overall goal difference →
// overall goals scored → deterministic fallback.

export function sortGroupTeams(
  teams: TeamStanding[],
  groupMatches: ClassificationMatch[]
): TeamStanding[] {
  const pointsBuckets = bucketByDesc(
    teams,
    (a, b) => b.points - a.points,
    (t) => `${t.points}`
  );
  return pointsBuckets.flatMap((bucket) =>
    bucket.length === 1 ? bucket : resolveByHeadToHead(bucket, groupMatches)
  );
}

function emptyStanding(
  team: ClassificationTeam,
  group_code: string
): TeamStanding {
  return {
    team,
    group_code,
    played: 0, won: 0, drawn: 0, lost: 0,
    goals_for: 0, goals_against: 0, goal_diff: 0, points: 0,
  };
}

// ── computeGroupStandings ──────────────────────────────────────────────
// Pass ALL group-stage matches (any status) so every team is initialised.
// Only finished matches contribute to stats.

export function computeGroupStandings(
  matches: ClassificationMatch[]
): GroupStanding[] {
  const standingsMap = new Map<string, TeamStanding>();
  const groupSets    = new Map<string, Set<string>>();

  // ── Pass 1: discover every team in every group ─────────────────────
  for (const m of matches) {
    if (!m.group_code) continue;
    for (const team of [m.home_team, m.away_team]) {
      if (!team) continue;
      if (!standingsMap.has(team.id)) {
        standingsMap.set(team.id, emptyStanding(team, m.group_code));
      }
      const s = groupSets.get(m.group_code) ?? new Set<string>();
      s.add(team.id);
      groupSets.set(m.group_code, s);
    }
  }

  // ── Pass 2: accumulate stats from finished matches ─────────────────
  for (const m of matches) {
    if (m.status !== "finished") continue;
    if (!m.group_code || m.home_score === null || m.away_score === null) continue;
    if (!m.home_team || !m.away_team) continue;

    const home = standingsMap.get(m.home_team.id);
    const away = standingsMap.get(m.away_team.id);
    if (!home || !away) continue;

    const hg = m.home_score;
    const ag = m.away_score;

    home.played++; away.played++;
    home.goals_for    += hg;  home.goals_against += ag;
    away.goals_for    += ag;  away.goals_against += hg;
    home.goal_diff = home.goals_for - home.goals_against;
    away.goal_diff = away.goals_for - away.goals_against;

    if (hg > ag) {
      home.won++; away.lost++; home.points += 3;
    } else if (hg < ag) {
      away.won++; home.lost++; away.points += 3;
    } else {
      home.drawn++; away.drawn++; home.points++; away.points++;
    }
  }

  // ── Build sorted groups A → L ──────────────────────────────────────
  const groupsMap = new Map<string, TeamStanding[]>();
  for (const standing of standingsMap.values()) {
    const arr = groupsMap.get(standing.group_code) ?? [];
    arr.push(standing);
    groupsMap.set(standing.group_code, arr);
  }

  return [...groupsMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group_code, teams]) => {
      const groupMatches = matches.filter((m) => m.group_code === group_code);
      return {
        group_code,
        teams: sortGroupTeams(teams, groupMatches),
        group_finished: groupMatches.length > 0 && groupMatches.every((m) => m.status === "finished"),
      };
    });
}

// ── computeBestThirds ──────────────────────────────────────────────────
// Extracts the 3rd-ranked team from each group and ranks them.
// Returns ALL thirds sorted — caller marks top 8 as advancing.

export function computeBestThirds(groups: GroupStanding[]): TeamStanding[] {
  return groups
    .filter((g) => g.teams.length >= 3)
    .map((g) => g.teams[2])
    .sort(compareStandings);
}
