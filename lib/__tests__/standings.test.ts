import { describe, it, expect } from "vitest";
import { computeGroupStandings } from "@/lib/tournament/standings";
import { DEFAULT_FORMAT_CONFIG } from "@/lib/tournament/types";
import type {
  CompetitionFixtureRow,
  CompetitionTeamRow,
} from "@/lib/tournament/types";

const config = DEFAULT_FORMAT_CONFIG;

const team = (
  id: string,
  name: string,
  group: "A" | "B" = "A",
): CompetitionTeamRow => ({
  id,
  competition_id: "c1",
  group_label: group,
  participant_id: id,
  league_id: "l1",
  name,
  color: null,
  avatar_url: null,
  fpl_manager_id: null,
  team_number: 1,
  created_at: "",
});

const fixture = (
  phase: string,
  tieIndex: number,
  leg: number,
  home: string,
  away: string,
  hp: number,
  ap: number,
  scored = true,
): CompetitionFixtureRow => ({
  id: `f-${phase}-${tieIndex}-${leg}`,
  competition_id: "c1",
  stage: "group",
  phase,
  tie_index: tieIndex,
  leg,
  gw: 1,
  home_team_id: home,
  away_team_id: away,
  home_points: scored ? hp : null,
  away_points: scored ? ap : null,
  status: scored ? "scored" : "scheduled",
  created_at: "",
});

describe("computeGroupStandings", () => {
  it("awards 3/1/0 and tracks goal difference across legs", () => {
    const teams = [
      team("a1", "Alpha"),
      team("a2", "Bravo"),
      team("a3", "Charlie"),
      team("a4", "Delta"),
    ];
    const fixtures = [
      // two-leg ties (legs 1 and 2, home/away swapped)
      fixture("intra_group", 1, 1, "a1", "a2", 60, 55),
      fixture("intra_group", 1, 2, "a2", "a1", 50, 40),
      fixture("intra_group", 2, 1, "a3", "a4", 50, 45),
      fixture("intra_group", 2, 2, "a4", "a3", 55, 60),
    ];

    const standings = computeGroupStandings(teams, fixtures, config);

    // a1 vs a2 aggregate: 60+40=100 vs 55+50=105 -> a2 wins
    const a1 = standings.find((s) => s.teamId === "a1");
    const a2 = standings.find((s) => s.teamId === "a2");
    expect(a2?.points).toBe(3);
    expect(a2?.goalDiff).toBe(105 - 100);
    expect(a1?.points).toBe(0);
  });

  it("counts draws as one point each", () => {
    const teams = [team("a1", "Alpha"), team("a2", "Bravo")];
    const fixtures = [fixture("intra_group", 1, 1, "a1", "a2", 50, 50)];
    const standings = computeGroupStandings(teams, fixtures, config);
    expect(standings.find((s) => s.teamId === "a1")?.points).toBe(1);
    expect(standings.find((s) => s.teamId === "a2")?.points).toBe(1);
  });

  it("applies the head_to_head tiebreaker after points and goal difference", () => {
    const teams = [team("x1", "Zed"), team("y1", "Aardvark"), team("z1", "Middle")];
    const fixtures = [
      fixture("intra_group", 1, 1, "x1", "y1", 60, 50), // x beats y
      fixture("intra_group", 2, 1, "x1", "z1", 40, 55), // z beats x
      fixture("intra_group", 3, 1, "y1", "z1", 70, 65), // y beats z
    ];
    const standings = computeGroupStandings(teams, fixtures, config);

    // all on 3 points; x (-5) and y (-5) tie on gd; x beat y head-to-head
    expect(standings.map((s) => s.teamId)).toEqual(["z1", "x1", "y1"]);
  });

  it("skips ties that are not fully scored", () => {
    const teams = [team("a1", "Alpha"), team("a2", "Bravo")];
    const fixtures = [fixture("intra_group", 1, 1, "a1", "a2", 50, 40, false)];
    const standings = computeGroupStandings(teams, fixtures, config);
    expect(standings.find((s) => s.teamId === "a1")?.played).toBe(0);
    expect(standings.find((s) => s.teamId === "a1")?.points).toBe(0);
  });
});