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
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_team: ClassificationTeam | null;
  away_team: ClassificationTeam | null;
};

// ── Sorting comparator ─────────────────────────────────────────────────
// Criteria (in order):
//   1. Points DESC
//   2. Goal difference DESC
//   3. Goals scored DESC
//   4. Alphabetical ASC (deterministic tiebreaker; FIFA adds head-to-head later)

export function compareStandings(a: TeamStanding, b: TeamStanding): number {
  if (b.points     !== a.points)     return b.points     - a.points;
  if (b.goal_diff  !== a.goal_diff)  return b.goal_diff  - a.goal_diff;
  if (b.goals_for  !== a.goals_for)  return b.goals_for  - a.goals_for;
  return a.team.name.localeCompare(b.team.name);
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
    .map(([group_code, teams]) => ({
      group_code,
      teams: [...teams].sort(compareStandings),
    }));
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
