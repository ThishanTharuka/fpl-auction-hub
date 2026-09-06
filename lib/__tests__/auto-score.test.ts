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
  fetchFplGameweekPoints: vi.fn().mockResolvedValue(50),
  scoreGameweek: vi.fn().mockResolvedValue({
    scored: [{ fixtureId: "fix-1", homePoints: 50, awayPoints: 42 }],
    manual: [],
  }),
}));

import { autoScoreCompetition } from "@/lib/tournament/auto-score";
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
});
