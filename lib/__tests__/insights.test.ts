import { describe, it, expect } from "vitest";
import {
  calculateMarketRadar,
  calculateExpectedStats,
  calculateValueRoi,
  calculateDifferentials,
  calculateFixtureMatrix,
  calculateStatusWatch,
  calculateGameweekMeta,
} from "@/lib/insights-utils";
import type { EnrichedPlayer, FPLTeam, FPLFixture, FPLEvent } from "@/lib/fpl-types";
import { calculatePriceChangeProgress } from "@/lib/fpl-data";

function createMockPlayer(overrides: Partial<EnrichedPlayer>): EnrichedPlayer {
  return {
    id: 1,
    code: 101,
    first_name: "Erling",
    second_name: "Haaland",
    web_name: "Haaland",
    full_name: "Erling Haaland",
    photo: "101.jpg",
    image_url: "https://example.com/101.png",
    team_crest_url: "https://example.com/crest.png",
    team: 1,
    team_code: 1,
    team_name: "Man City",
    team_short: "MCI",
    element_type: 4,
    position: "FWD",
    now_cost: 150,
    price: 15.0,
    cost_change_event: 1,
    cost_change_start: 10,
    total_points: 120,
    points_per_game: "8.0",
    selected_by_percent: "65.5",
    form: "7.5",
    value_form: "0.5",
    value_season: "8.0",
    minutes: 1350,
    goals_scored: 15,
    assists: 3,
    clean_sheets: 6,
    goals_conceded: 12,
    yellow_cards: 2,
    red_cards: 0,
    saves: 0,
    bonus: 20,
    bps: 450,
    influence: "500",
    creativity: "200",
    threat: "900",
    ict_index: "160.0",
    expected_goals: "12.50",
    expected_assists: "2.10",
    expected_goal_involvements: "14.60",
    expected_goals_conceded: "11.20",
    starts: 15,
    transfers_in_event: 50000,
    transfers_out_event: 10000,
    status: "a",
    news: "",
    news_added: null,
    chance_of_playing_next_round: 100,
    chance_of_playing_this_round: 100,
    avg_fdr_next5: 2.8,
    ...overrides,
  };
}

