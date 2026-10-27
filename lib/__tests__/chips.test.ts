import { describe, it, expect } from "vitest";
import {
  chipsAllowedForStage,
  computeChipAdjustment,
} from "@/lib/tournament/chips";
import { scoreGameweek } from "@/lib/tournament/scoring";
import type { ManagerGameweekScore } from "@/lib/tournament/scoring";
import type {
  CompetitionFixtureRow,
  CompetitionTeamRow,
} from "@/lib/tournament/types";

const score = (over: Partial<ManagerGameweekScore>): ManagerGameweekScore => ({
  points: 50,
  chip: null,
  captainPoints: null,
  benchPoints: null,
  ...over,
});

describe("chipsAllowedForStage", () => {
  it("always allows chips from the knockout stage onwards", () => {
    expect(chipsAllowedForStage(null, "knockout")).toBe(true);
    expect(chipsAllowedForStage(undefined, "knockout")).toBe(true);
  });

  it("forbids chips in the group stage by default", () => {
    expect(chipsAllowedForStage(null, "group")).toBe(false);
    expect(chipsAllowedForStage({}, "group")).toBe(false);
    expect(
      chipsAllowedForStage({ chip_policy: { league_phase_allowed: false } }, "group"),
    ).toBe(false);
  });

  it("honours an explicit per-tournament opt-in", () => {
    expect(
      chipsAllowedForStage({ chip_policy: { league_phase_allowed: true } }, "group"),
    ).toBe(true);
  });
});

describe("computeChipAdjustment", () => {
  it("records nothing when no chip was played", () => {
    const adj = computeChipAdjustment({
      chip: null,
      points: 50,
      captainPoints: null,
      benchPoints: null,
      allowed: false,
    });
    expect(adj.penalty).toBe(0);
    expect(adj.adjustedPoints).toBe(50);
    expect(adj.note).toBeNull();
    expect(adj.requiresManual).toBe(false);
  });

  it("records nothing when the chip is legal for the stage", () => {
    const adj = computeChipAdjustment({
      chip: "3xc",
      points: 50,
      captainPoints: 12,
      benchPoints: 4,
      allowed: true,
    });
    expect(adj.penalty).toBe(0);
    expect(adj.adjustedPoints).toBe(50);
    expect(adj.note).toBeNull();
    expect(adj.requiresManual).toBe(false);
  });

  it("removes exactly one captain score for an illegal triple captain", () => {
    // The captain scored 6 and counted 3x instead of 2x, so 6 must come off.
    const adj = computeChipAdjustment({
      chip: "3xc",
      points: 46,
      captainPoints: 6,
      benchPoints: 0,
      allowed: false,
    });
    expect(adj.penalty).toBe(6);
    expect(adj.adjustedPoints).toBe(40);
    expect(adj.requiresManual).toBe(false);
    expect(adj.note).toMatchObject({
      chip: "3xc",
      label: "Triple Captain",
      rawPoints: 46,
      penalty: 6,
      adjustedPoints: 40,
      applied: true,
    });
  });

  it("removes the whole bench for an illegal bench boost", () => {
    const adj = computeChipAdjustment({
      chip: "bboost",
      points: 70,
      captainPoints: 10,
      benchPoints: 9,
      allowed: false,
    });
    expect(adj.penalty).toBe(9);
    expect(adj.adjustedPoints).toBe(61);
    expect(adj.requiresManual).toBe(false);
    expect(adj.note?.applied).toBe(true);
  });

  it("flags an illegal wildcard without penalising it", () => {
    const adj = computeChipAdjustment({
      chip: "wildcard",
      points: 50,
      captainPoints: 6,
      benchPoints: 2,
      allowed: false,
    });
    expect(adj.penalty).toBe(0);
    expect(adj.adjustedPoints).toBe(50);
    expect(adj.requiresManual).toBe(false);
    expect(adj.note?.applied).toBe(true);
    expect(adj.note?.reason).toContain("no points impact");
  });

  it("cannot reconstruct a free hit score and asks for manual entry", () => {
    const adj = computeChipAdjustment({
      chip: "freehit",
      points: 80,
      captainPoints: 10,
      benchPoints: 5,
      allowed: false,
    });
    expect(adj.requiresManual).toBe(true);
    expect(adj.penalty).toBe(0);
    expect(adj.manualReason).toContain("Free Hit");
    expect(adj.note?.applied).toBe(false);
  });

  it("falls back to manual entry when live captain data is missing", () => {
    const adj = computeChipAdjustment({
      chip: "3xc",
      points: 46,
      captainPoints: null,
      benchPoints: 0,
      allowed: false,
    });
    expect(adj.requiresManual).toBe(true);
    expect(adj.penalty).toBe(0);
    expect(adj.manualReason).toContain("could not be fetched");
  });

  it("never produces a negative score", () => {
    const adj = computeChipAdjustment({
      chip: "bboost",
      points: 3,
      captainPoints: 0,
      benchPoints: 12,
      allowed: false,
    });
    expect(adj.adjustedPoints).toBe(0);
  });
});

