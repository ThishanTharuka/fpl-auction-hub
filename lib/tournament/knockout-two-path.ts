import type { KnockoutEntrant, TwoPathBracket } from "./types";

const seed = (group: "A" | "B", rank: number): KnockoutEntrant => ({
  kind: "seed",
  group,
  rank,
});
const winner = (from: string): KnockoutEntrant => ({ kind: "winner", from });
const loser = (from: string): KnockoutEntrant => ({ kind: "loser", from });

/**
 * two_path_v1 knockout bracket for exactly 8 qualifiers per group (16 total).
 * Group ranks become seeds A1..A8 / B1..B8. gwOffsets are relative to the first
 * knockout gameweek. The triangular "decider" slot pits the three E9/E10/E11
 * winners against each other on a single gameweek; its winner feeds the e13 slot.
 */
export function buildTwoPathBracket(): TwoPathBracket {
  return {
    slots: [
      { phase: "q1", legs: 2, gwOffsets: [0, 1], home: seed("A", 1), away: seed("B", 1), onWin: "q5", onLose: "e5" },
      { phase: "q2", legs: 2, gwOffsets: [0, 1], home: seed("A", 2), away: seed("B", 2), onWin: "q6", onLose: "e6" },
      { phase: "q3", legs: 2, gwOffsets: [0, 1], home: seed("A", 3), away: seed("B", 3), onWin: "q6", onLose: "e6" },
      { phase: "q4", legs: 2, gwOffsets: [0, 1], home: seed("A", 4), away: seed("B", 4), onWin: "q5", onLose: "e5" },
      { phase: "e1", legs: 2, gwOffsets: [0, 1], home: seed("A", 5), away: seed("B", 5), onWin: "e7" },
      { phase: "e2", legs: 2, gwOffsets: [0, 1], home: seed("A", 6), away: seed("B", 6), onWin: "e8" },
      { phase: "e3", legs: 2, gwOffsets: [0, 1], home: seed("A", 7), away: seed("B", 7), onWin: "e8" },
      { phase: "e4", legs: 2, gwOffsets: [0, 1], home: seed("A", 8), away: seed("B", 8), onWin: "e7" },
      { phase: "q5", legs: 2, gwOffsets: [2, 3], home: winner("q1"), away: winner("q4"), onWin: "q7", onLose: "e9" },
      { phase: "q6", legs: 2, gwOffsets: [2, 3], home: winner("q2"), away: winner("q3"), onWin: "q7", onLose: "e9" },
      { phase: "e5", legs: 2, gwOffsets: [2, 3], home: loser("q1"), away: loser("q4"), onWin: "e10" },
      { phase: "e6", legs: 2, gwOffsets: [2, 3], home: loser("q2"), away: loser("q3"), onWin: "e11" },
      { phase: "e7", legs: 2, gwOffsets: [2, 3], home: winner("e1"), away: winner("e4"), onWin: "e11" },
      { phase: "e8", legs: 2, gwOffsets: [2, 3], home: winner("e2"), away: winner("e3"), onWin: "e10" },
      { phase: "e9", legs: 2, gwOffsets: [4, 5], home: loser("q5"), away: loser("q6"), onWin: "decider" },
      { phase: "e10", legs: 2, gwOffsets: [4, 5], home: winner("e5"), away: winner("e8"), onWin: "decider" },
      { phase: "e11", legs: 2, gwOffsets: [4, 5], home: winner("e6"), away: winner("e7"), onWin: "decider" },
      { phase: "q7", legs: 1, gwOffsets: [6], home: winner("q5"), away: winner("q6"), onWin: "final", onLose: "e13" },
      { phase: "e13", legs: 1, gwOffsets: [7], home: loser("q7"), away: winner("decider"), onWin: "final" },
      { phase: "final", legs: 1, gwOffsets: [8], home: winner("q7"), away: winner("e13"), onWin: "" },
    ],
    decider: {
      phase: "decider",
      entrants: [winner("e9"), winner("e10"), winner("e11")],
      gwOffset: 6,
      onWin: "e13",
    },
  };
}