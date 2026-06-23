import { describe, it, expect } from "vitest";
import { projectKnockoutBracket, resolveBestThirdAssignments, type BestThirdSlot } from "./bracket";
import type {
  ClassificationTeam,
  GroupStanding,
  TeamStanding,
  KnockoutPreviewMatch,
} from "./classification";

// ── Fixtures ──────────────────────────────────────────────────────────

function team(id: string): ClassificationTeam {
  return { id, name: id, code: id.slice(0, 3).toUpperCase(), flag_emoji: null };
}

function standing(t: ClassificationTeam, group_code: string, points: number): TeamStanding {
  return {
    team: t, group_code, points,
    played: 3, won: 0, drawn: 0, lost: 0,
    goals_for: 0, goals_against: 0, goal_diff: 0,
  };
}

// Builds a group with teams already in final ranked order (index 0 = leader).
function group(group_code: string, ranked: ClassificationTeam[]): GroupStanding {
  return {
    group_code,
    teams: ranked.map((t, i) => standing(t, group_code, 9 - i * 3)),
  };
}

let nextId = 1;
function knockoutMatch(overrides: Partial<KnockoutPreviewMatch> = {}): KnockoutPreviewMatch {
  return {
    id: `match-${nextId++}`,
    match_number: null,
    starts_at: "2026-06-28T19:00:00Z",
    venue: null,
    status: "scheduled",
    home_score: null,
    away_score: null,
    advancing_team_id: null,
    home_placeholder: null,
    away_placeholder: null,
    home_team: null,
    away_team: null,
    ...overrides,
  };
}

const A1 = team("A1"), A2 = team("A2"), A3 = team("A3"), A4 = team("A4");
const B1 = team("B1"), B2 = team("B2"), B3 = team("B3"), B4 = team("B4");

const GROUP_A = group("A", [A1, A2, A3, A4]);
const GROUP_B = group("B", [B1, B2, B3, B4]);

function emptyBracketInput(overrides: Partial<Parameters<typeof projectKnockoutBracket>[0]> = {}) {
  return {
    groups: [GROUP_A, GROUP_B],
    bestThirds: [GROUP_A.teams[2], GROUP_B.teams[2]],
    roundOf32: [], roundOf16: [], quarterFinals: [], semiFinals: [], thirdPlace: [], finals: [],
    ...overrides,
  };
}

// ── Group-stage placeholders ─────────────────────────────────────────

describe("projectKnockoutBracket — group placeholders", () => {
  it("resolves 'Winner Group X' to the current group leader", () => {
    const match = knockoutMatch({ home_placeholder: "Winner Group A" });
    const result = projectKnockoutBracket(emptyBracketInput({ roundOf32: [match] }));

    expect(result.roundOf32[0].home_team?.id).toBe("A1");
    expect(result.roundOf32[0].home_team_projected).toBe(true);
  });

  it("resolves 'Runner-up Group X' to the current second place", () => {
    const match = knockoutMatch({ away_placeholder: "Runner-up Group B" });
    const result = projectKnockoutBracket(emptyBracketInput({ roundOf32: [match] }));

    expect(result.roundOf32[0].away_team?.id).toBe("B2");
    expect(result.roundOf32[0].away_team_projected).toBe(true);
  });

  it("keeps the placeholder when the referenced group has no data", () => {
    const match = knockoutMatch({ home_placeholder: "Winner Group Z" });
    const result = projectKnockoutBracket(emptyBracketInput({ roundOf32: [match] }));

    expect(result.roundOf32[0].home_team).toBeNull();
    expect(result.roundOf32[0].home_team_projected).toBe(false);
  });

  it("never overwrites a team that is already persisted (manually confirmed)", () => {
    const confirmedTeam = team("ESP");
    const match = knockoutMatch({ home_placeholder: "Winner Group A", home_team: confirmedTeam });
    const result = projectKnockoutBracket(emptyBracketInput({ roundOf32: [match] }));

    expect(result.roundOf32[0].home_team?.id).toBe("ESP"); // not A1
    expect(result.roundOf32[0].home_team_projected).toBe(false);
  });
});

