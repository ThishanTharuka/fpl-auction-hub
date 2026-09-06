import { NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/tournament/api";
import { buildTwoPathBracket } from "@/lib/tournament/knockout-two-path";
import {
  computeTieOutcomes,
  resolveEntrant,
  resolveKnockoutPlacement,
} from "@/lib/tournament/knockout";
import { computeGroupStandings } from "@/lib/tournament/standings";
import { fetchFplGameweekPoints, scoreGameweek } from "@/lib/tournament/scoring";
import type {
  CompetitionConfig,
  CompetitionFixtureRow,
} from "@/lib/tournament/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await getAuthedSupabase(request);
  if (!authed.ok) return authed.response;
  const { supabase, userId } = authed;

  const { id } = await params;

  const body = (await request.json().catch(() => null)) as {
    gw?: unknown;
    manualScores?: unknown;
  } | null;
  const gw = typeof body?.gw === "number" ? Math.floor(body.gw) : 0;
  if (!Number.isInteger(gw) || gw < 1) {
    return NextResponse.json({ error: "A gameweek is required." }, { status: 400 });
  }

  const manualScores = Array.isArray(body?.manualScores) ? body.manualScores : [];
  for (const m of manualScores) {
    if (
      typeof m.fixtureId !== "string" ||
      typeof m.homePoints !== "number" ||
      typeof m.awayPoints !== "number"
    ) {
      return NextResponse.json(
        { error: "Malformed manual score entry." },
        { status: 400 },
      );
    }
  }

  const [competitionRes, teamsRes, fixturesRes] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).single(),
    supabase.from("competition_teams").select("*").eq("competition_id", id),
    supabase
      .from("competition_fixtures")
      .select("*")
      .eq("competition_id", id),
  ]);
  const competition = competitionRes.data;
  if (!competition) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (competition.created_by !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const teams = teamsRes.data ?? [];
  const fixtures = fixturesRes.data ?? [];

  const gwFixtures = fixtures.filter((f) => f.gw === gw);
  if (gwFixtures.length === 0) {
    return NextResponse.json(
      { error: `No fixtures scheduled for gameweek ${gw}.` },
      { status: 400 },
    );
  }

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
    gw,
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

  if (scoredUpdates.length > 0) {
    const { error: upsertErr } = await supabase
      .from("competition_fixtures")
      .upsert(scoredUpdates, { onConflict: "id" });
    if (upsertErr) {
      console.error("[tournaments score]", upsertErr);
      return NextResponse.json({ error: "Failed to persist scores." }, { status: 500 });
    }
  }

  if (result.manual.length > 0) {
    const autoManualIds = result.manual.map((f) => f.id);
    await supabase
      .from("competition_fixtures")
      .update({ status: "manual" })
      .in("id", autoManualIds);
  }

  const scoredByFixture = new Map<string, { homePoints: number; awayPoints: number }>();
  for (const m of manualUpdates) {
    scoredByFixture.set(m.id, {
      homePoints: m.home_points ?? 0,
      awayPoints: m.away_points ?? 0,
    });
  }
  for (const s of result.scored) {
    scoredByFixture.set(s.fixtureId, {
      homePoints: s.homePoints,
      awayPoints: s.awayPoints,
    });
  }
  const updatedFixtures = fixtures.map((f) => {
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
  if (config.knockout.template === "two_path_v1") {
    const outcomes = computeTieOutcomes(updatedFixtures);
    const standings = computeGroupStandings(teams, updatedFixtures, config);
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
    for (const p of placements) {
      if (p.phase === "decider") {
        const deciderEntrants = bracket.decider.entrants.map((e) =>
          resolveEntrant(e, outcomes, seeds),
        );
        const [t1, t2, t3] = deciderEntrants;
        if (!t1 && !t2 && !t3) continue;
        const { data: deciderFixtures } = await supabase
          .from("competition_fixtures")
          .select("id, tie_index")
          .eq("competition_id", id)
          .eq("phase", "decider")
          .order("tie_index", { ascending: true });
        if (deciderFixtures && deciderFixtures.length === 3) {
          const pairs = [
            { home: t1 ?? null, away: t2 ?? null },
            { home: t1 ?? null, away: t3 ?? null },
            { home: t2 ?? null, away: t3 ?? null },
          ];
          for (let i = 0; i < 3; i++) {
            const pair = pairs[i];
            const df = deciderFixtures[i];
            if (pair && df) {
              await supabase
                .from("competition_fixtures")
                .update({ home_team_id: pair.home, away_team_id: pair.away })
                .eq("id", df.id);
            }
          }
        }
        continue;
      }
      if (p.homeTeamId === null && p.awayTeamId === null) continue;
      await supabase
        .from("competition_fixtures")
        .update({ home_team_id: p.homeTeamId, away_team_id: p.awayTeamId })
        .eq("competition_id", id)
        .eq("phase", p.phase)
        .eq("leg", 1);
      await supabase
        .from("competition_fixtures")
        .update({ home_team_id: p.awayTeamId, away_team_id: p.homeTeamId })
        .eq("competition_id", id)
        .eq("phase", p.phase)
        .eq("leg", 2);
    }
  }

  const finalScored = updatedFixtures.some(
    (f) => f.phase === "final" && f.status === "scored",
  );
  const nextStatus = finalScored
    ? "complete"
    : competition.status === "setup"
      ? "active"
      : competition.status;
  if (nextStatus !== competition.status) {
    await supabase.from("competitions").update({ status: nextStatus }).eq("id", id);
  }

  return NextResponse.json({
    scored: scoredUpdates.length,
    manual: result.manual.length,
    status: nextStatus,
  });
}