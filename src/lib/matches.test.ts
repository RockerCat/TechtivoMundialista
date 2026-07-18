import { describe, it, expect } from "vitest";
import { PHASE_SCORING, SCORING_TABLE_ROWS, scoringRowStage } from "./matches";

describe("PHASE_SCORING", () => {
  it("awards points per stage, with third place matching the final", () => {
    expect(PHASE_SCORING.group).toEqual({ exact: 3, result: 1 });
    expect(PHASE_SCORING.round_of_32).toEqual({ exact: 4, result: 2 });
    expect(PHASE_SCORING.round_of_16).toEqual({ exact: 5, result: 3 });
    expect(PHASE_SCORING.quarter_final).toEqual({ exact: 6, result: 4 });
    expect(PHASE_SCORING.semi_final).toEqual({ exact: 7, result: 5 });
    expect(PHASE_SCORING.third_place).toEqual({ exact: 8, result: 6 });
    expect(PHASE_SCORING.final).toEqual({ exact: 8, result: 6 });
  });
});

describe("scoringRowStage", () => {
  it("maps the third place match onto the Finales row, others pass through", () => {
    expect(scoringRowStage("group")).toBe("group");
    expect(scoringRowStage("round_of_32")).toBe("round_of_32");
    expect(scoringRowStage("round_of_16")).toBe("round_of_16");
    expect(scoringRowStage("quarter_final")).toBe("quarter_final");
    expect(scoringRowStage("semi_final")).toBe("semi_final");
    expect(scoringRowStage("third_place")).toBe("final");
    expect(scoringRowStage("final")).toBe("final");
  });

  it("only ever highlights a single row of the scoring table", () => {
    const stages = ["group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"] as const;
    for (const currentStage of stages) {
      const currentRowStage = scoringRowStage(currentStage);
      const matches = SCORING_TABLE_ROWS.filter((row) => row.stage === currentRowStage);
      expect(matches.length).toBe(1);
    }
  });
});

describe("SCORING_TABLE_ROWS", () => {
  it("labels the final row 'Finales' to represent both the third place match and the Final", () => {
    const finalRow = SCORING_TABLE_ROWS.find((row) => row.stage === "final");
    expect(finalRow?.label).toBe("Finales");
  });
});