const team = (id: string, manager: number | null): CompetitionTeamRow => ({
  id,
  competition_id: "c1",
  group_label: "A",
  participant_id: id,
  league_id: "l1",
  name: id,
  color: null,
  avatar_url: null,
  fpl_manager_id: manager,
  team_number: 1,
  created_at: "",
});

const fixture = (
  stage: "group" | "knockout",
  home: string,
  away: string,
): CompetitionFixtureRow => ({
  id: `f-${stage}-${home}-${away}`,
  competition_id: "c1",
  stage,
  phase: "intra_group",
  tie_index: 1,
  leg: 1,
  gw: 5,
  home_team_id: home,
  away_team_id: away,
  home_points: null,
  away_points: null,
  status: "scheduled",
  created_at: "",
  home_points_override: null,
  away_points_override: null,
  chip_notes: null,
  override_reason: null,
  overridden_by: null,
  overridden_at: null,
});

describe("scoreGameweek chip policy", () => {
  const teams = [team("t1", 101), team("t2", 102)];

  it("strips a triple captain from a group-stage fixture", async () => {
    const fetchScore = async (): Promise<ManagerGameweekScore | null> =>
      score({ points: 46, chip: "3xc", captainPoints: 6, benchPoints: 0 });

    const result = await scoreGameweek({
      gw: 5,
      teams,
      fixtures: [fixture("group", "t1", "t2")],
      fetchScore,
    });

    expect(result.scored).toEqual([
      { fixtureId: "f-group-t1-t2", homePoints: 40, awayPoints: 40 },
    ]);
    expect(result.manual).toHaveLength(0);
    expect(result.chipNotes["f-group-t1-t2"]?.home).toMatchObject({
      chip: "3xc",
      penalty: 6,
      adjustedPoints: 40,
      applied: true,
    });
  });

  it("leaves a knockout fixture untouched even with a chip", async () => {
    const fetchScore = async (): Promise<ManagerGameweekScore | null> =>
      score({ points: 46, chip: "3xc", captainPoints: 6, benchPoints: 0 });

    const result = await scoreGameweek({
      gw: 5,
      teams,
      fixtures: [fixture("knockout", "t1", "t2")],
      fetchScore,
    });

    expect(result.scored[0]).toEqual({
      fixtureId: "f-knockout-t1-t2",
      homePoints: 46,
      awayPoints: 46,
    });
    expect(result.chipNotes).toEqual({});
  });

  it("routes an unrecoverable free hit to manual entry with a reason", async () => {
    const fetchScore = async (): Promise<ManagerGameweekScore | null> =>
      score({ points: 80, chip: "freehit", captainPoints: 10, benchPoints: 5 });

    const result = await scoreGameweek({
      gw: 5,
      teams,
      fixtures: [fixture("group", "t1", "t2")],
      fetchScore,
    });

    expect(result.scored).toHaveLength(0);
    expect(result.manual.map((f) => f.id)).toEqual(["f-group-t1-t2"]);
    expect(result.manualReasons["f-group-t1-t2"]).toContain("Free Hit");
    expect(result.chipNotes["f-group-t1-t2"]?.home?.applied).toBe(false);
  });

  it("records no chip notes when both managers played no chip", async () => {
    const fetchScore = async (): Promise<ManagerGameweekScore | null> => score({});

    const result = await scoreGameweek({
      gw: 5,
      teams,
      fixtures: [fixture("group", "t1", "t2")],
      fetchScore,
    });

    expect(result.chipNotes).toEqual({});
    expect(result.scored[0]?.homePoints).toBe(50);
  });
});