// ── Best-third placeholders ───────────────────────────────────────────
//
// resolveBestThirdAssignments solves every "Best 3rd (...)" slot together
// as one bipartite-matching problem, so it's tested directly here with
// explicit slot ids — easier to reason about than threading everything
// through full KnockoutPreviewMatch fixtures. A couple of end-to-end tests
// through projectKnockoutBracket close the loop on the real wiring.

const C3 = team("C3"), D3 = team("D3");

describe("resolveBestThirdAssignments", () => {
  it("resolves multiple slots even when each individually has more than one candidate", () => {
    // Both slots have 2 raw candidates each — the old "exactly one
    // candidate" rule would have left both as placeholders.
    const bestThirds = [
      standing(A3, "A", 12), // best
      standing(B3, "B", 9),
      standing(C3, "C", 6),
      standing(D3, "D", 3), // worst
    ];
    const slots: BestThirdSlot[] = [
      { id: "slot1", candidateGroups: ["A", "B"] },
      { id: "slot2", candidateGroups: ["C", "D"] },
    ];

    const result = resolveBestThirdAssignments({ bestThirds, slots });

    expect(result.get("slot1")?.id).toBe("A3"); // best-ranked of its candidates
    expect(result.get("slot2")?.id).toBe("C3"); // best-ranked of its candidates
  });

  it("never assigns the same third to two different slots", () => {
    const bestThirds = [standing(A3, "A", 12), standing(B3, "B", 9)];
    const slots: BestThirdSlot[] = [
      { id: "slot1", candidateGroups: ["A", "B"] },
      { id: "slot2", candidateGroups: ["A", "B"] },
    ];

    const result = resolveBestThirdAssignments({ bestThirds, slots });

    const assigned = [result.get("slot1")?.id, result.get("slot2")?.id];
    expect(assigned).toHaveLength(2);
    expect(new Set(assigned).size).toBe(2); // no duplicate
    expect(assigned.every((id) => id === "A3" || id === "B3")).toBe(true);
  });

  it("keeps a placeholder when no valid complete assignment exists, but resolves what it can", () => {
    // Three slots can only ever draw from groups A or B, but only two
    // qualifying thirds (A3, B3) exist for those groups — one slot is
    // structurally unfillable no matter the order.
    const bestThirds = [standing(A3, "A", 12), standing(B3, "B", 9)];
    const slots: BestThirdSlot[] = [
      { id: "slot1", candidateGroups: ["A", "B"] },
      { id: "slot2", candidateGroups: ["A", "B"] },
      { id: "slot3", candidateGroups: ["A", "B"] },
    ];

    const result = resolveBestThirdAssignments({ bestThirds, slots });

    expect(result.size).toBe(2); // exactly 2 of the 3 slots resolved
    const assignedIds = [...result.values()].map((t) => t.id);
    expect(new Set(assignedIds).size).toBe(2); // A3 and B3, each once
  });

  it("resolves unambiguous slots even while a sibling slot stays unresolved", () => {
    const bestThirds = [standing(A3, "A", 12)]; // no team for group Z exists at all
    const slots: BestThirdSlot[] = [
      { id: "slot1", candidateGroups: ["A"] },   // only ever A3 — unambiguous
      { id: "slot2", candidateGroups: ["Z"] },   // no qualifying third — unresolvable
    ];

    const result = resolveBestThirdAssignments({ bestThirds, slots });

    expect(result.get("slot1")?.id).toBe("A3");
    expect(result.has("slot2")).toBe(false);
  });

  it("prioritizes the better-ranked third when a single slot lists several candidates", () => {
    const bestThirds = [standing(B3, "B", 5), standing(A3, "A", 11)]; // unsorted input on purpose
    const slots: BestThirdSlot[] = [{ id: "slot1", candidateGroups: ["A", "B"] }];

    const result = resolveBestThirdAssignments({ bestThirds, slots });

    expect(result.get("slot1")?.id).toBe("A3"); // 11 pts > 5 pts
  });

  it("produces the same deterministic assignment across repeated runs when multiple valid matchings exist", () => {
    // Both (slot1=A3,slot2=B3) and (slot1=B3,slot2=A3) are valid complete
    // matchings here — the algorithm must always pick the same one.
    const bestThirds = [standing(A3, "A", 12), standing(B3, "B", 9)];
    const slots: BestThirdSlot[] = [
      { id: "slot1", candidateGroups: ["A", "B"] },
      { id: "slot2", candidateGroups: ["A", "B"] },
    ];

    const first  = resolveBestThirdAssignments({ bestThirds, slots });
    const second = resolveBestThirdAssignments({ bestThirds, slots });

    expect(first.get("slot1")?.id).toBe(second.get("slot1")?.id);
    expect(first.get("slot2")?.id).toBe(second.get("slot2")?.id);
  });

  it("only considers the top 8 ranked thirds as qualifying candidates", () => {
    const lowRanked = team("LOW");
    const bestThirds = [
      ...Array.from({ length: 8 }, (_, i) => standing(team(`Q${i}`), "Q", 30 - i)),
      standing(lowRanked, "L", 1), // 9th place — does not qualify
    ];
    const slots: BestThirdSlot[] = [{ id: "slot1", candidateGroups: ["L"] }];

    const result = resolveBestThirdAssignments({ bestThirds, slots });

    expect(result.has("slot1")).toBe(false);
  });
});

