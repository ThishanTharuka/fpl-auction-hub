import { NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/tournament/api";
import type { CompetitionConfig } from "@/lib/tournament/types";
import { DEFAULT_FORMAT_CONFIG } from "@/lib/tournament/types";

function isSupportedConfig(value: unknown): value is CompetitionConfig {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<CompetitionConfig>;
  const phases = c.group_stage?.phases;
  if (!Array.isArray(phases) || phases.length === 0) return false;
  for (const p of phases) {
    if (p.type !== "intra_group" && p.type !== "cross_group") return false;
    if (typeof p.legs !== "number" || p.legs < 1) return false;
  }
  const q = c.qualification;
  if (
    !q ||
    typeof q.qualifiers_per_group !== "number" ||
    q.qualifiers_per_group < 1 ||
    !Array.isArray(q.tiebreakers) ||
    q.tiebreakers.length === 0
  ) {
    return false;
  }
  if (c.knockout?.template !== "two_path_v1") return false;
  return true;
}

export async function GET(request: Request) {
  const authed = await getAuthedSupabase(request);
  if (!authed.ok) return authed.response;
  const { supabase, userId } = authed;

  const [{ data: memberRows }, { data: participantRows }] = await Promise.all([
    supabase.from("team_members").select("league_id").eq("user_id", userId),
    supabase.from("participants").select("league_id").eq("user_id", userId),
  ]);
  const leagueIds = [
    ...new Set<string>([
      ...((memberRows ?? []).map((m) => m.league_id).filter(Boolean) as string[]),
      ...((participantRows ?? []).map((p) => p.league_id).filter(Boolean) as string[]),
    ]),
  ];

  let query = supabase
    .from("competitions")
    .select("id,name,status,start_gw,created_at,league_a_id,league_b_id,format_config,created_by")
    .order("created_at", { ascending: false });

  if (leagueIds.length > 0) {
    const inList = `(${leagueIds.join(",")})`;
    query = query.or(`created_by.eq.${userId},league_a_id.in.${inList},league_b_id.in.${inList}`);
  } else {
    query = query.eq("created_by", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[tournaments list]", error);
    return NextResponse.json({ error: "Failed to load tournaments." }, { status: 500 });
  }

  return NextResponse.json({ competitions: data ?? [] });
}

export async function POST(request: Request) {
  const authed = await getAuthedSupabase(request);
  if (!authed.ok) return authed.response;
  const { supabase, userId } = authed;

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    leagueAId?: unknown;
    leagueBId?: unknown;
    formatConfig?: unknown;
    startGw?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const leagueAId = typeof body.leagueAId === "string" ? body.leagueAId : "";
  const leagueBId = typeof body.leagueBId === "string" ? body.leagueBId : "";
  const startGw = typeof body.startGw === "number" ? Math.floor(body.startGw) : 0;
  const config = isSupportedConfig(body.formatConfig)
    ? body.formatConfig
    : DEFAULT_FORMAT_CONFIG;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!leagueAId || !leagueBId || leagueAId === leagueBId) {
    return NextResponse.json(
      { error: "Pick two different leagues." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(startGw) || startGw < 1) {
    return NextResponse.json(
      { error: "A starting gameweek is required." },
      { status: 400 },
    );
  }

  const { data: owned, error: leagueErr } = await supabase
    .from("leagues")
    .select("id,created_by")
    .in("id", [leagueAId, leagueBId]);

  if (leagueErr || !owned || owned.length !== 2) {
    return NextResponse.json(
      { error: "One or both leagues were not found." },
      { status: 400 },
    );
  }
  if (owned.some((l) => l.created_by !== userId)) {
    return NextResponse.json(
      { error: "You must own both leagues." },
      { status: 403 },
    );
  }

  const qualifiers = config.qualification.qualifiers_per_group;
  const [teamsARes, teamsBRes] = await Promise.all([
    supabase
      .from("participants")
      .select("id,name,color,avatar_url,fpl_manager_id")
      .eq("league_id", leagueAId)
      .order("name"),
    supabase
      .from("participants")
      .select("id,name,color,avatar_url,fpl_manager_id")
      .eq("league_id", leagueBId)
      .order("name"),
  ]);
  const teamsA = teamsARes.data ?? [];
  const teamsB = teamsBRes.data ?? [];
  if (teamsA.length < qualifiers || teamsB.length < qualifiers) {
    return NextResponse.json(
      { error: `Each league needs at least ${qualifiers} teams to fill the bracket.` },
      { status: 400 },
    );
  }

  const { data: competition, error: createErr } = await supabase
    .from("competitions")
    .insert({
      name,
      created_by: userId,
      league_a_id: leagueAId,
      league_b_id: leagueBId,
      format_config: config,
      start_gw: startGw,
    })
    .select("id,name,status,start_gw,league_a_id,league_b_id,created_at")
    .single();

  if (createErr || !competition) {
    console.error("[tournaments create]", createErr);
    return NextResponse.json(
      { error: "Failed to create the tournament." },
      { status: 500 },
    );
  }

  const teamRows = [
    ...teamsA.map((t, i) => ({
      competition_id: competition.id,
      group_label: "A" as const,
      participant_id: t.id,
      league_id: leagueAId,
      name: t.name,
      color: t.color,
      avatar_url: t.avatar_url,
      fpl_manager_id: t.fpl_manager_id,
      team_number: i + 1,
    })),
    ...teamsB.map((t, i) => ({
      competition_id: competition.id,
      group_label: "B" as const,
      participant_id: t.id,
      league_id: leagueBId,
      name: t.name,
      color: t.color,
      avatar_url: t.avatar_url,
      fpl_manager_id: t.fpl_manager_id,
      team_number: i + 1,
    })),
  ];

  const { error: teamsErr } = await supabase
    .from("competition_teams")
    .insert(teamRows);

  if (teamsErr) {
    console.error("[tournaments create] team snapshot failed:", teamsErr);
    await supabase.from("competitions").delete().eq("id", competition.id);
    return NextResponse.json(
      { error: "Failed to snapshot teams." },
      { status: 500 },
    );
  }

  return NextResponse.json({ competition }, { status: 201 });
}