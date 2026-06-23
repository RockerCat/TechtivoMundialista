import { describe, it, expect } from "vitest";
import {
  computeGroupStandings,
  computeBestThirds,
  sortGroupTeams,
  type ClassificationTeam,
  type ClassificationMatch,
  type TeamStanding,
  type GroupStanding,
} from "./classification";

// ── Fixtures ──────────────────────────────────────────────────────────

function team(id: string): ClassificationTeam {
  return { id, name: id, code: id.slice(0, 3).toUpperCase(), flag_emoji: null };
}

function match(
  group_code: string,
  home: ClassificationTeam,
  away: ClassificationTeam,
  homeScore: number,
  awayScore: number
): ClassificationMatch {
  return {
    group_code,
    home_score: homeScore,
    away_score: awayScore,
    status: "finished",
    home_team: home,
    away_team: away,
  };
}

function standing(
  t: ClassificationTeam,
  group_code: string,
  overrides: Partial<TeamStanding>
): TeamStanding {
  return {
    team: t,
    group_code,
    played: 0, won: 0, drawn: 0, lost: 0,
    goals_for: 0, goals_against: 0, goal_diff: 0, points: 0,
    ...overrides,
  };
}

const A = team("Alpha");
const B = team("Bravo");
const C = team("Charlie");
const D = team("Delta");

// ── sortGroupTeams: unit tests on the FIFA tiebreak cascade ─────────────

