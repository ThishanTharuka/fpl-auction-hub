import { NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/tournament/api";
import { autoScoreCompetition } from "@/lib/tournament/auto-score";

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
    checkOnly?: unknown;
  } | null;
  const gw = typeof body?.gw === "number" ? Math.floor(body.gw) : 0;
  if (!Number.isInteger(gw) || gw < 1) {
    return NextResponse.json({ error: "A gameweek is required." }, { status: 400 });
  }

  const manualScores = Array.isArray(body?.manualScores) ? body.manualScores : [];
  const checkOnly = body?.checkOnly === true;
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

  const { data: competition } = await supabase
    .from("competitions")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!competition) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (competition.created_by !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const res = await autoScoreCompetition({
    competitionId: id,
    gw,
    force: !checkOnly,
    manualScores,
    supabaseClient: supabase,
  });

  if (!res.attempted && !checkOnly) {
    return NextResponse.json(
      { error: res.reason ?? "Scoring failed." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    scored: res.scored,
    manual: res.manual,
    status: res.status,
    reason: res.reason,
    isLive: res.isLive,
    isFinished: res.isFinished,
  });
}