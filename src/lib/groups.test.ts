import { describe, it, expect } from "vitest";
import { computeProjectedPrizes, type LeaderboardEntry, type PrizePool } from "./groups";

// ── Fixtures ──────────────────────────────────────────────────────────

function entry(
  user_id: string,
  total_points: number,
  rank: number,
): LeaderboardEntry {
  return {
    user_id,
    display_name: user_id,
    total_points,
    exact_count: 0,
    result_count: 0,
    pred_count: 0,
    rank,
  };
}

const POOL: PrizePool = {
  config: { entry_fee: 0, first_place_pct: 0, second_place_pct: 0 },
  member_count: 4,
  total: 1_000_000,
  first_prize: 750_000,
  second_prize: 250_000,
};

// Rank values below mirror what get_group_leaderboard now returns: RANK()
// ordered strictly by total_points, with no exact_count/result_count
// tiebreaker — ties always share a rank, and the next rank skips ahead.

describe("computeProjectedPrizes — tie handling (ignores all tiebreakers)", () => {
  it("no ties: standard 1st/2nd split", () => {
    const entries = [
      entry("A", 135, 1),
      entry("B", 129, 2),
      entry("C", 120, 3),
    ];
    const result = computeProjectedPrizes(POOL, entries);
    expect(result.get("A")).toEqual({ amount: 750_000, isSplit: false });
    expect(result.get("B")).toEqual({ amount: 250_000, isSplit: false });
    expect(result.get("C")).toEqual({ amount: null, isSplit: false });
  });

  it("tie for 2nd place: pools 2nd prize and splits equally (documented example)", () => {
    const entries = [
      entry("A", 135, 1),
      entry("B", 129, 2),
      entry("C", 129, 2),
      entry("D", 120, 4),
    ];
    const result = computeProjectedPrizes(POOL, entries);
    expect(result.get("A")).toEqual({ amount: 750_000, isSplit: false });
    expect(result.get("B")).toEqual({ amount: 125_000, isSplit: true });
    expect(result.get("C")).toEqual({ amount: 125_000, isSplit: true });
    expect(result.get("D")).toEqual({ amount: null, isSplit: false });
  });

  it("tie for 1st between two users: pools 1st+2nd prize and splits equally", () => {
    const entries = [
      entry("A", 135, 1),
      entry("B", 135, 1),
      entry("C", 120, 3),
    ];
    const result = computeProjectedPrizes(POOL, entries);
    expect(result.get("A")).toEqual({ amount: 500_000, isSplit: true });
    expect(result.get("B")).toEqual({ amount: 500_000, isSplit: true });
    expect(result.get("C")).toEqual({ amount: null, isSplit: false });
  });

  it("triple tie for 1st: pools 1st+2nd+3rd ($0) prize and splits three ways", () => {
    const entries = [
      entry("A", 135, 1),
      entry("B", 135, 1),
      entry("C", 135, 1),
    ];
    const result = computeProjectedPrizes(POOL, entries);
    // (750,000 + 250,000 + 0) / 3 = 333,333.33 → rounds to 333,333
    expect(result.get("A")).toEqual({ amount: 333_333, isSplit: true });
    expect(result.get("B")).toEqual({ amount: 333_333, isSplit: true });
    expect(result.get("C")).toEqual({ amount: 333_333, isSplit: true });
  });

  it("ignores exact_count/result_count entirely — only total_points and rank matter", () => {
    const a = { ...entry("A", 129, 2), exact_count: 5, result_count: 5 };
    const b = { ...entry("B", 129, 2), exact_count: 0, result_count: 0 };
    const first = entry("Leader", 135, 1);
    const result = computeProjectedPrizes(POOL, [first, a, b]);
    // Same rank (2) despite wildly different exact/result stats → same split.
    expect(result.get("A")).toEqual({ amount: 125_000, isSplit: true });
    expect(result.get("B")).toEqual({ amount: 125_000, isSplit: true });
  });

  it("pre-tournament (all zero points): no projections for anyone", () => {
    const entries = [entry("A", 0, 1), entry("B", 0, 1)];
    const result = computeProjectedPrizes(POOL, entries);
    expect(result.get("A")).toEqual({ amount: null, isSplit: false });
    expect(result.get("B")).toEqual({ amount: null, isSplit: false });
  });
});