describe("sortGroupTeams", () => {
  it("breaks a two-team tie by head-to-head, even when goal difference disagrees", () => {
    // A and B are level on points. By overall goal difference B looks better
    // (+4 vs -2), but A won their direct match 1-0 — FIFA's head-to-head
    // criterion outranks overall goal difference, so A must finish above B.
    const teams = [
      standing(A, "X", { points: 4, goal_diff: -2, goals_for: 1 }),
      standing(B, "X", { points: 4, goal_diff: 4, goals_for: 5 }),
    ];
    const matches = [match("X", A, B, 1, 0)];

    const result = sortGroupTeams(teams, matches);
    expect(result.map((s) => s.team.id)).toEqual(["Alpha", "Bravo"]);
  });

  it("breaks a three-team tie using the head-to-head mini-table, overriding overall stats", () => {
    // A, B and C are level on points. Overall goal difference would rank
    // them C > B > A (the opposite order), but the mini-table built only
    // from matches between A/B/C (A beat both, B beat C) must decide:
    // A (2 wins) > B (1 win) > C (0 wins).
    const teams = [
      standing(A, "X", { points: 6, goal_diff: -5, goals_for: 0 }),
      standing(B, "X", { points: 6, goal_diff: 0,  goals_for: 2 }),
      standing(C, "X", { points: 6, goal_diff: 5,  goals_for: 10 }),
    ];
    const matches = [
      match("X", A, B, 2, 0),
      match("X", B, C, 2, 0),
      match("X", A, C, 3, 0),
    ];

    const result = sortGroupTeams(teams, matches);
    expect(result.map((s) => s.team.id)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("re-applies the mini-table to a narrower subset when a four-team tie only partially separates", () => {
    // All four teams are level on points. The mini-table built from ALL
    // group matches among them happens to leave A and B exactly tied
    // (both 6 pts / +2 / 3 gf), while C and D are already singled out.
    // FIFA requires re-applying head-to-head EXCLUSIVELY to the remaining
    // tied teams (A vs B alone) rather than falling through to overall
    // goal difference — and their direct match (A won 1-0) must decide it.
    const teams = [
      standing(A, "X", { points: 9 }),
      standing(B, "X", { points: 9 }),
      standing(C, "X", { points: 9 }),
      standing(D, "X", { points: 9 }),
    ];
    const matches = [
      match("X", A, B, 1, 0),
      match("X", A, C, 2, 0),
      match("X", A, D, 0, 1),
      match("X", B, C, 2, 0),
      match("X", B, D, 1, 0),
      match("X", C, D, 2, 0),
    ];

    const result = sortGroupTeams(teams, matches);
    expect(result.map((s) => s.team.id)).toEqual(["Alpha", "Bravo", "Charlie", "Delta"]);
  });

  it("falls back to overall goal difference once head-to-head is inconclusive", () => {
    // E and F drew their direct match 0-0 — the head-to-head mini-table
    // can't separate them (identical 1/0/0 each), so the tie must be
    // broken by goal difference across ALL group matches instead.
    const E = team("Echo");
    const F = team("Foxtrot");
    const teams = [
      standing(E, "Y", { points: 5, goal_diff: 3, goals_for: 6 }),
      standing(F, "Y", { points: 5, goal_diff: 1, goals_for: 4 }),
    ];
    const matches = [match("Y", E, F, 0, 0)];

    const result = sortGroupTeams(teams, matches);
    expect(result.map((s) => s.team.id)).toEqual(["Echo", "Foxtrot"]);
  });

  it("falls back to goals scored when both head-to-head and overall goal difference are inconclusive", () => {
    const G = team("Golf");
    const H = team("Hotel");
    const teams = [
      standing(G, "Z", { points: 5, goal_diff: 2, goals_for: 5 }),
      standing(H, "Z", { points: 5, goal_diff: 2, goals_for: 3 }),
    ];
    const matches = [match("Z", G, H, 1, 1)];

    const result = sortGroupTeams(teams, matches);
    expect(result.map((s) => s.team.id)).toEqual(["Golf", "Hotel"]);
  });

  it("uses the deterministic alphabetical fallback only as an absolute last resort", () => {
    // Identical in every official criterion we can compute (no card/ranking
    // data available) — this is the documented non-FIFA technical fallback.
    const I = team("India");
    const J = team("Juliet");
    const teams = [
      standing(J, "W", { points: 5, goal_diff: 2, goals_for: 3 }),
      standing(I, "W", { points: 5, goal_diff: 2, goals_for: 3 }),
    ];
    const matches = [match("W", I, J, 1, 1)];

    const result = sortGroupTeams(teams, matches);
    expect(result.map((s) => s.team.id)).toEqual(["India", "Juliet"]);
  });

  it("does not let unrelated teams in the group affect a tied pair's head-to-head", () => {
    // K and L are tied on points and both beat M — but K and L never
    // played each other in this fixture, so head-to-head is empty (no
    // points/gd/gf from either side) and the tie must fall through to
    // overall goal difference, which must NOT be influenced by results
    // against M being miscounted as "head-to-head".
    const K = team("Kilo");
    const L = team("Lima");
    const M = team("Mike");
    const teams = [
      standing(K, "V", { points: 6, goal_diff: 5, goals_for: 5 }),
      standing(L, "V", { points: 6, goal_diff: 2, goals_for: 2 }),
    ];
    const matches = [
      match("V", K, M, 5, 0),
      match("V", L, M, 2, 0),
    ];

    const result = sortGroupTeams(teams, matches);
    expect(result.map((s) => s.team.id)).toEqual(["Kilo", "Lima"]);
  });
});

// ── computeGroupStandings: end-to-end pipeline ───────────────────────────

describe("computeGroupStandings", () => {
  it("computes points/goal difference from results and resolves a tie via head-to-head", () => {
    // Full round-robin: D leads outright on points. A and C are tied on
    // points (4 each) and, in their direct match, C beat A 1-0 — so C
    // must rank above A despite identical overall points.
    const matches = [
      match("G1", A, B, 1, 0),
      match("G1", A, C, 0, 1),
      match("G1", A, D, 1, 1),
      match("G1", B, C, 1, 0),
      match("G1", B, D, 0, 2),
      match("G1", C, D, 0, 0),
    ];

    const [group] = computeGroupStandings(matches);
    expect(group.group_code).toBe("G1");
    expect(group.teams.map((s) => s.team.id)).toEqual(["Delta", "Charlie", "Alpha", "Bravo"]);
    expect(group.teams.map((s) => s.points)).toEqual([5, 4, 4, 3]);
  });

  it("keeps unfinished/missing-score matches from affecting standings", () => {
    const matches: ClassificationMatch[] = [
      match("G2", A, B, 2, 0),
      { ...match("G2", C, D, 0, 0), status: "scheduled", home_score: null, away_score: null },
    ];

    const [group] = computeGroupStandings(matches);
    const a = group.teams.find((s) => s.team.id === "Alpha")!;
    const c = group.teams.find((s) => s.team.id === "Charlie")!;
    expect(a.points).toBe(3);
    expect(c.played).toBe(0);
  });
});

// ── computeBestThirds: cross-group comparison, no head-to-head ─────────

describe("computeBestThirds", () => {
  it("ranks third-placed teams by points, then goal difference, then goals scored", () => {
    const groups: GroupStanding[] = [
      {
        group_code: "G1",
        teams: [
          standing(A, "G1", { points: 9 }),
          standing(B, "G1", { points: 6 }),
          standing(C, "G1", { points: 4, goal_diff: -1, goals_for: 3 }), // 3rd of G1
        ],
      },
      {
        group_code: "G2",
        teams: [
          standing(D, "G2", { points: 9 }),
          standing(team("Bravo2"), "G2", { points: 6 }),
          standing(team("Hotel"), "G2", { points: 4, goal_diff: 0, goals_for: 1 }), // 3rd of G2
        ],
      },
    ];

    const thirds = computeBestThirds(groups);
    // Hotel: gd 0 beats Charlie's gd -1, despite Charlie scoring more goals.
    expect(thirds.map((s) => s.team.id)).toEqual(["Hotel", "Charlie"]);
  });

  it("falls back to alphabetical order when thirds are fully tied", () => {
    const groups: GroupStanding[] = [
      {
        group_code: "G1",
        teams: [
          standing(A, "G1", { points: 9 }),
          standing(B, "G1", { points: 6 }),
          standing(team("Zulu"), "G1", { points: 4, goal_diff: 0, goals_for: 2 }),
        ],
      },
      {
        group_code: "G2",
        teams: [
          standing(D, "G2", { points: 9 }),
          standing(team("Bravo2"), "G2", { points: 6 }),
          standing(team("Yankee"), "G2", { points: 4, goal_diff: 0, goals_for: 2 }),
        ],
      },
    ];

    const thirds = computeBestThirds(groups);
    expect(thirds.map((s) => s.team.id)).toEqual(["Yankee", "Zulu"]);
  });
});
