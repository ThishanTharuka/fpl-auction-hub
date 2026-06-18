import { NextResponse } from "next/server";
import { validateTournament } from "@/lib/tournament/validator";
import { generateRoundRobin, generateKnockoutBracket } from "@/lib/tournament/generator";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { StageConfig, GeneratedMatch, RoundLabel } from "@/lib/tournament/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    leagueId: string;
    name: string;
    stages: StageConfig[];
    teamCount: number;
  };

  const { leagueId, name, stages, teamCount } = body;

  const validation = validateTournament(stages, teamCount);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .insert({ league_id: leagueId, name, created_by: user.id })
    .select("id")
    .single();

  if (tournamentError || !tournament) {
    return NextResponse.json({ error: tournamentError?.message ?? "Failed to create tournament" }, { status: 500 });
  }

  const { data: stageInsertData, error: stagesError } = await supabase
    .from("tournament_stages")
    .insert(
      stages.map((stage, index) => ({
        tournament_id: tournament.id,
        stage_order: index + 1,
        name: stage.name,
        type: stage.type,
        scoring_mode: stage.scoringMode,
        start_gw: stage.startGw,
        end_gw: stage.endGw,
        config: stage.config,
        advance_qualifiers: stage.advanceQualifiers ?? null,
      })),
    )
    .select("id, stage_order, type, start_gw, end_gw, config, scoring_mode");

  if (stagesError || !stageInsertData) {
    return NextResponse.json({ error: stagesError?.message ?? "Failed to create stages" }, { status: 500 });
  }

  const { data: participants } = await supabase
    .from("participants")
    .select("id")
    .eq("league_id", leagueId);

  if (!participants || participants.length === 0) {
    return NextResponse.json({ error: "No participants found" }, { status: 400 });
  }

  const teamIds = participants.map((p) => p.id);

  const allMatchInserts: {
    stage_id: string;
    gw: number;
    round_number: number;
    round_label: RoundLabel;
    home_team_id: string;
    away_team_id: string;
    status: "scheduled" | "completed" | "bye";
  }[] = [];

  const allStandingInserts: {
    stage_id: string;
    team_id: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    fpl_pts_for: number;
    fpl_pts_against: number;
    match_points: number;
    position: number;
  }[] = [];

  for (const dbStage of stageInsertData) {
    if (dbStage.type === "round_robin") {
      const config = dbStage.config as { repetitions?: number };
      const matches = generateRoundRobin(
        teamIds,
        config.repetitions ?? 1,
        dbStage.start_gw,
      );
      allMatchInserts.push(...matches.map((m: GeneratedMatch) => ({
        stage_id: dbStage.id,
        gw: m.gw,
        round_number: m.roundNumber,
        round_label: m.roundLabel,
        home_team_id: m.homeTeamId,
        away_team_id: m.awayTeamId,
        status: m.status,
      })));
    }

    if (dbStage.type === "knockout") {
      const config = dbStage.config as {
        teams?: number;
        twoLegged?: boolean;
        thirdPlace?: boolean;
      };
      const koTeams = config.teams ?? teamIds.length;
      const matches = generateKnockoutBracket(
        teamIds.slice(0, koTeams),
        {
          twoLegged: config.twoLegged ?? false,
          thirdPlace: config.thirdPlace ?? true,
        },
        dbStage.start_gw,
      );
      allMatchInserts.push(...matches.map((m: GeneratedMatch) => ({
        stage_id: dbStage.id,
        gw: m.gw,
        round_number: m.roundNumber,
        round_label: m.roundLabel,
        home_team_id: m.homeTeamId,
        away_team_id: m.awayTeamId,
        status: m.status,
      })));
    }

    const stageTeamIds = teamIds.slice(
      0,
      dbStage.type === "knockout"
        ? (dbStage.config as { teams?: number }).teams ?? teamIds.length
        : teamIds.length,
    );
    allStandingInserts.push(
      ...stageTeamIds.map((tid, i) => ({
        stage_id: dbStage.id,
        team_id: tid,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        fpl_pts_for: 0,
        fpl_pts_against: 0,
        match_points: 0,
        position: i + 1,
      }))
    );
  }

  const { error: matchesError } = await supabase
    .from("tournament_matches")
    .insert(allMatchInserts);

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const { error: standingsError } = await supabase
    .from("tournament_standings")
    .insert(allStandingInserts);

  if (standingsError) {
    return NextResponse.json({ error: standingsError.message }, { status: 500 });
  }

  return NextResponse.json({ tournamentId: tournament.id }, { status: 200 });
}
