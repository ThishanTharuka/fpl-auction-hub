import { describe, it, expect, vi } from "vitest";
import { scoreGameweek } from "@/lib/tournament/scoring";
import type {
  CompetitionFixtureRow,
  CompetitionTeamRow,
} from "@/lib/tournament/types";

const team = (
  id: string,
  manager: number | null,
): CompetitionTeamRow => ({
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
  id: string,
  home: string | null,
  away: string | null,
  status: CompetitionFixtureRow["status"] = "scheduled",
): CompetitionFixtureRow => ({
  id,
  competition_id: "c1",
  stage: "group",
  phase: "intra_group",
  tie_index: 1,
  leg: 1,
  gw: 5,
  home_team_id: home,
  away_team_id: away,
  home_points: null,
  away_points: null,
  status,
  created_at: "",
});

describe("scoreGameweek", () => {
  it("fetches and records points for fixtures with linked managers", async () => {
    const teams = [team("t1", 101), team("t2", 102), team("t3", 103)];
    const fixtures = [
      fixture("f1", "t1", "t2"),
      fixture("f2", "t1", "t3"),
    ];
    const fetchPoints = vi.fn(async (manager: number, gw: number) => manager * 10 + gw);

    const result = await scoreGameweek({
      gw: 5,
      teams,
      fixtures,
      fetchPoints,
    });

    expect(result.scored).toHaveLength(2);
    expect(result.scored[0]).toEqual({ fixtureId: "f1", homePoints: 1015, awayPoints: 1025 });
    expect(fetchPoints).toHaveBeenCalledWith(101, 5);
    expect(result.manual).toHaveLength(0);
  });

  it("flags fixtures whose teams lack an fpl_manager_id for manual entry", async () => {
    const teams = [team("t1", 101), team("t2", null), team("t3", 103)];
    const fixtures = [fixture("f1", "t1", "t2"), fixture("f2", "t2", "t3")];

    const result = await scoreGameweek({
      gw: 5,
      teams,
      fixtures,
      fetchPoints: async () => 50,
    });

    expect(result.scored).toHaveLength(0);
    expect(result.manual.map((f) => f.id)).toEqual(["f1", "f2"]);
  });

  it("re-scores already-scored fixtures (overwrite) and skips unresolved (null team) fixtures", async () => {
    const teams = [team("t1", 101), team("t2", 102)];
    const fixtures = [
      { ...fixture("f1", "t1", "t2"), status: "scored" as const },
      fixture("f2", null, null),
    ];

    const result = await scoreGameweek({
      gw: 5,
      teams,
      fixtures,
      fetchPoints: async () => 50,
    });

    expect(result.scored).toHaveLength(1);
    expect(result.scored[0]?.fixtureId).toBe("f1");
    expect(result.manual).toHaveLength(0);
  });

  it("treats a null upstream points response as needing manual entry", async () => {
    const teams = [team("t1", 101), team("t2", 102)];
    const fixtures = [fixture("f1", "t1", "t2")];

    const result = await scoreGameweek({
      gw: 5,
      teams,
      fixtures,
      fetchPoints: async () => null,
    });

    expect(result.scored).toHaveLength(0);
    expect(result.manual.map((f) => f.id)).toEqual(["f1"]);
  });
});