describe("projectKnockoutBracket — best-third placeholders end-to-end", () => {
  it("resolves Best 3rd slots from real match fixtures without duplicating a team", () => {
    const bestThirds = [
      standing(A3, "A", 12),
      standing(B3, "B", 9),
      standing(C3, "C", 6),
    ];
    const match1 = knockoutMatch({ away_placeholder: "Best 3rd (A/B)" });
    const match2 = knockoutMatch({ away_placeholder: "Best 3rd (B/C)" });

    const result = projectKnockoutBracket(
      emptyBracketInput({ bestThirds, roundOf32: [match1, match2] })
    );

    const resolved = [result.roundOf32[0].away_team?.id, result.roundOf32[1].away_team?.id];
    expect(resolved.every(Boolean)).toBe(true);
    expect(new Set(resolved).size).toBe(2);
    expect(result.roundOf32[0].away_team_projected).toBe(true);
    expect(result.roundOf32[1].away_team_projected).toBe(true);
  });

  it("keeps the placeholder end-to-end when no group in the slot has a qualifying third", () => {
    const bestThirds = [standing(A3, "A", 12)];
    const match = knockoutMatch({ away_placeholder: "Best 3rd (X/Y)" });

    const result = projectKnockoutBracket(emptyBracketInput({ bestThirds, roundOf32: [match] }));

    expect(result.roundOf32[0].away_team).toBeNull();
    expect(result.roundOf32[0].away_team_projected).toBe(false);
  });
});

// ── Previous-round winners/losers ─────────────────────────────────────

