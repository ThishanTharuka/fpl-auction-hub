import type { CompetitionFixtureRow, CompetitionTeamRow } from "./types";

export type FetchPointsFn = (fplManagerId: number, gw: number) => Promise<number | null>;

export type ScoreResult = {
  scored: { fixtureId: string; homePoints: number; awayPoints: number }[];
  manual: CompetitionFixtureRow[];
};

const FPL_PICKS_URL = "https://fantasy.premierleague.com/api/entry";

export async function fetchFplGameweekPoints(
  fplManagerId: number,
  gw: number,
): Promise<number | null> {
  const res = await fetch(`${FPL_PICKS_URL}/${fplManagerId}/event/${gw}/picks/`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { entry_history?: { points?: number } };
  return data.entry_history?.points ?? null;
}

/**
 * Scores every fixture in a gameweek. A fixture whose two teams both have an
 * fpl_manager_id gets its points fetched (injectable for tests); otherwise it
 * is flagged for manual entry. Unresolved (NULL team) fixtures are skipped.
 */
export async function scoreGameweek(args: {
  gw: number;
  teams: CompetitionTeamRow[];
  fixtures: CompetitionFixtureRow[];
  fetchPoints: FetchPointsFn;
}): Promise<ScoreResult> {
  const { gw, teams, fixtures, fetchPoints } = args;
  const managerByTeam = new Map(teams.map((t) => [t.id, t.fpl_manager_id]));
  const scored: ScoreResult["scored"] = [];
  const manual: CompetitionFixtureRow[] = [];

  // Gather distinct manager IDs needed for this gameweek
  const distinctManagerIds = new Set<number>();
  for (const fixture of fixtures) {
    const homeId = fixture.home_team_id;
    const awayId = fixture.away_team_id;
    if (!homeId || !awayId) continue;

    const homeManager = managerByTeam.get(homeId);
    const awayManager = managerByTeam.get(awayId);
    if (homeManager !== null && homeManager !== undefined) {
      distinctManagerIds.add(homeManager);
    }
    if (awayManager !== null && awayManager !== undefined) {
      distinctManagerIds.add(awayManager);
    }
  }

  // Batch-fetch in chunks of 5 with 50ms pause to avoid FPL burst rate limits
  const managerPointsMap = new Map<number, number | null>();
  const managerIdsList = [...distinctManagerIds];
  const BATCH_SIZE = 5;

  for (let i = 0; i < managerIdsList.length; i += BATCH_SIZE) {
    const batch = managerIdsList.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((mId) => fetchPoints(mId, gw).catch(() => null)),
    );
    batch.forEach((mId, idx) => {
      managerPointsMap.set(mId, results[idx] ?? null);
    });
    if (i + BATCH_SIZE < managerIdsList.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  for (const fixture of fixtures) {
    const homeId = fixture.home_team_id;
    const awayId = fixture.away_team_id;
    if (!homeId || !awayId) continue;

    const homeManager = managerByTeam.get(homeId);
    const awayManager = managerByTeam.get(awayId);
    if (
      homeManager === null ||
      homeManager === undefined ||
      awayManager === null ||
      awayManager === undefined
    ) {
      manual.push(fixture);
      continue;
    }

    const homePts = managerPointsMap.get(homeManager) ?? null;
    const awayPts = managerPointsMap.get(awayManager) ?? null;

    if (homePts === null || awayPts === null) {
      manual.push(fixture);
      continue;
    }

    scored.push({ fixtureId: fixture.id, homePoints: homePts, awayPoints: awayPts });
  }

  return { scored, manual };
}