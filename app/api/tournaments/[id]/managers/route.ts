import { NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/tournament/api";

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
    .select("created_by")
    .eq("id", id)
    .single();
  if (compErr || !competition) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (competition.created_by !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { data: teams, error: teamsErr } = await supabase
    .from("competition_teams")
    .select("*")
    .eq("competition_id", id);
  if (teamsErr || !teams || teams.length === 0) {
    return NextResponse.json({ error: "No teams to refresh." }, { status: 400 });
  }

  const participantIds = teams.map((t) => t.participant_id);
  const { data: participants } = await supabase
    .from("participants")
    .select("id,fpl_manager_id")
    .in("id", participantIds);

  const managerByParticipant = new Map(
    (participants ?? []).map((p) => [p.id, p.fpl_manager_id]),
  );

  const updates = teams.map((t) => ({
    ...t,
    fpl_manager_id: managerByParticipant.get(t.participant_id) ?? null,
  }));

  const { error: upsertErr } = await supabase
    .from("competition_teams")
    .upsert(updates, { onConflict: "id" });
  if (upsertErr) {
    console.error("[tournaments managers refresh]", upsertErr);
    return NextResponse.json({ error: "Failed to refresh managers." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: updates.length });
}