describe("insights-utils", () => {
  describe("calculateMarketRadar", () => {
    it("correctly identifies risers, fallers, and net transfer velocity", () => {
      const p1 = createMockPlayer({
        id: 1,
        web_name: "Riser",
        cost_change_event: 1,
        transfers_in_event: 10000,
        transfers_out_event: 2000,
      });
      const p2 = createMockPlayer({
        id: 2,
        web_name: "Faller",
        cost_change_event: -1,
        transfers_in_event: 1000,
        transfers_out_event: 15000,
      });

      const result = calculateMarketRadar([p1, p2]);
      expect(result.totalRisersCount).toBe(1);
      expect(result.totalFallersCount).toBe(1);
      expect(result.risers[0]?.player.web_name).toBe("Riser");
      expect(result.fallers[0]?.player.web_name).toBe("Faller");
      expect(result.topNetTransfersIn[0]?.netTransfersEvent).toBe(8000);
      expect(result.topNetTransfersOut[0]?.netTransfersEvent).toBe(-14000);
    });

    it("correctly identifies daily price changes and target predictions", () => {
      const p1 = createMockPlayer({
        id: 1,
        web_name: "DailyRiser",
        cost_change_day: 1,
        price_change_percent: "95.5",
      });
      const p2 = createMockPlayer({
        id: 2,
        web_name: "DailyFaller",
        cost_change_day: -1,
        price_change_percent: "-102.3",
      });
      const p3 = createMockPlayer({
        id: 3,
        web_name: "NeutralPlayer",
        cost_change_day: 0,
        price_change_percent: "15.0",
      });

      const result = calculateMarketRadar([p1, p2, p3]);
      expect(result.totalDailyRisersCount).toBe(1);
      expect(result.totalDailyFallersCount).toBe(1);
      expect(result.dailyRisers[0]?.player.web_name).toBe("DailyRiser");
      expect(result.dailyFallers[0]?.player.web_name).toBe("DailyFaller");
      expect(result.predictedRisersTonight[0]?.player.web_name).toBe("DailyRiser");
      expect(result.predictedFallersTonight[0]?.player.web_name).toBe("DailyFaller");
    });

    it("aggregates daily price history and available dates correctly", () => {
      const p1 = createMockPlayer({ id: 1, web_name: "Salah", cost_change_day: 1 });
      const p2 = createMockPlayer({ id: 2, web_name: "Haaland", cost_change_day: 0 });

      const mockHistory = {
        "2026-09-06": { "1": 1 },
        "2026-09-05": { "2": -1 },
      };

      const result = calculateMarketRadar([p1, p2], mockHistory);
      expect(result.availableDates.includes("2026-09-06")).toBe(true);
      expect(result.availableDates.includes("2026-09-05")).toBe(true);
      expect(result.dailyPriceHistory?.["2026-09-06"]?.["1"]).toBe(1);
      expect(result.dailyPriceHistory?.["2026-09-05"]?.["2"]).toBe(-1);
      expect(result.summaries.length).toBe(2);
    });
  });

  describe("calculateExpectedStats", () => {
    it("identifies unlucky and clinical finishers based on xG variance", () => {
      const unlucky = createMockPlayer({
        id: 1,
        web_name: "Unlucky",
        goals_scored: 1,
        expected_goals: "3.50",
        minutes: 900,
      });
      const clinical = createMockPlayer({
        id: 2,
        web_name: "Clinical",
        goals_scored: 6,
        expected_goals: "3.00",
        minutes: 900,
      });

      const result = calculateExpectedStats([unlucky, clinical]);
      expect(result.unluckyFinishers.some((p) => p.player.web_name === "Unlucky")).toBe(true);
      expect(result.clinicalFinishers.some((p) => p.player.web_name === "Clinical")).toBe(true);
    });
  });

  describe("calculateValueRoi", () => {
    it("computes points per million and sorts descending", () => {
      const cheapGem = createMockPlayer({
        id: 1,
        web_name: "CheapGem",
        price: 5.0,
        total_points: 60, // 12.0 ppm
        minutes: 900,
      });
      const expensiveStar = createMockPlayer({
        id: 2,
        web_name: "Star",
        price: 15.0,
        total_points: 90, // 6.0 ppm
        minutes: 900,
      });

      const result = calculateValueRoi([expensiveStar, cheapGem]);
      expect(result[0]?.player.web_name).toBe("CheapGem");
      expect(result[0]?.pointsPerMillion).toBe(12.0);
    });
  });

  describe("calculateDifferentials", () => {
    it("filters players above ownership threshold", () => {
      const template = createMockPlayer({
        id: 1,
        web_name: "Template",
        selected_by_percent: "45.0",
      });
      const differential = createMockPlayer({
        id: 2,
        web_name: "Diff",
        selected_by_percent: "4.2",
        form: "6.8",
      });

      const result = calculateDifferentials([template, differential], 10);
      expect(result.length).toBe(1);
      expect(result[0]?.player.web_name).toBe("Diff");
      expect(result[0]?.ownership).toBe(4.2);
    });
  });

  describe("calculateFixtureMatrix", () => {
    it("calculates FDR matrix for teams across upcoming gameweeks", () => {
      const teams: FPLTeam[] = [
        { id: 1, code: 1, name: "Arsenal", short_name: "ARS", strength: 4, strength_overall_home: 1200, strength_overall_away: 1250, strength_attack_home: 1200, strength_attack_away: 1250, strength_defence_home: 1200, strength_defence_away: 1250 },
        { id: 2, code: 2, name: "Chelsea", short_name: "CHE", strength: 3, strength_overall_home: 1100, strength_overall_away: 1150, strength_attack_home: 1100, strength_attack_away: 1150, strength_defence_home: 1100, strength_defence_away: 1150 },
      ];
      const fixtures: FPLFixture[] = [
        { id: 1, event: 10, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 4, finished: false, kickoff_time: null },
      ];

      const result = calculateFixtureMatrix(teams, fixtures, 10, 1);
      expect(result.length).toBe(2);
      const arsRow = result.find((r) => r.team.short_name === "ARS");
      expect(arsRow?.fixtures[0]?.opponentShort).toBe("CHE");
      expect(arsRow?.fixtures[0]?.difficulty).toBe(3);
      expect(arsRow?.fixtures[0]?.isHome).toBe(true);
    });
  });

  describe("calculateStatusWatch", () => {
    it("flags injured and yellow-card risk players", () => {
      const injured = createMockPlayer({
        id: 1,
        web_name: "InjuredPlayer",
        status: "i",
        news: "Hamstring injury",
        chance_of_playing_next_round: 0,
        yellow_cards: 1,
      });
      const cardRisk = createMockPlayer({
        id: 2,
        web_name: "RiskPlayer",
        status: "a",
        yellow_cards: 4,
      });

      const { flaggedPlayers, yellowCardAlerts } = calculateStatusWatch([injured, cardRisk]);
      expect(flaggedPlayers.some((p) => p.player.web_name === "InjuredPlayer")).toBe(true);
      expect(yellowCardAlerts.some((p) => p.player.web_name === "RiskPlayer")).toBe(true);
    });
  });

  describe("calculateGameweekMeta", () => {
    it("extracts chip usage and captaincy", () => {
      const captain = createMockPlayer({ id: 10, web_name: "Salah" });
      const events: FPLEvent[] = [
        {
          id: 5,
          name: "Gameweek 5",
          deadline_time: "2026-09-20T10:00:00Z",
          is_current: true,
          finished: false,
          is_previous: false,
          is_next: false,
          average_entry_score: 52,
          highest_score: 114,
          most_captained: 10,
          chip_plays: [
            { chip_name: "wildcard", num_played: 150000 },
            { chip_name: "3xc", num_played: 50000 },
          ],
        },
      ];

      const meta = calculateGameweekMeta(events, 5, [captain]);
      expect(meta.averageScore).toBe(52);
      expect(meta.mostCaptainedPlayer?.web_name).toBe("Salah");
      expect(meta.chipPlays.length).toBe(2);
      expect(meta.chipPlays[0]?.name).toBe("Wildcard");
    });
  });

  describe("calculatePriceChangeProgress", () => {
    it("returns positive progress for players with net positive transfers", () => {
      const progress = calculatePriceChangeProgress({
        selected_by_percent: "15.0",
        transfers_in_event: 120000,
        transfers_out_event: 20000,
      });
      const numeric = parseFloat(progress);
      expect(numeric).toBeGreaterThan(0);
      expect(numeric).toBeLessThanOrEqual(120);
    });

    it("returns negative progress for players with net negative transfers", () => {
      const progress = calculatePriceChangeProgress({
        selected_by_percent: "8.0",
        transfers_in_event: 10000,
        transfers_out_event: 80000,
      });
      const numeric = parseFloat(progress);
      expect(numeric).toBeLessThan(0);
      expect(numeric).toBeGreaterThanOrEqual(-120);
    });

    it("clamps progress to -120% and 120%", () => {
      const hugeRiser = calculatePriceChangeProgress({
        selected_by_percent: "5.0",
        transfers_in_event: 1000000,
        transfers_out_event: 0,
      });
      expect(hugeRiser).toBe("120.0");

      const hugeFaller = calculatePriceChangeProgress({
        selected_by_percent: "5.0",
        transfers_in_event: 0,
        transfers_out_event: 1000000,
      });
      expect(hugeFaller).toBe("-120.0");
    });

    it("defaults to 0.0 when transfers are zero", () => {
      const neutral = calculatePriceChangeProgress({
        selected_by_percent: "2.0",
        transfers_in_event: 0,
        transfers_out_event: 0,
      });
      expect(neutral).toBe("0.0");
    });
  });
});

