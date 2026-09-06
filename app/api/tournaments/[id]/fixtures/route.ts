import { NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/tournament/api";
import { buildSchedule } from "@/lib/tournament/schedule";
import { matchTeamToRoster, parsePastedFixtures, type TeamMatch } from "@/lib/tournament/parser";
import type { CompetitionConfig, FixtureDraft } from "@/lib/tournament/types";

export type ImportResolution = {
  matchday: number;
  home: string;
  away: string;
  homeMatch: TeamMatch;
  awayMatch: TeamMatch;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await getAuthedSupabase(request);
  if (!authed.ok) return authed.response;
  const { supabase } = authed;

  const { id } = await params;

  const [fixRes, teamsRes] = await Promise.all([
    supabase
      .from("competition_fixtures")
      .select("*")
      .eq("competition_id", id)
      .order("gw")
      .order("tie_index")
      .order("leg"),
    supabase
      .from("competition_teams")
      .select("id,name,group_label,team_number,avatar_url,color")
      .eq("competition_id", id),
  ]);

  if (fixRes.error) {
    return NextResponse.json({ error: "Failed to load fixtures." }, { status: 500 });
  }

  const teamById = new Map((teamsRes.data ?? []).map((t) => [t.id, t]));
  const fixtures = (fixRes.data ?? []).map((f) => {
    const hTeam = f.home_team_id ? teamById.get(f.home_team_id) : null;
    const aTeam = f.away_team_id ? teamById.get(f.away_team_id) : null;
    const group =
      f.stage === "group"
        ? hTeam?.group_label && aTeam?.group_label && hTeam.group_label === aTeam.group_label
          ? hTeam.group_label
          : hTeam?.group_label || aTeam?.group_label || null
        : null;

    return {
      ...f,
      group,
      group_label: group ? `Group ${group}` : f.stage === "group" ? "Group" : f.phase,
      home_team: hTeam
        ? {
            id: hTeam.id,
            name: hTeam.name,
            group_label: hTeam.group_label,
            avatar_url: hTeam.avatar_url,
            color: hTeam.color,
          }
        : null,
      away_team: aTeam
        ? {
            id: aTeam.id,
            name: aTeam.name,
            group_label: aTeam.group_label,
            avatar_url: aTeam.avatar_url,
            color: aTeam.color,
          }
        : null,
    };
  });

  return NextResponse.json({ fixtures });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await getAuthedSupabase(request);
  if (!authed.ok) return authed.response;
  const { supabase, userId } = authed;

  const { id } = await params;

  const { data: competition, error: compErr } = await supabase
    .from("competitions")
    .select("id,created_by,format_config,start_gw")
    .eq("id", id)
    .single();
  if (compErr || !competition) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (competition.created_by !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    mode?: unknown;
    text?: unknown;
  } | null;
  const mode = body?.mode;

  const { data: teams } = await supabase
    .from("competition_teams")
    .select("id,name,group_label,team_number")
    .eq("competition_id", id)
    .order("group_label")
    .order("team_number");
  const roster = teams ?? [];

  if (mode === "generate") {
    const config = competition.format_config as unknown as CompetitionConfig;
    const groupA = roster.filter((t) => t.group_label === "A").map((t) => t.id);
    const groupB = roster.filter((t) => t.group_label === "B").map((t) => t.id);
    const drafts = buildSchedule(
      id,
      config,
      { group: "A", teamIds: groupA },
      { group: "B", teamIds: groupB },
      competition.start_gw,
    );
    return NextResponse.json({ drafts });
  }

  if (mode === "import") {
    const text = typeof body?.text === "string" ? body.text : "";
    const parsed = parsePastedFixtures(text);
    const resolution: ImportResolution[] = parsed.map((line) => ({
      matchday: line.matchday,
      home: line.home,
      away: line.away,
      homeMatch: matchTeamToRoster(line.home, roster),
      awayMatch: matchTeamToRoster(line.away, roster),
    }));
    return NextResponse.json({ resolution });
  }

  return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await getAuthedSupabase(request);
  if (!authed.ok) return authed.response;
  const { supabase, userId } = authed;

  const { id } = await params;
  const { data: competition, error: compErr } = await supabase
    .from("competitions")
    .select("created_by")
    .eq("id", id)
    .single();
  if (compErr || !competition) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (competition.created_by !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    drafts?: unknown;
  } | null;
  const drafts = Array.isArray(body?.drafts) ? (body.drafts as FixtureDraft[]) : null;
  if (!drafts) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (drafts.length === 0) {
    return NextResponse.json({ error: "No fixtures to save." }, { status: 400 });
  }

  for (const d of drafts) {
    if (d.competition_id !== id) {
      return NextResponse.json({ error: "Competition mismatch in drafts." }, { status: 400 });
    }
    if (d.stage !== "group" && d.stage !== "knockout") {
      return NextResponse.json({ error: "Invalid stage in drafts." }, { status: 400 });
    }
    if (
      typeof d.gw !== "number" ||
      typeof d.tie_index !== "number" ||
      typeof d.leg !== "number" ||
      typeof d.phase !== "string"
    ) {
      return NextResponse.json({ error: "Malformed fixture draft." }, { status: 400 });
    }
  }

  const { error: delErr } = await supabase
    .from("competition_fixtures")
    .delete()
    .eq("competition_id", id);
  if (delErr) {
    console.error("[tournaments fixtures replace]", delErr);
    return NextResponse.json({ error: "Failed to replace fixtures." }, { status: 500 });
  }

  const { error: insErr } = await supabase
    .from("competition_fixtures")
    .insert(drafts);
  if (insErr) {
    console.error("[tournaments fixtures insert]", insErr);
    return NextResponse.json({ error: "Failed to save fixtures." }, { status: 500 });
  }

  return NextResponse.json({ inserted: drafts.length });
}