describe("projectKnockoutBracket — previous-round results", () => {
  it("advances the real winner of a finished match to the next round via 'Winner M##'", () => {
    const r32Match = knockoutMatch({
      match_number: 73,
      status: "finished",
      home_team: A1, away_team: B2,
      home_score: 2, away_score: 1,
    });
    const r16Match = knockoutMatch({
      match_number: 89,
      home_placeholder: "Winner M73",
    });
    const result = projectKnockoutBracket(
      emptyBracketInput({ roundOf32: [r32Match], roundOf16: [r16Match] })
    );

    expect(result.roundOf16[0].home_team?.id).toBe("A1");
    expect(result.roundOf16[0].home_team_projected).toBe(true);
  });

  it("resolves the winner of a match decided by penalties using advancing_team_id, not the level score", () => {
    const r32Match = knockoutMatch({
      match_number: 73,
      status: "finished",
      home_team: A1, away_team: B2,
      home_score: 1, away_score: 1,
      advancing_team_id: "B2",
    });
    const r16Match = knockoutMatch({ match_number: 89, home_placeholder: "Winner M73" });
    const result = projectKnockoutBracket(
      emptyBracketInput({ roundOf32: [r32Match], roundOf16: [r16Match] })
    );

    expect(result.roundOf16[0].home_team?.id).toBe("B2");
  });

  it("resolves 'Loser M##' to the team eliminated by penalties", () => {
    const semi = knockoutMatch({
      match_number: 101,
      status: "finished",
      home_team: A1, away_team: B2,
      home_score: 1, away_score: 1,
      advancing_team_id: "B2",
    });
    const thirdPlace = knockoutMatch({ match_number: 103, home_placeholder: "Loser M101" });
    const result = projectKnockoutBracket(
      emptyBracketInput({ semiFinals: [semi], thirdPlace: [thirdPlace] })
    );

    expect(result.thirdPlace[0].home_team?.id).toBe("A1");
  });

  it("keeps the next round as a placeholder when a level match has no advancing_team_id recorded yet", () => {
    const r32Match = knockoutMatch({
      match_number: 73,
      status: "finished",
      home_team: A1, away_team: B2,
      home_score: 1, away_score: 1,
      advancing_team_id: null,
    });
    const r16Match = knockoutMatch({ match_number: 89, home_placeholder: "Winner M73" });
    const result = projectKnockoutBracket(
      emptyBracketInput({ roundOf32: [r32Match], roundOf16: [r16Match] })
    );

    expect(result.roundOf16[0].home_team).toBeNull();
  });

  it("keeps the next round as a placeholder while the previous match is still unplayed", () => {
    const r32Match = knockoutMatch({
      match_number: 73,
      status: "scheduled",
      home_placeholder: "Winner Group A",
      away_placeholder: "Runner-up Group B",
    });
    const r16Match = knockoutMatch({ match_number: 89, home_placeholder: "Winner M73" });
    const result = projectKnockoutBracket(
      emptyBracketInput({ roundOf32: [r32Match], roundOf16: [r16Match] })
    );

    // R32 slot itself IS projected (group leader known)...
    expect(result.roundOf32[0].home_team?.id).toBe("A1");
    // ...but the match hasn't been played, so R16 can't know its winner yet.
    expect(result.roundOf16[0].home_team).toBeNull();
  });

  it("chains projections across three rounds (group → R32 winner → R16 winner)", () => {
    const r32Match = knockoutMatch({
      match_number: 73,
      status: "finished",
      home_placeholder: "Winner Group A",
      away_placeholder: "Runner-up Group B",
      home_score: 3, away_score: 0,
    });
    const r16Match = knockoutMatch({
      match_number: 89,
      status: "finished",
      home_placeholder: "Winner M73",
      away_team: team("FRA"),
      home_score: 2, away_score: 0,
    });
    const qfMatch = knockoutMatch({ match_number: 97, home_placeholder: "Winner M89" });

    const result = projectKnockoutBracket(
      emptyBracketInput({ roundOf32: [r32Match], roundOf16: [r16Match], quarterFinals: [qfMatch] })
    );

    expect(result.roundOf32[0].home_team?.id).toBe("A1");      // Winner Group A
    expect(result.roundOf16[0].home_team?.id).toBe("A1");      // Winner M73 = A1 (won 3-0)
    expect(result.quarterFinals[0].home_team?.id).toBe("A1");  // Winner M89 = A1 (won 2-0)
  });

  it("does not alter persisted scores or status of any match", () => {
    const r32Match = knockoutMatch({
      match_number: 73, status: "finished",
      home_team: A1, away_team: B2, home_score: 2, away_score: 1,
    });
    const result = projectKnockoutBracket(emptyBracketInput({ roundOf32: [r32Match] }));

    expect(result.roundOf32[0].status).toBe("finished");
    expect(result.roundOf32[0].home_score).toBe(2);
    expect(result.roundOf32[0].away_score).toBe(1);
  });
});
