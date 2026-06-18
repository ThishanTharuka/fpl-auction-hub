import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { computeMatchResult, computeStandings } from "@/lib/tournament/scoring";
import { generateSwissRound } from "@/lib/tournament/generator";
import type { MatchResult, StandingsEntry, GeneratedMatch } from "@/lib/tournament/types";

function gwLabel(gw: number): string {
  return gw <= 38 ? `GW${gw}` : `GW${gw}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const tournamentId = (await params).id;
  const body = (await request.json()) as { gw?: number };
  const targetGw = body.gw;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("created_by, start_gw, end_gw, league_id")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: fplCache } = await supabase
    .from("fpl_cache")
    .select("value")
    .eq("key", "fpl_data")
    .single();

  if (!fplCache) {
    return NextResponse.json(
      { error: "FPL data not available. Visit the Players page first to load data." },
      { status: 400 },
    );
  }

  const bootstrap = fplCache.value as {
    events?: { id: number; finished: boolean; highest_score: number }[];
  };

  const finishedEvents = (bootstrap.events ?? [])
    .filter((e) => e.finished)
    .map((e) => e.id);

  if (finishedEvents.length === 0) {
    return NextResponse.json(
      { error: "No finished FPL gameweeks yet" },
      { status: 400 },
    );
  }

  const resolvedGw = targetGw ?? Math.max(...finishedEvents);

  if (!finishedEvents.includes(resolvedGw)) {
    return NextResponse.json(
      { error: `${gwLabel(resolvedGw)} has not finished yet. Finished: ${finishedEvents.map(gwLabel).join(", ")}` },
      { status: 400 },
    );
  }

  if (resolvedGw < tournament.start_gw || resolvedGw > tournament.end_gw) {
    return NextResponse.json(
      { error: `${gwLabel(resolvedGw)} is outside this tournament's GW range (${gwLabel(tournament.start_gw)}-${gwLabel(tournament.end_gw)})` },
      { status: 400 },
    );
  }

  const { data: stages } = await supabase
    .from("tournament_stages")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("stage_order", { ascending: true });

  if (!stages || stages.length === 0) {
    return NextResponse.json({ error: "No stages found" }, { status: 400 });
  }

  const { data: allParticipants } = await supabase
    .from("participants")
    .select("id, fpl_manager_id")
    .eq("league_id", tournament.league_id);

  const results: { stage: string; matchesScored: number; standingsUpdated: boolean }[] = [];

  for (const stage of stages) {
    if (resolvedGw < stage.start_gw || resolvedGw > stage.end_gw) continue;

    // For Swiss stages, generate the round's matches on-the-fly
    if (stage.type === "swiss" && stage.scoring_mode === "head_to_head") {
      const { data: existing } = await supabase
        .from("tournament_matches")
        .select("id")
        .eq("stage_id", stage.id)
        .eq("gw", resolvedGw);
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
        const swissTeamIds = (allParticipants ?? []).map((p) => p.id);
        const roundNumber = resolvedGw - stage.start_gw + 1;
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
        .select("id, home_team_id, away_team_id, status")
        .eq("stage_id", stage.id)
        .eq("gw", resolvedGw)
        .neq("status", "bye");

      if (!gwMatches || gwMatches.length === 0) continue;

      const participantIds = new Set<string>();
      for (const m of gwMatches) {
        if (m.home_team_id) participantIds.add(m.home_team_id);
        if (m.away_team_id) participantIds.add(m.away_team_id);
      }

      const { data: participants } = await supabase
        .from("participants")
        .select("id, fpl_manager_id")
        .in("id", [...participantIds]);

      if (!participants) continue;

      const managerScores = new Map<string, number>();

      for (const pt of participants) {
        if (!pt.fpl_manager_id) {
          managerScores.set(pt.id, 0);
          continue;
        }
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`}/api/fpl/entry/${pt.fpl_manager_id}/event/${resolvedGw}`,
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

        const entries: StandingsEntry[] = computeStandings(
          [...teamIdSet],
          standingsData,
          "head_to_head",
        );

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

        results.push({
          stage: stage.name,
          matchesScored: scoredCount,
          standingsUpdated: true,
        });
      }
    }

    if (stage.scoring_mode === "total_points") {
      const { data: stageTeams } = await supabase
        .from("tournament_standings")
        .select("team_id")
        .eq("stage_id", stage.id);

      if (!stageTeams || stageTeams.length === 0) continue;

      const { data: participants } = await supabase
        .from("participants")
        .select("id, fpl_manager_id")
        .in("id", stageTeams.map((t) => t.team_id));

      if (!participants) continue;

      const teamScores = new Map<string, number>();

      for (const pt of participants) {
        if (!pt.fpl_manager_id) {
          teamScores.set(pt.id, 0);
          continue;
        }
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`}/api/fpl/entry/${pt.fpl_manager_id}/event/${resolvedGw}`,
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

      const gwCount = resolvedGw - stage.start_gw + 1;

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
        await supabase.from("tournament_standings").upsert(
          standing,
          { onConflict: "stage_id, team_id" },
        );
      }

      results.push({
        stage: stage.name,
        matchesScored: 0,
        standingsUpdated: true,
      });
    }
  }

  return NextResponse.json({ scored: results, gw: resolvedGw });
}
