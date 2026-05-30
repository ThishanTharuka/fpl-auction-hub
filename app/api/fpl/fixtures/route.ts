import { NextResponse } from "next/server";
import type { FPLFixture } from "@/lib/fpl-types";

const FPL_FIXTURES_URL = "https://fantasy.premierleague.com/api/fixtures/";

export const revalidate = 3600;

export interface TeamFDR {
  teamId: number;
  avgFdrNext5: number;
  fixtures: Array<{
    event: number;
    opponent: number;
    isHome: boolean;
    difficulty: number;
  }>;
}

export async function GET() {
  try {
    const res = await fetch(FPL_FIXTURES_URL, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch FPL fixtures" },
        { status: 502 },
      );
    }

    const fixtures: FPLFixture[] = await res.json();

    // Find the first unfinished gameweek
    const upcomingGws = fixtures
      .filter((f) => !f.finished && f.event !== null)
      .map((f) => f.event as number);
    const minGw = upcomingGws.length > 0 ? Math.min(...upcomingGws) : 1;

    // Build per-team FDR for next 5 GWs
    const teamFixtures = new Map<number, typeof fixtures>();
    for (const f of fixtures) {
      if (f.finished || f.event === null || f.event < minGw) continue;
      for (const teamId of [f.team_h, f.team_a]) {
        if (!teamFixtures.has(teamId)) teamFixtures.set(teamId, []);
        teamFixtures.get(teamId)!.push(f);
      }
    }

    const teamFdrs: TeamFDR[] = [];
    for (const [teamId, teamFs] of teamFixtures) {
      const next5 = teamFs
        .sort((a, b) => (a.event ?? 0) - (b.event ?? 0))
        .slice(0, 5);

      const fixtureDetails = next5.map((f) => ({
        event: f.event as number,
        opponent: f.team_h === teamId ? f.team_a : f.team_h,
        isHome: f.team_h === teamId,
        difficulty:
          f.team_h === teamId ? f.team_h_difficulty : f.team_a_difficulty,
      }));

      const avgFdr =
        fixtureDetails.length > 0
          ? Math.round(
              (fixtureDetails.reduce((s, f) => s + f.difficulty, 0) /
                fixtureDetails.length) *
                10,
            ) / 10
          : 3;

      teamFdrs.push({ teamId, avgFdrNext5: avgFdr, fixtures: fixtureDetails });
    }

    return NextResponse.json({ teamFdrs, currentGameweek: minGw });
  } catch (err) {
    console.error("[FPL fixtures] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
