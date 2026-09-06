import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFixtureBreakdown } from "@/lib/tournament/fixture-breakdown";

const mocks = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockIn = vi.fn();
  const mockClient = {
    from: vi.fn((_table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
        in: mockIn,
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  };
  return { mockSingle, mockIn, mockClient };
});

vi.mock("@/lib/supabase", () => ({
  supabase: mocks.mockClient,
}));

vi.mock("@/lib/fpl-data", () => ({
  getFplData: vi.fn().mockResolvedValue({
    players: [
      { id: 101, web_name: "Haaland", full_name: "Erling Haaland", team_short: "MCI", position: "FWD" },
      { id: 102, web_name: "Salah", full_name: "Mohamed Salah", team_short: "LIV", position: "MID" },
      { id: 103, web_name: "Raya", full_name: "David Raya", team_short: "ARS", position: "GKP" },
      { id: 104, web_name: "Gabriel", full_name: "Gabriel Magalhães", team_short: "ARS", position: "DEF" },
      { id: 105, web_name: "Pedro Porro", full_name: "Pedro Porro", team_short: "TOT", position: "DEF" },
      { id: 106, web_name: "Palmer", full_name: "Cole Palmer", team_short: "CHE", position: "MID" },
      { id: 107, web_name: "Saka", full_name: "Bukayo Saka", team_short: "ARS", position: "MID" },
      { id: 108, web_name: "Eze", full_name: "Eberechi Eze", team_short: "CRY", position: "MID" },
      { id: 109, web_name: "Isak", full_name: "Alexander Isak", team_short: "NEW", position: "FWD" },
      { id: 110, web_name: "Watkins", full_name: "Ollie Watkins", team_short: "AVL", position: "FWD" },
      { id: 111, web_name: "Gvardiol", full_name: "Josko Gvardiol", team_short: "MCI", position: "DEF" },
      { id: 112, web_name: "Turner", full_name: "Matt Turner", team_short: "NFO", position: "GKP" },
      { id: 113, web_name: "Harwood-B.", full_name: "Taylor Harwood-Bellis", team_short: "SOU", position: "DEF" },
      { id: 114, web_name: "Winks", full_name: "Harry Winks", team_short: "LEI", position: "MID" },
      { id: 115, web_name: "Fraser", full_name: "Nathan Fraser", team_short: "WOL", position: "FWD" },
    ],
  }),
}));

describe("getFixtureBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when fixture is not found", async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: null, error: { message: "Not found" } });
    const res = await getFixtureBreakdown("missing-fix");
    expect("error" in res).toBe(true);
    if ("error" in res) {
      expect(res.status).toBe(404);
    }
  });

  it("processes team without manager ID gracefully", async () => {
    mocks.mockSingle.mockResolvedValueOnce({
      data: {
        id: "fix-1",
        gw: 3,
        home_team_id: "team-1",
        away_team_id: "team-2",
        status: "scheduled",
      },
      error: null,
    });

    mocks.mockIn.mockResolvedValueOnce({
      data: [
        { id: "team-1", name: "Team One", fpl_manager_id: null },
        { id: "team-2", name: "Team Two", fpl_manager_id: null },
      ],
      error: null,
    });

    const res = await getFixtureBreakdown("fix-1");
    expect("fixtureId" in res).toBe(true);
    if ("fixtureId" in res) {
      expect(res.homeTeam?.managerId).toBeNull();
      expect(res.homeTeam?.playing11).toEqual([]);
      expect(res.awayTeam?.managerId).toBeNull();
      expect(res.homeTeam?.statsSummary.formation).toBe("-");
    }
  });

  it("calculates real bench points and stats summary correctly", async () => {
    mocks.mockSingle.mockResolvedValueOnce({
      data: {
        id: "fix-2",
        gw: 3,
        home_team_id: "team-1",
        away_team_id: "team-2",
        status: "scored",
      },
      error: null,
    });

    mocks.mockIn.mockResolvedValueOnce({
      data: [
        { id: "team-1", name: "Team One", fpl_manager_id: 12345 },
        { id: "team-2", name: "Team Two", fpl_manager_id: null },
      ],
      error: null,
    });

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/live/")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              elements: [
                { id: 101, stats: { total_points: 9, minutes: 90, goals_scored: 1, assists: 0, clean_sheets: 0, bonus: 3 } },
                { id: 112, stats: { total_points: 6, minutes: 90, goals_scored: 0, assists: 0, clean_sheets: 1, bonus: 0 } },
              ],
            }),
        });
      }
      if (url.includes("/picks/")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              active_chip: "3xc",
              automatic_subs: [],
              entry_history: {
                points: 52,
                event_transfers_cost: 4,
                points_on_bench: 6,
              },
              picks: [
                { element: 101, position: 1, multiplier: 3, is_captain: true, is_vice_captain: false, element_type: 4 },
                { element: 112, position: 12, multiplier: 0, is_captain: false, is_vice_captain: false, element_type: 1 },
              ],
            }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    const originalFetch = global.fetch;
    global.fetch = mockFetch;

    try {
      const res = await getFixtureBreakdown("fix-2");
      expect("fixtureId" in res).toBe(true);
      if ("fixtureId" in res) {
        expect(res.homeTeam?.chip).toBe("Triple Captain");
        expect(res.homeTeam?.transferCost).toBe(4);
        expect(res.homeTeam?.netPoints).toBe(48);
        expect(res.homeTeam?.benchPoints).toBe(6);

        // Verify bench points show actual rawPoints (6), not 0
        const benchPlayer = res.homeTeam?.bench.find((b) => b.id === 112);
        expect(benchPlayer?.totalPoints).toBe(6);

        // Verify stats summary
        expect(res.homeTeam?.statsSummary.goals).toBe(1);
        expect(res.homeTeam?.statsSummary.goalsConceded).toBe(0);
        expect(res.homeTeam?.statsSummary.captainName).toBe("Haaland");
        expect(res.homeTeam?.statsSummary.captainPoints).toBe(27);
      }
    } finally {
      global.fetch = originalFetch;
    }
  });
});
