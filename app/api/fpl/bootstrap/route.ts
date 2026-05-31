import { NextResponse } from "next/server";
import type {
  FPLBootstrapResponse,
  FPLTeam,
  EnrichedPlayer,
  FPLFixture,
} from "@/lib/fpl-types";

const FPL_BOOTSTRAP_URL =
  "https://fantasy.premierleague.com/api/bootstrap-static/";
const FPL_FIXTURES_URL = "https://fantasy.premierleague.com/api/fixtures/";

export const revalidate = 3600; // cache for 1 hour at the route level

const POSITION_MAP: Record<number, "GKP" | "DEF" | "MID" | "FWD"> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

function computeAvgFdr(
  teamId: number,
  fixtures: FPLFixture[],
  currentGw: number,
): number {
  const upcoming = fixtures
    .filter(
      (f) =>
        !f.finished &&
        f.event !== null &&
        f.event >= currentGw &&
        (f.team_h === teamId || f.team_a === teamId),
    )
    .sort((a, b) => (a.event ?? 0) - (b.event ?? 0))
    .slice(0, 5);

  if (upcoming.length === 0) return 3; // neutral default

  const total = upcoming.reduce((sum, f) => {
    const diff =
      f.team_h === teamId ? f.team_h_difficulty : f.team_a_difficulty;
    return sum + diff;
  }, 0);

  return Math.round((total / upcoming.length) * 10) / 10;
}

export async function GET() {
  try {
    const [bootstrapRes, fixturesRes] = await Promise.all([
      fetch(FPL_BOOTSTRAP_URL, { cache: "no-store" }),
      fetch(FPL_FIXTURES_URL, { cache: "no-store" }),
    ]);

    if (!bootstrapRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch FPL bootstrap data" },
        { status: 502 },
      );
    }

    const bootstrap: FPLBootstrapResponse = await bootstrapRes.json();
    const fixtures: FPLFixture[] = fixturesRes.ok
      ? await fixturesRes.json()
      : [];

    const currentEvent = bootstrap.events.find((e) => e.is_current);
    const nextEvent = bootstrap.events.find((e) => e.is_next);
    const currentGw = nextEvent?.id ?? currentEvent?.id ?? 1;

    // Build a map of team FDR
    const teamFdrMap = new Map<number, number>();
    for (const team of bootstrap.teams) {
      teamFdrMap.set(team.id, computeAvgFdr(team.id, fixtures, currentGw));
    }

    const teamMap = new Map<number, FPLTeam>(
      bootstrap.teams.map((t) => [t.id, t]),
    );

    const players: EnrichedPlayer[] = bootstrap.elements.map((p) => {
      const team = teamMap.get(p.team);
      return {
        ...p,
        team_name: team?.name ?? "Unknown",
        team_short: team?.short_name ?? "UNK",
        position: POSITION_MAP[p.element_type] ?? "MID",
        price: p.now_cost / 10,
        avg_fdr_next5: teamFdrMap.get(p.team) ?? 3,
      };
    });

    return NextResponse.json({
      players,
      teams: bootstrap.teams,
      currentGameweek: currentGw,
    });
  } catch (err) {
    console.error("[FPL bootstrap] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
