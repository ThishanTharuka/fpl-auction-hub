import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { computeMatchResult, computeStandings } from "@/lib/tournament/scoring";
import { generateSwissRound } from "@/lib/tournament/generator";
import type { MatchResult, StandingsEntry, GeneratedMatch } from "@/lib/tournament/types";

// ── HELPERS ──────────────────────────────────────────────

async function scoreStage(
  stage: {
    id: string;
    name: string;
    type: string;
    scoring_mode: string;
    start_gw: number;
    end_gw: number;
    config: unknown;
  },
  gw: number,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{ stage: string; matchesScored: number } | null> {
  // For Swiss stages, generate round matches on-the-fly
  if (stage.type === "swiss" && stage.scoring_mode === "head_to_head") {
    const { data: existing } = await supabase
      .from("tournament_matches")
      .select("id")
      .eq("stage_id", stage.id)
      .eq("gw", gw);
    if (!existing || existing.length === 0) {
      const { data: swissStandings } = await supabase
        .from("tournament_standings")
        .select("*")
        .eq("stage_id", stage.id)
        .order("position", { ascending: true });
      const standingsEntries: StandingsEntry[] = (swissStandings ?? []).map((s) => ({
        teamId: s.team_id,
        played: s.played ?? 0,
        won: s.won ?? 0,
        drawn: s.drawn ?? 0,
        lost: s.lost ?? 0,
        fplPtsFor: s.fpl_pts_for ?? 0,
        fplPtsAgainst: s.fpl_pts_against ?? 0,
        fplPtsDiff: s.fpl_pts_diff ?? 0,
        matchPoints: s.match_points ?? 0,
        position: s.position ?? 0,
      }));
      const { data: allPrevMatches } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("stage_id", stage.id);
      const prevGenMatches: GeneratedMatch[] = (allPrevMatches ?? []).map((m) => ({
        gw: m.gw,
        roundNumber: m.round_number,
        roundLabel: m.round_label as GeneratedMatch["roundLabel"],
        homeTeamId: m.home_team_id ?? "",
        awayTeamId: m.away_team_id ?? "",
        winnerTeamId: m.winner_team_id,
        homeFplPts: m.home_fpl_pts,
        awayFplPts: m.away_fpl_pts,
        status: "scheduled" as const,
      }));
      const { data: teams } = await supabase
        .from("tournament_standings")
        .select("team_id")
        .eq("stage_id", stage.id);
      const swissTeamIds = (teams ?? []).map((t) => t.team_id);
      const roundNumber = gw - stage.start_gw + 1;
      const swissMatches = generateSwissRound(
        swissTeamIds,
        standingsEntries,
        roundNumber,
        stage.start_gw,
        prevGenMatches,
      );
      if (swissMatches.length > 0) {
        await supabase.from("tournament_matches").insert(
          swissMatches.map((m) => ({
            stage_id: stage.id,
            gw: m.gw,
            round_number: m.roundNumber,
            round_label: m.roundLabel,
            home_team_id: m.homeTeamId,
            away_team_id: m.awayTeamId,
            status: "scheduled",
          })),
        );
      }
    }
  }

  if (stage.scoring_mode === "head_to_head") {
    const { data: gwMatches } = await supabase
      .from("tournament_matches")
      .select("id, home_team_id, away_team_id")
      .eq("stage_id", stage.id)
      .eq("gw", gw)
      .neq("status", "bye");

    if (!gwMatches || gwMatches.length === 0) return null;

    const participantIds = new Set<string>();
    for (const m of gwMatches) {
      if (m.home_team_id) participantIds.add(m.home_team_id);
      if (m.away_team_id) participantIds.add(m.away_team_id);
    }

    const { data: participants } = await supabase
      .from("participants")
      .select("id, fpl_manager_id")
      .in("id", [...participantIds]);

    if (!participants) return null;

    const managerScores = new Map<string, number>();

    for (const pt of participants) {
      if (!pt.fpl_manager_id) {
        managerScores.set(pt.id, 0);
        continue;
      }
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`}/api/fpl/entry/${pt.fpl_manager_id}/event/${gw}`,
          { signal: AbortSignal.timeout(10000) },
        );
        if (res.ok) {
          const data = (await res.json()) as { points: number };
          managerScores.set(pt.id, data.points);
        } else {
          managerScores.set(pt.id, 0);
        }
      } catch {
        managerScores.set(pt.id, 0);
      }
    }

    let scoredCount = 0;
    for (const match of gwMatches) {
      if (!match.home_team_id || !match.away_team_id) continue;

      const homeScore = managerScores.get(match.home_team_id) ?? 0;
      const awayScore = managerScores.get(match.away_team_id) ?? 0;

      const result: MatchResult = computeMatchResult(homeScore, awayScore, "head_to_head");

      const { error: updateError } = await supabase
        .from("tournament_matches")
        .update({
          home_fpl_pts: homeScore,
          away_fpl_pts: awayScore,
          winner_team_id: result.winnerTeamId,
          status: "completed",
        })
        .eq("id", match.id);

      if (!updateError) scoredCount++;
    }

    // Recompute standings
    const { data: allCompleted } = await supabase
      .from("tournament_matches")
      .select("home_team_id, away_team_id, home_fpl_pts, away_fpl_pts")
      .eq("stage_id", stage.id)
      .neq("status", "scheduled");

    if (allCompleted && allCompleted.length > 0) {
      const standingsData = allCompleted.map((m) => ({
        homeTeamId: m.home_team_id ?? "",
        awayTeamId: m.away_team_id ?? "",
        homeFplPts: m.home_fpl_pts ?? 0,
        awayFplPts: m.away_fpl_pts ?? 0,
      }));

      const teamIdSet = new Set<string>();
      for (const m of allCompleted) {
        if (m.home_team_id) teamIdSet.add(m.home_team_id);
        if (m.away_team_id) teamIdSet.add(m.away_team_id);
      }

      const entries: StandingsEntry[] = computeStandings([...teamIdSet], standingsData, "head_to_head");

      for (const entry of entries) {
        await supabase.from("tournament_standings").upsert(
          {
            stage_id: stage.id,
            team_id: entry.teamId,
            played: entry.played,
            won: entry.won,
            drawn: entry.drawn,
            lost: entry.lost,
            fpl_pts_for: entry.fplPtsFor,
            fpl_pts_against: entry.fplPtsAgainst,
            match_points: entry.matchPoints,
            position: entry.position,
          },
          { onConflict: "stage_id, team_id" },
        );
      }
    }

    return { stage: stage.name, matchesScored: scoredCount };
  }

  if (stage.scoring_mode === "total_points") {
    const { data: stageTeams } = await supabase
      .from("tournament_standings")
      .select("team_id")
      .eq("stage_id", stage.id);

    if (!stageTeams || stageTeams.length === 0) return null;

    const { data: participants } = await supabase
      .from("participants")
      .select("id, fpl_manager_id")
      .in("id", stageTeams.map((t) => t.team_id));

    if (!participants) return null;

    const teamScores = new Map<string, number>();

    for (const pt of participants) {
      if (!pt.fpl_manager_id) {
        teamScores.set(pt.id, 0);
        continue;
      }
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`}/api/fpl/entry/${pt.fpl_manager_id}/event/${gw}`,
          { signal: AbortSignal.timeout(10000) },
        );
        if (res.ok) {
          const data = (await res.json()) as { totalPoints: number };
          teamScores.set(pt.id, data.totalPoints);
        } else {
          teamScores.set(pt.id, 0);
        }
      } catch {
        teamScores.set(pt.id, 0);
      }
    }

    const gwCount = gw - stage.start_gw + 1;

    const sorted = [...stageTeams]
      .map((t) => ({
        team_id: t.team_id,
        total: teamScores.get(t.team_id) ?? 0,
      }))
      .sort((a, b) => b.total - a.total)
      .map((t, i) => ({
        stage_id: stage.id,
        team_id: t.team_id,
        played: gwCount,
        won: 0,
        drawn: 0,
        lost: 0,
        fpl_pts_for: t.total,
        fpl_pts_against: 0,
        match_points: t.total,
        position: i + 1,
      }));

    for (const standing of sorted) {
      await supabase.from("tournament_standings").upsert(standing, { onConflict: "stage_id, team_id" });
    }

    return { stage: stage.name, matchesScored: 0 };
  }

  return null;
}

