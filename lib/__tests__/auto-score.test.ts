import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockRpc = vi.fn().mockResolvedValue({ error: null });
  const mockClient = {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockImplementation(() => {
            if (table === "fpl_cache") {
              return Promise.resolve({ data: null, error: null });
            }
            if (table === "competitions") {
              return Promise.resolve({
                data: {
                  id: "comp-1",
                  name: "Test Tournament",
                  status: "active",
                  format_config: {
                    knockout: { template: "two_path_v1", third_place: false },
                    qualification: { qualifiers_per_group: 4, tiebreakers: ["points"] },
                    group_stage: { phases: [] },
                  },
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
          order: vi.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
        })),
        in: vi.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
      })),
      upsert: mockUpsert,
    })),
    rpc: mockRpc,
  };
  return { mockUpsert, mockRpc, mockClient };
});

vi.mock("@/lib/supabase", () => ({
  supabase: mocks.mockClient,
}));

vi.mock("@/lib/fpl-data", () => ({
  getFplData: vi.fn().mockResolvedValue({
    currentGameweek: 5,
    liveGameweek: 5,
    events: [
      { id: 5, name: "Gameweek 5", is_current: true, finished: false, data_checked: false },
    ],
    players: [],
    teams: [],
    fixtures: [],
  }),
}));

vi.mock("@/lib/tournament/scoring", () => ({
  fetchFplGameweekScore: vi.fn().mockResolvedValue({
    points: 50,
    chip: null,
    captainPoints: null,
    benchPoints: null,
  }),
  scoreGameweek: vi.fn().mockResolvedValue({
    scored: [{ fixtureId: "fix-1", homePoints: 50, awayPoints: 42 }],
    manual: [],
    manualReasons: {},
    chipNotes: {},
  }),
}));

import { autoScoreCompetition } from "@/lib/tournament/auto-score";
import { scoreGameweek } from "@/lib/tournament/scoring";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

