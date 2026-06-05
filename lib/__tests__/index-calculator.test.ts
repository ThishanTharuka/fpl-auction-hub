import { describe, it, expect } from "vitest";
import {
  calculateIndex,
  applyIndexToPlayers,
  DEFAULT_WEIGHTS,
} from "@/lib/index-calculator";
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
  points_per_game: "4.0",
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

function makePlayer(overrides: Partial<EnrichedPlayer>): EnrichedPlayer {
  return { ...basePlayer, ...overrides };
}

describe("getRawValue", () => {
  it("is tested indirectly through calculateIndex", () => {
    const p = makePlayer({ goals_scored: 7, assists: 3 });
    makePlayer({ goals_scored: 3, assists: 1 });
    const bounds = {
      goals_scored: { min: 3, max: 7 },
      assists: { min: 1, max: 3 },
      total_points: { min: 100, max: 100 },
      points_per_game: { min: 0, max: 0 },
      form: { min: 0, max: 0 },
      value: { min: 0, max: 0 },
      ict_index: { min: 0, max: 0 },
      influence: { min: 0, max: 0 },
      creativity: { min: 0, max: 0 },
      threat: { min: 0, max: 0 },
      xg: { min: 0, max: 0 },
      xa: { min: 0, max: 0 },
      xgi: { min: 0, max: 0 },
      xgc: { min: 0, max: 0 },
      clean_sheets: { min: 0, max: 0 },
      goals_conceded: { min: 0, max: 0 },
      bonus: { min: 0, max: 0 },
      bps: { min: 0, max: 0 },
      minutes: { min: 0, max: 0 },
      selected_by_percent: { min: 0, max: 0 },
      avg_fdr_next5: { min: 0, max: 0 },
    };

    const result = calculateIndex(p, { ...DEFAULT_WEIGHTS, goals_scored: 0.5, assists: 0.5 }, bounds);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe("normalize", () => {
  it("returns 0 when all values are identical", () => {
    const players = [
      makePlayer({ total_points: 50 }),
      makePlayer({ total_points: 50 }),
    ];
    const indexed = applyIndexToPlayers(players, { ...DEFAULT_WEIGHTS, total_points: 1 });
    expect(indexed[0]!.index_score).toBe(0);
    expect(indexed[1]!.index_score).toBe(0);
  });

  it("normalizes to 0-1 range across the player pool", () => {
    const players = [
      makePlayer({ goals_scored: 0 }),
      makePlayer({ goals_scored: 10 }),
      makePlayer({ goals_scored: 20 }),
    ];
    const indexed = applyIndexToPlayers(players, { ...DEFAULT_WEIGHTS, goals_scored: 1 });
    expect(indexed.find((p) => p.goals_scored === 20)!.index_score).toBe(1);
    expect(indexed.find((p) => p.goals_scored === 0)!.index_score).toBe(0);
    expect(indexed.find((p) => p.goals_scored === 10)!.index_score).toBe(0.5);
  });
});

describe("inverted stats", () => {
  it("inverts xgc so lower raw value scores higher", () => {
    const players = [
      makePlayer({ expected_goals_conceded: "5" }),
      makePlayer({ expected_goals_conceded: "25" }),
    ];
    const indexed = applyIndexToPlayers(players, { ...DEFAULT_WEIGHTS, xgc: 1 });
    expect(indexed[0]!.id).toBe(1);
    expect(indexed[0]!.index_score).toBeGreaterThan(indexed[1]!.index_score);
  });

  it("inverts goals_conceded so lower raw value scores higher", () => {
    const players = [
      makePlayer({ goals_conceded: 10 }),
      makePlayer({ goals_conceded: 40 }),
    ];
    const indexed = applyIndexToPlayers(players, { ...DEFAULT_WEIGHTS, goals_conceded: 1 });
    expect(indexed[0]!.id).toBe(1);
    expect(indexed[0]!.index_score).toBeGreaterThan(indexed[1]!.index_score);
  });

  it("inverts avg_fdr_next5 so lower raw value scores higher", () => {
    const players = [
      makePlayer({ avg_fdr_next5: 2 }),
      makePlayer({ avg_fdr_next5: 5 }),
    ];
    const indexed = applyIndexToPlayers(players, { ...DEFAULT_WEIGHTS, avg_fdr_next5: 1 });
    expect(indexed[0]!.id).toBe(1);
    expect(indexed[0]!.index_score).toBeGreaterThan(indexed[1]!.index_score);
  });
});

describe("calculateIndex", () => {
  it("returns score and normalized values for a player", () => {
    const p = makePlayer({});
    makePlayer({ id: 2, goals_scored: 20 });
    const bounds = {
      total_points: { min: 100, max: 100 },
      points_per_game: { min: 0, max: 0 },
      form: { min: 0, max: 0 },
      value: { min: 0, max: 0 },
      ict_index: { min: 0, max: 0 },
      influence: { min: 0, max: 0 },
      creativity: { min: 0, max: 0 },
      threat: { min: 0, max: 0 },
      xg: { min: 0, max: 0 },
      xa: { min: 0, max: 0 },
      xgi: { min: 0, max: 0 },
      xgc: { min: 0, max: 0 },
      goals_scored: { min: 10, max: 20 },
      assists: { min: 5, max: 5 },
      clean_sheets: { min: 0, max: 0 },
      goals_conceded: { min: 0, max: 0 },
      bonus: { min: 0, max: 0 },
      bps: { min: 0, max: 0 },
      minutes: { min: 0, max: 0 },
      selected_by_percent: { min: 0, max: 0 },
      avg_fdr_next5: { min: 0, max: 0 },
    };

    const result = calculateIndex(p, { ...DEFAULT_WEIGHTS, goals_scored: 0.5, assists: 0.5 }, bounds);
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("normalized");
    expect(result.normalized.goals_scored).toBe(0);
    expect(typeof result.score).toBe("number");
  });
});

describe("buildNormalizationBounds", () => {
  it("handles empty player array", () => {
    const result = applyIndexToPlayers([]);
    expect(result).toEqual([]);
  });

  it("handles single player", () => {
    const player = makePlayer({ total_points: 99 });
    const result = applyIndexToPlayers([player]);
    expect(result).toHaveLength(1);
    expect(result[0]!.index_score).toBe(0);
  });
});

describe("applyIndexToPlayers", () => {
  it("returns sorted by index_score descending", () => {
    const players = [
      makePlayer({ id: 1, goals_scored: 5, assists: 1 }),
      makePlayer({ id: 2, goals_scored: 20, assists: 10 }),
      makePlayer({ id: 3, goals_scored: 10, assists: 5 }),
    ];
    const weights = { ...DEFAULT_WEIGHTS, goals_scored: 0.5, assists: 0.5 };
    const result = applyIndexToPlayers(players, weights);
    expect(result[0]!.id).toBe(2);
    expect(result[1]!.id).toBe(3);
    expect(result[2]!.id).toBe(1);
  });

  it("uses DEFAULT_WEIGHTS when no weights provided", () => {
    const players = [makePlayer({})];
    const result = applyIndexToPlayers(players);
    expect(result).toHaveLength(1);
    expect(result[0]!.index_score).toBe(0);
  });

  it("adds index_score and normalized to each player", () => {
    const players = [
      makePlayer({ goals_scored: 10 }),
      makePlayer({ goals_scored: 20 }),
    ];
    const result = applyIndexToPlayers(players, { ...DEFAULT_WEIGHTS, goals_scored: 1 });
    expect(result[0]!).toHaveProperty("index_score");
    expect(result[0]!).toHaveProperty("normalized");
    expect(result[0]!.normalized.goals_scored).toBeDefined();
  });

  it("handles string stat values (points_per_game, form, etc.)", () => {
    const players = [
      makePlayer({ id: 1, points_per_game: "2.0", form: "1.5" }),
      makePlayer({ id: 2, points_per_game: "6.0", form: "7.5" }),
    ];
    const weights = { ...DEFAULT_WEIGHTS, points_per_game: 0.5, form: 0.5 };
    const result = applyIndexToPlayers(players, weights);
    expect(result[0]!.id).toBe(2);
    expect(result[1]!.id).toBe(1);
  });
});