// ── ROUTE ────────────────────────────────────────────────

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  // Find finished events from FPL cache
  const { data: fplCache } = await supabase
    .from("fpl_cache")
    .select("value")
    .eq("key", "fpl_data")
    .single();

  if (!fplCache) {
    return NextResponse.json({ error: "FPL cache not found" }, { status: 400 });
  }

  const bootstrap = fplCache.value as {
    events?: { id: number; finished: boolean }[];
  };

  const finishedEvents = (bootstrap.events ?? []).filter((e) => e.finished).map((e) => e.id);
  if (finishedEvents.length === 0) {
    return NextResponse.json({ scored: [], message: "No finished GWs" });
  }

  // Find all active tournaments
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, start_gw, end_gw")
    .eq("status", "active");

  if (!tournaments || tournaments.length === 0) {
    return NextResponse.json({ scored: [], message: "No active tournaments" });
  }

  // Pre-fetch stages for all active tournaments
  const tournamentIds = tournaments.map((t) => t.id);
  const { data: allStages } = await supabase
    .from("tournament_stages")
    .select("*")
    .in("tournament_id", tournamentIds)
    .order("stage_order", { ascending: true });

  const stagesByTournament = new Map<string, typeof allStages>();
  for (const s of allStages ?? []) {
    const list = stagesByTournament.get(s.tournament_id) ?? [];
    list.push(s);
    stagesByTournament.set(s.tournament_id, list);
  }

  // Pre-fetch existing scored matches to avoid re-scoring
  const { data: existingScored } = await supabase
    .from("tournament_matches")
    .select("stage_id, gw, status")
    .in(
      "stage_id",
      (allStages ?? []).map((s) => s.id),
    );

  const scoredKey = new Set<string>();
  for (const m of existingScored ?? []) {
    if (m.status === "completed") {
      scoredKey.add(`${m.stage_id}:${m.gw}`);
    }
  }

  const results: {
    tournamentName: string;
    tournamentId: string;
    gw: number;
    stages: string[];
  }[] = [];

  for (const tournament of tournaments) {
    const stages = stagesByTournament.get(tournament.id) ?? [];
    if (stages.length === 0) continue;

    const finishedInRange = finishedEvents.filter(
      (gw) => gw >= tournament.start_gw && gw <= tournament.end_gw,
    );

    for (const gw of finishedInRange) {
      const stagesInGw = stages.filter((s) => gw >= s.start_gw && gw <= s.end_gw);
      if (stagesInGw.length === 0) continue;

      const unscoredStages = stagesInGw.filter(
        (s) => !scoredKey.has(`${s.id}:${gw}`),
      );
      if (unscoredStages.length === 0) continue;

      const scoredStageNames: string[] = [];

      for (const stage of unscoredStages) {
        const result = await scoreStage(stage, gw, supabase);
        if (result) {
          scoredStageNames.push(result.stage);
        }
      }

      if (scoredStageNames.length > 0) {
        results.push({
          tournamentName: tournament.name,
          tournamentId: tournament.id,
          gw,
          stages: scoredStageNames,
        });
      }
    }
  }

  return NextResponse.json({ scored: results });
}
