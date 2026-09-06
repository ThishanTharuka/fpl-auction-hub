import { supabase as defaultSupabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { getFplData } from "@/lib/fpl-data";
import { fetchFplGameweekPoints, scoreGameweek } from "./scoring";
import {
  computeTieOutcomes,
  resolveEntrant,
  resolveKnockoutPlacement,
} from "./knockout";
import { buildTwoPathBracket } from "./knockout-two-path";
import { computeGroupStandings } from "./standings";
import type {
  CompetitionConfig,
  CompetitionFixtureRow,
  CompetitionRow,
  CompetitionTeamRow,
} from "./types";

export interface AutoScoreOptions {
  competitionId: string;
  gw?: number;
  force?: boolean;
  manualScores?: Array<{ fixtureId: string; homePoints: number; awayPoints: number }>;
  supabaseClient?: SupabaseClient<Database>;
}

export interface AutoScoreResult {
  attempted: boolean;
  reason?: string;
  gw: number;
  scored: number;
  manual: number;
  status?: string;
  isLive?: boolean;
  isFinished?: boolean;
  cooldownRemainingMs?: number;
}

const COOLDOWNS = {
  LIVE: 5 * 60 * 1000, // 5 minutes during live matches
  FINISHED_UNCHECKED: 10 * 60 * 1000, // 10 minutes when matchday ended but autosubs pending
  DEFAULT: 30 * 60 * 1000, // 30 minutes otherwise
};

export async function autoScoreCompetition(
  opts: AutoScoreOptions,
): Promise<AutoScoreResult> {
  const {
    competitionId,
    force = false,
    manualScores = [],
    supabaseClient = defaultSupabase,
  } = opts;

  // 1. Get FPL state from cached fpl_data
  const fplData = await getFplData().catch(() => null);
  const targetGw =
    opts.gw ??
    fplData?.liveGameweek ??
    fplData?.currentGameweek ??
    1;

  const fplEvent = fplData?.events?.find((e) => e.id === targetGw);
  const isFinished = fplEvent?.finished === true;
  const isDataChecked = fplEvent?.data_checked === true;
  const isLive =
    fplData?.liveGameweek === targetGw ||
    (fplEvent?.is_current === true && !isFinished);

  const cooldownMs = isLive
    ? COOLDOWNS.LIVE
    : isFinished && !isDataChecked
      ? COOLDOWNS.FINISHED_UNCHECKED
      : COOLDOWNS.DEFAULT;

  const lockKey = `auto_score_lock_${competitionId}_gw_${targetGw}`;

  // 2. Cooldown check if not forced
  if (!force) {
    const { data: lockRow } = await supabaseClient
      .from("fpl_cache")
      .select("value, updated_at, ttl_ms")
      .eq("key", lockKey)
      .single();

    if (lockRow) {
      const lockVal = lockRow.value as { is_finalized?: boolean } | null;
      if (lockVal?.is_finalized) {
        return {
          attempted: false,
          reason: "Gameweek is already finalized.",
          gw: targetGw,
          scored: 0,
          manual: 0,
          isFinished: true,
          isLive: false,
        };
      }

      const elapsed = Date.now() - new Date(lockRow.updated_at).getTime();
      const requiredTtl = lockRow.ttl_ms || cooldownMs;
      if (elapsed < requiredTtl) {
        return {
          attempted: false,
          reason: "Cooldown active.",
          gw: targetGw,
          scored: 0,
          manual: 0,
          cooldownRemainingMs: requiredTtl - elapsed,
          isLive,
          isFinished,
        };
      }
    }
  }

  // 3. Load tournament entities
  const [competitionRes, teamsRes, fixturesRes] = await Promise.all([
    supabaseClient.from("competitions").select("*").eq("id", competitionId).single(),
    supabaseClient.from("competition_teams").select("*").eq("competition_id", competitionId),
    supabaseClient.from("competition_fixtures").select("*").eq("competition_id", competitionId),
  ]);

  const competition = competitionRes.data as CompetitionRow | null;
  if (!competition) {
    return {
      attempted: false,
      reason: "Competition not found.",
      gw: targetGw,
      scored: 0,
      manual: 0,
    };
  }

  const teams = (teamsRes.data ?? []) as CompetitionTeamRow[];
  const allFixtures = (fixturesRes.data ?? []) as CompetitionFixtureRow[];
  const gwFixtures = allFixtures.filter((f) => f.gw === targetGw);

  if (gwFixtures.length === 0) {
    return {
      attempted: false,
      reason: `No fixtures scheduled for GW ${targetGw}.`,
      gw: targetGw,
      scored: 0,
      manual: 0,
    };
  }

  // If not forced, check if all fixtures in this GW are already marked scored and round is finished
  const allAlreadyScored = gwFixtures.every((f) => f.status === "scored");
  if (!force && allAlreadyScored && isFinished && isDataChecked) {
    // Record finalization lock
    await supabaseClient.from("fpl_cache").upsert({
      key: lockKey,
      value: { is_finalized: true, gw: targetGw, locked_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
      ttl_ms: 365 * 24 * 60 * 60 * 1000,
    }, { onConflict: "key" });

    return {
      attempted: false,
      reason: "All fixtures already scored and finalized.",
      gw: targetGw,
      scored: 0,
      manual: 0,
      isFinished: true,
      isLive: false,
    };
  }

  // Set transient lock immediately to debounce concurrent calls
  await supabaseClient.from("fpl_cache").upsert({
    key: lockKey,
    value: { is_finalized: false, gw: targetGw, locked_at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
    ttl_ms: cooldownMs,
  }, { onConflict: "key" });

  // 4. Score the gameweek
  const manualUpdates: CompetitionFixtureRow[] = [];
  const manualIds = new Set<string>();

  for (const m of manualScores) {
    const original = gwFixtures.find((f) => f.id === m.fixtureId);
    if (!original) continue;
    manualIds.add(m.fixtureId);
    manualUpdates.push({
      ...original,
      home_points: m.homePoints,
      away_points: m.awayPoints,
      status: "scored",
    });
  }

  const result = await scoreGameweek({
    gw: targetGw,
    teams,
    fixtures: gwFixtures.filter((f) => !manualIds.has(f.id)),
    fetchPoints: fetchFplGameweekPoints,
  });

  const scoredUpdates: CompetitionFixtureRow[] = [...manualUpdates];
  for (const s of result.scored) {
    const original = gwFixtures.find((f) => f.id === s.fixtureId);
    if (!original) continue;
    scoredUpdates.push({
      ...original,
      home_points: s.homePoints,
      away_points: s.awayPoints,
      status: "scored",
    });
  }

  // Also include manual status updates if needed
  for (const f of result.manual) {
    if (!scoredUpdates.some((u) => u.id === f.id)) {
      scoredUpdates.push({
        ...f,
        status: "manual",
      });
    }
  }

  // 5. Compute knockout bracket advancements if applicable
  const scoredByFixture = new Map<string, { homePoints: number; awayPoints: number }>();
  for (const s of scoredUpdates) {
    if (s.status === "scored") {
      scoredByFixture.set(s.id, {
        homePoints: s.home_points ?? 0,
        awayPoints: s.away_points ?? 0,
      });
    }
  }

  const updatedAllFixtures = allFixtures.map((f) => {
    const s = scoredByFixture.get(f.id);
    if (!s) return f;
    return {
      ...f,
      home_points: s.homePoints,
      away_points: s.awayPoints,
      status: "scored" as const,
    };
  });

  const config = competition.format_config as unknown as CompetitionConfig;
  let decidersPayload: Array<{ id: string; home_team_id: string | null; away_team_id: string | null }> | null = null;
  let knockoutPayload: Array<{ phase: string; leg: number; home_team_id: string | null; away_team_id: string | null }> | null = null;

  if (config.knockout.template === "two_path_v1") {
    const outcomes = computeTieOutcomes(updatedAllFixtures);
    const standings = computeGroupStandings(teams, updatedAllFixtures, config);
    const qualifiers = config.qualification.qualifiers_per_group;
    const seeds = [
      {
        group: "A" as const,
        teamIds: standings.filter((s) => s.group === "A").slice(0, qualifiers).map((s) => s.teamId),
      },
      {
        group: "B" as const,
        teamIds: standings.filter((s) => s.group === "B").slice(0, qualifiers).map((s) => s.teamId),
      },
    ];
    const bracket = buildTwoPathBracket();
    const placements = resolveKnockoutPlacement(bracket, outcomes, seeds);

    knockoutPayload = [];
    for (const p of placements) {
      if (p.phase === "decider") {
        const deciderEntrants = bracket.decider.entrants.map((e) =>
          resolveEntrant(e, outcomes, seeds),
        );
        const [t1, t2, t3] = deciderEntrants;
        if (t1 || t2 || t3) {
          const deciderFixtures = allFixtures
            .filter((f) => f.phase === "decider")
            .sort((a, b) => a.tie_index - b.tie_index);

          if (deciderFixtures.length === 3) {
            const pairs = [
              { home: t1 ?? null, away: t2 ?? null },
              { home: t1 ?? null, away: t3 ?? null },
              { home: t2 ?? null, away: t3 ?? null },
            ];
            decidersPayload = [];
            for (let i = 0; i < 3; i++) {
              const pair = pairs[i];
              const df = deciderFixtures[i];
              if (pair && df) {
                decidersPayload.push({
                  id: df.id,
                  home_team_id: pair.home,
                  away_team_id: pair.away,
                });
              }
            }
          }
        }
        continue;
      }

      if (p.homeTeamId === null && p.awayTeamId === null) continue;
      knockoutPayload.push({
        phase: p.phase,
        leg: 1,
        home_team_id: p.homeTeamId,
        away_team_id: p.awayTeamId,
      });
      knockoutPayload.push({
        phase: p.phase,
        leg: 2,
        home_team_id: p.awayTeamId,
        away_team_id: p.homeTeamId,
      });
    }
  }

  const finalScored = updatedAllFixtures.some(
    (f) => f.phase === "final" && f.status === "scored",
  );
  const nextStatus = finalScored
    ? "complete"
    : competition.status === "setup"
      ? "active"
      : competition.status;

  // 6. Persist using the security-definer RPC apply_fixture_scores
  const fixturesPayload = scoredUpdates.map((f) => ({
    id: f.id,
    home_points: f.home_points,
    away_points: f.away_points,
    status: f.status,
  }));

  const { error: rpcError } = await supabaseClient.rpc("apply_fixture_scores", {
    p_fixtures: fixturesPayload as unknown as Json,
    p_deciders: decidersPayload as unknown as Json,
    p_knockout_placements: knockoutPayload as unknown as Json,
    p_competition_id: competitionId,
    p_competition_status: nextStatus !== competition.status ? nextStatus : null,
  });

  if (rpcError) {
    console.error("[autoScore apply_fixture_scores rpc error]", rpcError);
    // Fallback: direct upsert
    await supabaseClient
      .from("competition_fixtures")
      .upsert(scoredUpdates, { onConflict: "id" });
  }

  // 7. If round is finalized, set permanent finalization lock
  if (isFinished && isDataChecked && scoredUpdates.length > 0) {
    await supabaseClient.from("fpl_cache").upsert({
      key: lockKey,
      value: { is_finalized: true, gw: targetGw, locked_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
      ttl_ms: 365 * 24 * 60 * 60 * 1000,
    }, { onConflict: "key" });
  }

  return {
    attempted: true,
    gw: targetGw,
    scored: scoredUpdates.filter((s) => s.status === "scored").length,
    manual: result.manual.length,
    status: nextStatus,
    isLive,
    isFinished,
  };
}
