import { NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/tournament/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await getAuthedSupabase(_req);
  if (!authed.ok) return authed.response;
  const { supabase, userId } = authed;

  const { id } = await params;

  const { data: competition, error: compErr } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", id)
    .single();
  if (compErr || !competition) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (competition.created_by !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const [teamsRes, fixturesRes] = await Promise.all([
    supabase
      .from("competition_teams")
      .select("*")
      .eq("competition_id", id)
      .order("group_label")
      .order("team_number"),
    supabase
      .from("competition_fixtures")
      .select("*")
      .eq("competition_id", id)
      .order("gw")
      .order("tie_index")
      .order("leg"),
  ]);

  return NextResponse.json({
    competition,
    teams: teamsRes.data ?? [],
    fixtures: fixturesRes.data ?? [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await getAuthedSupabase(request);
  if (!authed.ok) return authed.response;
  const { supabase, userId } = authed;

  const { id } = await params;
  const { data: existing, error: existsErr } = await supabase
    .from("competitions")
    .select("created_by")
    .eq("id", id)
    .single();
  if (existsErr || !existing) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (existing.created_by !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    status?: unknown;
    start_gw?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: { name?: string; status?: string; start_gw?: number } = {};
  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (
    typeof body.status === "string" &&
    ["setup", "active", "complete"].includes(body.status)
  ) {
    updates.status = body.status;
  }
  if (typeof body.start_gw === "number" && body.start_gw >= 1) {
    updates.start_gw = Math.floor(body.start_gw);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from("competitions")
    .update(updates)
    .eq("id", id);
  if (updateErr) {
    console.error("[tournaments patch]", updateErr);
    return NextResponse.json({ error: "Failed to update tournament." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await getAuthedSupabase(request);
  if (!authed.ok) return authed.response;
  const { supabase, userId } = authed;

  const { id } = await params;
  const { data: existing, error: existsErr } = await supabase
    .from("competitions")
    .select("created_by")
    .eq("id", id)
    .single();
  if (existsErr || !existing) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (existing.created_by !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { error } = await supabase.from("competitions").delete().eq("id", id);
  if (error) {
    console.error("[tournaments delete]", error);
    return NextResponse.json({ error: "Failed to delete tournament." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}