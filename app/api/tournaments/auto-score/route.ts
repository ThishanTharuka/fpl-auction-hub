import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { autoScoreCompetition } from "@/lib/tournament/auto-score";

export async function POST(request: Request) {
  // Optional security check with CRON_SECRET if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace(/^Bearer\s+/i, "") ||
      new URL(request.url).searchParams.get("secret");

    if (providedSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Find active competitions
  const { data: competitions, error } = await supabase
    .from("competitions")
    .select("id, name, status")
    .in("status", ["setup", "active"]);

  if (error || !competitions) {
    return NextResponse.json(
      { error: "Failed to fetch competitions" },
      { status: 500 },
    );
  }

  const results = [];
  for (const comp of competitions) {
    try {
      const res = await autoScoreCompetition({
        competitionId: comp.id,
        force: false,
      });
      results.push({
        id: comp.id,
        name: comp.name,
        ...res,
      });
    } catch (err) {
      console.error(`[cron auto-score error for ${comp.id}]`, err);
      results.push({
        id: comp.id,
        name: comp.name,
        attempted: false,
        reason: "Internal error during scoring",
      });
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    totalCompetitions: competitions.length,
    results,
  });
}
