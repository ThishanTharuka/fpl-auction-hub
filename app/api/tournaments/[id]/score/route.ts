import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthedSupabase } from "@/lib/tournament/api";
import { autoScoreCompetition } from "@/lib/tournament/auto-score";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  if (manualScores.length > 0 && checkOnly) {
    return NextResponse.json(
      { error: "Cannot submit manual scores in checkOnly mode." },
      { status: 400 },
    );
  }

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

  // If executing manual scores or forced score bypass, require creator authentication
  let authedSupabase = null;
  if (!checkOnly || manualScores.length > 0) {
    const authed = await getAuthedSupabase(request);
    if (!authed.ok) return authed.response;
    const { data: comp } = await authed.supabase
      .from("competitions")
      .select("created_by")
      .eq("id", id)
      .single();
    if (!comp) {
      return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
    }
    if (comp.created_by !== authed.userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    authedSupabase = authed.supabase;
  }

  const res = await autoScoreCompetition({
    competitionId: id,
    gw,
    force: !checkOnly,
    manualScores,
    supabaseClient: authedSupabase ?? supabase,
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