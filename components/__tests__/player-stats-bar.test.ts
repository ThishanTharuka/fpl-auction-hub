import { describe, it, expect } from "vitest";
import { buildStats, metricTone } from "@/components/player-stats-bar";
import type { EnrichedPlayer } from "@/lib/fpl-types";

const basePlayer: EnrichedPlayer = {
  id: 1,
  code: 1,
  first_name: "Test",
  second_name: "Player",
  web_name: "Test",
  photo: "",
  team: 1,
  team_code: 1,
  element_type: 3,
  now_cost: 50,
  total_points: 100,
  points_per_game: "4.5",
  selected_by_percent: "10.0",
  form: "3.0",
  value_form: "",
  value_season: "",
  minutes: 1000,
  goals_scored: 10,
  assists: 5,
  clean_sheets: 3,
  goals_conceded: 20,
  yellow_cards: 2,
  red_cards: 0,
  saves: 0,
  bonus: 5,
  bps: 200,
  influence: "100",
  creativity: "80",
  threat: "90",
  ict_index: "270",
  expected_goals: "8.0",
  expected_assists: "4.0",
  expected_goal_involvements: "12.0",
  expected_goals_conceded: "15.0",
  starts: 20,
  transfers_in_event: 0,
  transfers_out_event: 0,
  status: "a",
  news: "",
  news_added: null,
  chance_of_playing_next_round: null,
  chance_of_playing_this_round: null,
  full_name: "Test Player",
  image_url: "",
  team_crest_url: "",
  team_name: "Test FC",
  team_short: "TFC",
  position: "MID",
  price: 5.0,
  avg_fdr_next5: 3.0,
};

function makePlayer(position: EnrichedPlayer["position"], overrides?: Partial<EnrichedPlayer>): EnrichedPlayer {
  return { ...basePlayer, position, ...overrides };
}

describe("buildStats", () => {
  it("returns GKP-specific stats for goalkeepers", () => {
    const stats = buildStats(makePlayer("GKP"));
    const labels = stats.map((s) => s.label);
    expect(labels).toContain("Saves");
    expect(labels).toContain("CS");
    expect(labels).toContain("xGC");
    expect(labels).toContain("Bonus");
    expect(labels).toContain("Starts");
    expect(labels).toContain("FDR");
    expect(labels).toContain("Pts");
    expect(labels).toContain("PPG");
    expect(labels).not.toContain("Goals");
    expect(labels).not.toContain("Assists");
  });

  it("returns DEF-specific stats for defenders", () => {
    const stats = buildStats(makePlayer("DEF"));
    const labels = stats.map((s) => s.label);
    expect(labels).toContain("CS");
    expect(labels).toContain("xGC");
    expect(labels).toContain("Goals");
    expect(labels).toContain("Bonus");
    expect(labels).toContain("Starts");
    expect(labels).toContain("FDR");
    expect(labels).not.toContain("Saves");
    expect(labels).not.toContain("xGI");
  });

  it("returns MID-specific stats for midfielders", () => {
    const stats = buildStats(makePlayer("MID"));
    const labels = stats.map((s) => s.label);
    expect(labels).toContain("Goals");
    expect(labels).toContain("Assists");
    expect(labels).toContain("xGI");
    expect(labels).toContain("Creat");
    expect(labels).toContain("Starts");
    expect(labels).toContain("FDR");
    expect(labels).not.toContain("Saves");
    expect(labels).not.toContain("xGC");
  });

  it("returns FWD-specific stats for forwards", () => {
    const stats = buildStats(makePlayer("FWD"));
    const labels = stats.map((s) => s.label);
    expect(labels).toContain("Goals");
    expect(labels).toContain("xG");
    expect(labels).toContain("Assists");
    expect(labels).toContain("Threat");
    expect(labels).toContain("Starts");
    expect(labels).toContain("FDR");
    expect(labels).not.toContain("Saves");
    expect(labels).not.toContain("Creat");
  });

  it("returns exactly 8 stats for every position", () => {
    for (const pos of ["GKP", "DEF", "MID", "FWD"] as const) {
      expect(buildStats(makePlayer(pos))).toHaveLength(8);
    }
  });

  it("rounds decimal values to expected precision", () => {
    const stats = buildStats(makePlayer("GKP", { expected_goals_conceded: "12.345" }));
    const xgcStat = stats.find((s) => s.label === "xGC");
    expect(xgcStat!.value).toBe("12.3");
  });
});

describe("metricTone", () => {
  it("returns green tone for Pts", () => {
    const tone = metricTone("Pts");
    expect(tone.chip).toContain("#00e478");
  });

  it("returns green tone for Goals", () => {
    const tone = metricTone("Goals");
    expect(tone.chip).toContain("#00e478");
  });

  it("returns yellow tone for FDR", () => {
    const tone = metricTone("FDR");
    expect(tone.chip).toContain("#f4d47a");
  });

  it("returns blue tone for Starts", () => {
    const tone = metricTone("Starts");
    expect(tone.chip).toContain("#8fd0ff");
  });

  it("returns default tone for unknown labels", () => {
    const tone = metricTone("xG");
    expect(tone.chip).toContain("#c8dcf0");
  });
});
