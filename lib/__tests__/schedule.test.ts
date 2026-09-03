import { describe, it, expect } from "vitest";
import { buildSchedule, countGroupMatchdays } from "@/lib/tournament/schedule";
import { DEFAULT_FORMAT_CONFIG } from "@/lib/tournament/types";
import type { CompetitionConfig } from "@/lib/tournament/types";

const makeTeams = (n: number, group: "A" | "B"): string[] =>
  Array.from({ length: n }, (_, i) => `${group}${i + 1}`);

describe("buildSchedule", () => {
  const config: CompetitionConfig = DEFAULT_FORMAT_CONFIG;
  const fixtures = buildSchedule(
    "comp-1",
    config,
    { group: "A", teamIds: makeTeams(10, "A") },
    { group: "B", teamIds: makeTeams(10, "B") },
    1,
  );

  it("runs two intra-group round-robins of 9 rounds each (single leg)", () => {
    const intra = fixtures.filter((f) => f.stage === "group" && f.phase === "intra_group");
    expect(intra).toHaveLength(2 * 9 * 5 * 2); // phases * rounds * pairings * groups
    expect(intra.every((f) => f.leg === 1)).toBe(true);
  });

  it("runs a full cross-group round-robin: 10 rounds of 10 ties", () => {
    const cross = fixtures.filter((f) => f.stage === "group" && f.phase === "cross_group");
    expect(cross).toHaveLength(10 * 10);
    const gws = new Set(cross.map((f) => f.gw));
    expect(gws.size).toBe(10);
    expect(cross.every((f) => f.leg === 1)).toBe(true);
  });

  it("paces group stage across MD1-28 with a bye before the knockout", () => {
    const group = fixtures.filter((f) => f.stage === "group");
    const ko = fixtures.filter((f) => f.stage === "knockout");
    expect(Math.min(...group.map((f) => f.gw))).toBe(1);
    expect(Math.max(...group.map((f) => f.gw))).toBe(28);
    const firstKo = Math.min(...ko.map((f) => f.gw));
    expect(firstKo).toBe(30); // GW29 is the bye
  });

  it("places the final on GW38", () => {
    const final = fixtures.find((f) => f.phase === "final");
    expect(final).toBeDefined();
    expect(final?.gw).toBe(38);
  });

  it("first round of the knockout is two-legged on GW30-31", () => {
    const q1 = fixtures.filter((f) => f.phase === "q1");
    expect(q1).toHaveLength(2);
    const [leg1, leg2] = q1;
    expect(leg1?.gw).toBe(30);
    expect(leg2?.gw).toBe(31);
    expect(leg1?.home_team_id).toBe(leg2?.away_team_id);
  });

  it("second round knockout lands on GW32-33", () => {
    const q5 = fixtures.find((f) => f.phase === "q5");
    expect(q5?.gw).toBe(32);
    const e7 = fixtures.find((f) => f.phase === "e7");
    expect(e7?.gw).toBe(33);
  });

  it("plays Q7 and the triangular decider on the same GW36", () => {
    const q7 = fixtures.find((f) => f.phase === "q7");
    expect(q7?.gw).toBe(36);
    const decider = fixtures.filter((f) => f.phase === "decider");
    expect(decider).toHaveLength(3);
    expect(new Set(decider.map((f) => f.gw)).size).toBe(1);
    expect(decider[0]?.gw).toBe(36);
  });

  it("leaves knockout team ids null until results resolve", () => {
    const ko = fixtures.filter((f) => f.stage === "knockout");
    expect(ko.every((f) => f.home_team_id === null && f.away_team_id === null)).toBe(true);
  });

  it("assigns a unique tie index per tie with contiguous legs sharing a gameweek run", () => {
    const byTie = new Map<number, typeof fixtures>();
    for (const f of fixtures) {
      const arr = byTie.get(f.tie_index) ?? [];
      arr.push(f);
      byTie.set(f.tie_index, arr);
    }
    const indexes = [...byTie.keys()].sort((a, b) => a - b);
    expect(indexes).toEqual(Array.from({ length: indexes.length }, (_, i) => i + 1));
    for (const rows of byTie.values()) {
      expect(new Set(rows.map((r) => r.phase)).size).toBe(1);
      const gws = rows.map((r) => r.gw);
      expect(new Set(gws).size).toBe(gws.length);
      const legs = rows.map((r) => r.leg).sort((a, b) => a - b);
      expect(legs).toEqual(Array.from({ length: legs.length }, (_, i) => i + 1));
    }
  });

  it("handles an odd roster (byes) without breaking structure", () => {
    const odd = buildSchedule(
      "comp-odd",
      config,
      { group: "A", teamIds: makeTeams(9, "A") },
      { group: "B", teamIds: makeTeams(10, "B") },
      1,
    );
    const intra = odd.filter((f) => f.stage === "group" && f.phase === "intra_group");
    expect(intra.length).toBeGreaterThan(0);
    const nullTeams = intra.filter((f) => f.home_team_id === null || f.away_team_id === null);
    expect(nullTeams).toHaveLength(0);
  });
});

describe("countGroupMatchdays", () => {
  it("counts two intra RRs plus the full cross RR for 10-team groups", () => {
    expect(countGroupMatchdays(DEFAULT_FORMAT_CONFIG, 10, 10)).toBe(28);
  });

  it("counts matchdays for unequal groups using the larger size", () => {
    expect(countGroupMatchdays(DEFAULT_FORMAT_CONFIG, 9, 10)).toBe(28);
  });
});