describe("autoScoreCompetition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips scoring if cooldown lock is active and force is false", async () => {
    const recentLockClient = {
      from: vi.fn((_table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                key: "auto_score_lock_comp-1_gw_5",
                value: { is_finalized: false },
                updated_at: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min ago (< 5 min TTL)
                ttl_ms: 300000,
              },
              error: null,
            }),
          })),
        })),
        upsert: mocks.mockUpsert,
      })),
      rpc: mocks.mockRpc,
    } as unknown as SupabaseClient<Database>;

    const result = await autoScoreCompetition({
      competitionId: "comp-1",
      gw: 5,
      force: false,
      supabaseClient: recentLockClient,
    });

    expect(result.attempted).toBe(false);
    expect(result.reason).toBe("Cooldown active.");
    expect(result.isLive).toBe(true);
  });

  it("skips scoring if gameweek is already finalized", async () => {
    const finalizedClient = {
      from: vi.fn((_table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                key: "auto_score_lock_comp-1_gw_5",
                value: { is_finalized: true },
                updated_at: new Date(Date.now() - 10000).toISOString(),
                ttl_ms: 365 * 24 * 60 * 60 * 1000,
              },
              error: null,
            }),
          })),
        })),
        upsert: mocks.mockUpsert,
      })),
      rpc: mocks.mockRpc,
    } as unknown as SupabaseClient<Database>;

    const result = await autoScoreCompetition({
      competitionId: "comp-1",
      gw: 5,
      force: false,
      supabaseClient: finalizedClient,
    });

    expect(result.attempted).toBe(false);
    expect(result.reason).toBe("Gameweek is already finalized.");
    expect(result.isFinished).toBe(true);
  });

  it("bypasses cooldown when force is true and applies fixture scores via RPC", async () => {
    const activeRpc = vi.fn().mockResolvedValue({ error: null });
    const activeUpsert = vi.fn().mockResolvedValue({ error: null });
    const testFixtures = [
      {
        id: "fix-1",
        competition_id: "comp-1",
        gw: 5,
        home_team_id: "team-1",
        away_team_id: "team-2",
        status: "scheduled",
        stage: "group",
        phase: "intra_group",
        tie_index: 0,
        leg: 1,
      },
    ];

    const activeClient = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn((_col: string) => {
            if (table === "fpl_cache") {
              return { single: vi.fn().mockResolvedValue({ data: null, error: null }) };
            }
            if (table === "competitions") {
              return {
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "comp-1",
                    name: "Test",
                    status: "active",
                    format_config: {
                      knockout: { template: "two_path_v1", third_place: false },
                      qualification: { qualifiers_per_group: 4, tiebreakers: ["points"] },
                      group_stage: { phases: [] },
                    },
                  },
                  error: null,
                }),
              };
            }
            if (table === "competition_teams") {
              return Promise.resolve({
                data: [
                  { id: "team-1", fpl_manager_id: 101, group_label: "A", team_number: 1 },
                  { id: "team-2", fpl_manager_id: 102, group_label: "A", team_number: 2 },
                ],
                error: null,
              });
            }
            if (table === "competition_fixtures") {
              return Promise.resolve({ data: testFixtures, error: null });
            }
            return { single: vi.fn().mockResolvedValue({ data: null, error: null }) };
          }),
        })),
        upsert: activeUpsert,
      })),
      rpc: activeRpc,
    } as unknown as SupabaseClient<Database>;

    const result = await autoScoreCompetition({
      competitionId: "comp-1",
      gw: 5,
      force: true,
      supabaseClient: activeClient,
    });

    expect(result.attempted).toBe(true);
    expect(result.scored).toBe(1);
    expect(activeRpc).toHaveBeenCalledWith("apply_fixture_scores", expect.any(Object));
  });

  it("keeps an admin score override when re-scoring the same fixture", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const testFixtures = [
      {
        id: "fix-1",
        competition_id: "comp-1",
        gw: 5,
        home_team_id: "team-1",
        away_team_id: "team-2",
        status: "scheduled",
        stage: "group",
        phase: "intra_group",
        tie_index: 0,
        leg: 1,
        home_points: null,
        away_points: null,
        // Admin pinned the home score; the away side is still FPL's to compute.
        home_points_override: 12,
        away_points_override: null,
        chip_notes: null,
      },
    ];

    const client = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => {
            if (table === "fpl_cache") {
              return { single: vi.fn().mockResolvedValue({ data: null, error: null }) };
            }
            if (table === "competitions") {
              return {
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "comp-1",
                    name: "Test",
                    status: "active",
                    format_config: {
                      // Non-two-path template keeps this test on the scoring path.
                      knockout: { template: "single", third_place: false },
                      qualification: { qualifiers_per_group: 4, tiebreakers: ["points"] },
                      group_stage: { phases: [] },
                    },
                  },
                  error: null,
                }),
              };
            }
            if (table === "competition_teams") {
              return Promise.resolve({
                data: [
                  { id: "team-1", fpl_manager_id: 101, group_label: "A", team_number: 1 },
                  { id: "team-2", fpl_manager_id: 102, group_label: "A", team_number: 2 },
                ],
                error: null,
              });
            }
            if (table === "competition_fixtures") {
              return Promise.resolve({ data: testFixtures, error: null });
            }
            return { single: vi.fn().mockResolvedValue({ data: null, error: null }) };
          }),
        })),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })),
      rpc,
    } as unknown as SupabaseClient<Database>;

    const result = await autoScoreCompetition({
      competitionId: "comp-1",
      gw: 5,
      force: true,
      supabaseClient: client,
    });

    expect(result.attempted).toBe(true);
    const payload = rpc.mock.calls[0]?.[1] as {
      p_fixtures: Array<Record<string, unknown>>;
    };
    const row = payload.p_fixtures.find((f) => f.id === "fix-1");
    // The mocked scorer reports 50; the override must win.
    expect(row?.home_points).toBe(12);
    expect(row?.away_points).toBe(42);
    expect(row?.status).toBe("scored");
    expect(row?.chip_notes).toBeNull();
  });

  it("persists the chip audit trail on the fixture it scores", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const testFixtures = [
      {
        id: "fix-1",
        competition_id: "comp-1",
        gw: 5,
        home_team_id: "team-1",
        away_team_id: "team-2",
        status: "scheduled",
        stage: "group",
        phase: "intra_group",
        tie_index: 0,
        leg: 1,
      },
    ];

    vi.mocked(scoreGameweek).mockResolvedValueOnce({
      scored: [{ fixtureId: "fix-1", homePoints: 40, awayPoints: 42 }],
      manual: [],
      manualReasons: {},
      chipNotes: {
        "fix-1": {
          home: {
            chip: "3xc",
            label: "Triple Captain",
            rawPoints: 46,
            penalty: 6,
            adjustedPoints: 40,
            applied: true,
            reason: "Triple Captain used in the league phase - not counted",
          },
          away: null,
        },
      },
    });

    const client = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => {
            if (table === "fpl_cache") {
              return { single: vi.fn().mockResolvedValue({ data: null, error: null }) };
            }
            if (table === "competitions") {
              return {
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "comp-1",
                    name: "Test",
                    status: "active",
                    format_config: {
                      knockout: { template: "single", third_place: false },
                      qualification: { qualifiers_per_group: 4, tiebreakers: ["points"] },
                      group_stage: { phases: [] },
                    },
                  },
                  error: null,
                }),
              };
            }
            if (table === "competition_teams") {
              return Promise.resolve({
                data: [
                  { id: "team-1", fpl_manager_id: 101, group_label: "A", team_number: 1 },
                  { id: "team-2", fpl_manager_id: 102, group_label: "A", team_number: 2 },
                ],
                error: null,
              });
            }
            if (table === "competition_fixtures") {
              return Promise.resolve({ data: testFixtures, error: null });
            }
            return { single: vi.fn().mockResolvedValue({ data: null, error: null }) };
          }),
        })),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })),
      rpc,
    } as unknown as SupabaseClient<Database>;

    const result = await autoScoreCompetition({
      competitionId: "comp-1",
      gw: 5,
      force: true,
      supabaseClient: client,
    });

    expect(result.attempted).toBe(true);
    const payload = rpc.mock.calls[0]?.[1] as {
      p_fixtures: Array<Record<string, unknown>>;
    };
    const row = payload.p_fixtures.find((f) => f.id === "fix-1");
    expect(row?.home_points).toBe(40);
    expect(row?.chip_notes).toMatchObject({
      home: { chip: "3xc", penalty: 6, adjustedPoints: 40 },
      away: null,
    });
  });
});
