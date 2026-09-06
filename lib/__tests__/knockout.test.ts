import { describe, it, expect } from "vitest";
import { buildTwoPathBracket } from "@/lib/tournament/knockout-two-path";
import {
  computeTieOutcomes,
  resolveKnockoutPlacement,
} from "@/lib/tournament/knockout";
import type { CompetitionFixtureRow } from "@/lib/tournament/types";

const bracket = buildTwoPathBracket();

const koFixture = (
  phase: string,
  tieIndex: number,
  leg: number,
  home: string,
  away: string,
  hp: number,
  ap: number,
): CompetitionFixtureRow => ({
  id: `f-${phase}-${tieIndex}-${leg}`,
  competition_id: "c1",
  stage: "knockout",
  phase,
  tie_index: tieIndex,
  leg,
  gw: 1,
  home_team_id: home,
  away_team_id: away,
  home_points: hp,
  away_points: ap,
  status: "scored",
  created_at: "",
});

const twoLeg = (
  phase: string,
  tieIndex: number,
  home: string,
  away: string,
  homeTotal: number,
  awayTotal: number,
): CompetitionFixtureRow[] => {
  const leg1Home = Math.round(homeTotal / 2);
  const leg1Away = Math.round(awayTotal / 2);
  const leg2Home = homeTotal - leg1Home;
  const leg2Away = awayTotal - leg1Away;
  return [
    koFixture(phase, tieIndex, 1, home, away, leg1Home, leg1Away),
    koFixture(phase, tieIndex, 2, away, home, leg2Away, leg2Home),
  ];
};

const seeds = {
  A: ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"],
  B: ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"],
};

const firstRoundScored = [
  ...twoLeg("q1", 1, "a1", "b1", 150, 110),
  ...twoLeg("q2", 2, "a2", "b2", 130, 120),
  ...twoLeg("q3", 3, "a3", "b3", 100, 140),
  ...twoLeg("q4", 4, "a4", "b4", 160, 90),
  ...twoLeg("e1", 5, "a5", "b5", 120, 100),
  ...twoLeg("e2", 6, "a6", "b6", 110, 105),
  ...twoLeg("e3", 7, "a7", "b7", 90, 130),
  ...twoLeg("e4", 8, "a8", "b8", 140, 80),
];

describe("computeTieOutcomes", () => {
  it("aggregates two-leg ties and picks the winner", () => {
    const outcomes = computeTieOutcomes(firstRoundScored);
    expect(outcomes.get("q1")).toEqual({ phase: "q1", winnerId: "a1", loserId: "b1" });
    expect(outcomes.get("q3")).toEqual({ phase: "q3", winnerId: "b3", loserId: "a3" });
  });

  it("resolves level aggregates on the second-leg away team", () => {
    const tied = [
      koFixture("q1", 1, 1, "a1", "b1", 50, 50),
      koFixture("q1", 1, 2, "b1", "a1", 40, 60), // away (a1) higher on leg 2
    ];
    const outcomes = computeTieOutcomes(tied);
    expect(outcomes.get("q1")).toEqual({ phase: "q1", winnerId: "a1", loserId: "b1" });
  });

  it("returns nulls for unscored ties", () => {
    const unscored: CompetitionFixtureRow[] = [
      { ...koFixture("q5", 10, 1, "a1", "a4", 0, 0), home_points: null, away_points: null },
    ];
    const outcomes = computeTieOutcomes(unscored);
    expect(outcomes.get("q5")).toEqual({ phase: "q5", winnerId: null, loserId: null });
  });

  it("picks the triangular decider winner by total points", () => {
    const decider = [
      koFixture("decider", 21, 1, "d1", "d2", 90, 80),
      koFixture("decider", 22, 1, "d1", "d3", 90, 70),
      koFixture("decider", 23, 1, "d2", "d3", 80, 70),
    ];
    const outcomes = computeTieOutcomes(decider);
    expect(outcomes.get("decider")?.winnerId).toBe("d1");
  });
});

describe("resolveKnockoutPlacement", () => {
  it("maps seeds into the first round and winners/losers into the second", () => {
    const outcomes = computeTieOutcomes(firstRoundScored);
    const placements = resolveKnockoutPlacement(bracket, outcomes, [
      { group: "A", teamIds: seeds.A },
      { group: "B", teamIds: seeds.B },
    ]);

    const byPhase = new Map(placements.map((p) => [p.phase, p]));
    expect(byPhase.get("q1")).toEqual({ phase: "q1", homeTeamId: "a1", awayTeamId: "b1" });
    expect(byPhase.get("q5")).toEqual({ phase: "q5", homeTeamId: "a1", awayTeamId: "a4" });
    expect(byPhase.get("q6")).toEqual({ phase: "q6", homeTeamId: "a2", awayTeamId: "b3" });
    expect(byPhase.get("e5")).toEqual({ phase: "e5", homeTeamId: "b1", awayTeamId: "b4" });
    expect(byPhase.get("e6")).toEqual({ phase: "e6", homeTeamId: "b2", awayTeamId: "a3" });
    expect(byPhase.get("e7")).toEqual({ phase: "e7", homeTeamId: "a5", awayTeamId: "a8" });
    expect(byPhase.get("e8")).toEqual({ phase: "e8", homeTeamId: "a6", awayTeamId: "b7" });
  });

  it("maps second round winners/losers into the third and fourth rounds", () => {
    const secondRoundScored = [
      ...firstRoundScored,
      ...twoLeg("q5", 9, "a1", "a4", 140, 100), // a1 wins, a4 loses
      ...twoLeg("q6", 10, "a2", "b3", 130, 90), // a2 wins, b3 loses
      ...twoLeg("e5", 11, "b1", "b4", 120, 80), // b1 wins
      ...twoLeg("e6", 12, "b2", "a3", 110, 70), // b2 wins
      ...twoLeg("e7", 13, "a5", "a8", 100, 60), // a5 wins
      ...twoLeg("e8", 14, "a6", "b7", 115, 75), // a6 wins
    ];
    const outcomes = computeTieOutcomes(secondRoundScored);
    const placements = resolveKnockoutPlacement(bracket, outcomes, [
      { group: "A", teamIds: seeds.A },
      { group: "B", teamIds: seeds.B },
    ]);
    const byPhase = new Map(placements.map((p) => [p.phase, p]));

    // Round 3
    expect(byPhase.get("e9")).toEqual({ phase: "e9", homeTeamId: "a4", awayTeamId: "b3" });
    expect(byPhase.get("e10")).toEqual({ phase: "e10", homeTeamId: "b1", awayTeamId: "a6" });
    expect(byPhase.get("e11")).toEqual({ phase: "e11", homeTeamId: "b2", awayTeamId: "a5" });

    // Round 4 (Q7)
    expect(byPhase.get("q7")).toEqual({ phase: "q7", homeTeamId: "a1", awayTeamId: "a2" });
  });

  it("leaves dependent slots unresolved until their feeders are scored", () => {
    const outcomes = computeTieOutcomes([]);
    const placements = resolveKnockoutPlacement(bracket, outcomes, [
      { group: "A", teamIds: seeds.A },
      { group: "B", teamIds: seeds.B },
    ]);
    const byPhase = new Map(placements.map((p) => [p.phase, p]));
    expect(byPhase.get("q5")).toEqual({ phase: "q5", homeTeamId: null, awayTeamId: null });
  });
});