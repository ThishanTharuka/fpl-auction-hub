import { computeChipAdjustment } from "./chips";
import type { ChipNote, FixtureChipNotes } from "./chips";
import type { CompetitionFixtureRow, CompetitionTeamRow } from "./types";

/**
 * A manager's gameweek score straight from FPL. `points` still contains any
 * chip effect; the chip correction happens in {@link scoreGameweek}.
 */
export interface ManagerGameweekScore {
  points: number;
  chip: string | null;
  /** Base points of the captain. Null when live data was unavailable. */
  captainPoints: number | null;
  /** Total bench points. Null when live data was unavailable. */
  benchPoints: number | null;
}

export type FetchScoreFn = (
  fplManagerId: number,
  gw: number,
) => Promise<ManagerGameweekScore | null>;

export type ScoreResult = {
  scored: { fixtureId: string; homePoints: number; awayPoints: number }[];
  manual: CompetitionFixtureRow[];
  /** Why a fixture could not be auto-scored, keyed by fixture ID. */
  manualReasons: Record<string, string>;
  /** Chip audit trail for every fixture touched, keyed by fixture ID. */
  chipNotes: Record<string, FixtureChipNotes>;
};

const FPL_ENTRY_URL = "https://fantasy.premierleague.com/api/entry";
const FPL_LIVE_URL = "https://fantasy.premierleague.com/api/event";

type PicksResponse = {
  active_chip?: string | null;
  entry_history?: { points?: number; points_on_bench?: number };
  picks?: Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
};

type LiveResponse = {
  elements?: Array<{ id: number; stats?: { total_points?: number } }>;
};

/**
 * Reads a manager's gameweek total plus the extra context needed to undo a
 * chip: the captain's and bench's raw points (from the single, cached
 * `/event/{gw}/live/` call shared by every manager in the gameweek).
 */
export async function fetchFplGameweekScore(
  fplManagerId: number,
  gw: number,
): Promise<ManagerGameweekScore | null> {
  const [picksRes, liveRes] = await Promise.all([
    fetch(`${FPL_ENTRY_URL}/${fplManagerId}/event/${gw}/picks/`, {
      next: { revalidate: 300 },
    }),
    fetch(`${FPL_LIVE_URL}/${gw}/live/`, { next: { revalidate: 300 } }),
  ]);
  if (!picksRes.ok) return null;

  const data = (await picksRes.json()) as PicksResponse;
  const points = data.entry_history?.points;
  if (typeof points !== "number") return null;

  const picks = data.picks ?? [];
  const chip = data.active_chip ?? null;

  let livePoints: Map<number, number> | null = null;
  if (liveRes.ok) {
    const live = (await liveRes.json()) as LiveResponse;
    livePoints = new Map();
    for (const el of live.elements ?? []) {
      livePoints.set(el.id, el.stats?.total_points ?? 0);
    }
  }

  const captain = picks.find((p) => p.is_captain);
  const captainPoints =
    livePoints && captain ? (livePoints.get(captain.element) ?? 0) : null;

  let benchPoints: number | null = null;
  if (livePoints) {
    benchPoints = picks
      .filter((p) => p.position > 11)
      .reduce((sum, p) => sum + (livePoints?.get(p.element) ?? 0), 0);
  } else if (chip === "bboost") {
    benchPoints = data.entry_history?.points_on_bench ?? null;
  }

  return { points, chip, captainPoints, benchPoints };
}

/**
 * Scores every fixture in a gameweek. A fixture whose two teams both have an
 * fpl_manager_id gets its score fetched (injectable for tests); otherwise it
 * is flagged for manual entry. Unresolved (NULL team) fixtures are skipped.
 *
 * Chips are stripped from the score when the fixture's stage forbids them
 * (`chipsAllowedForStage`, defaults to "knockout only"). A chip that cannot be
 * reversed (Free Hit) forces the fixture into manual entry instead.
 */
export async function scoreGameweek(args: {
  gw: number;
  teams: CompetitionTeamRow[];
  fixtures: CompetitionFixtureRow[];
  fetchScore: FetchScoreFn;
  chipsAllowedForStage?: (stage: string) => boolean;
}): Promise<ScoreResult> {
  const { gw, teams, fixtures, fetchScore } = args;
  const chipsAllowed = args.chipsAllowedForStage ?? ((stage: string) => stage !== "group");
  const managerByTeam = new Map(teams.map((t) => [t.id, t.fpl_manager_id]));
  const scored: ScoreResult["scored"] = [];
  const manual: CompetitionFixtureRow[] = [];
  const manualReasons: Record<string, string> = {};
  const chipNotes: Record<string, FixtureChipNotes> = {};

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
  const managerScoresMap = new Map<number, ManagerGameweekScore | null>();
  const managerIdsList = [...distinctManagerIds];
  const BATCH_SIZE = 5;

  for (let i = 0; i < managerIdsList.length; i += BATCH_SIZE) {
    const batch = managerIdsList.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((mId) => fetchScore(mId, gw).catch(() => null)),
    );
    batch.forEach((mId, idx) => {
      managerScoresMap.set(mId, results[idx] ?? null);
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

    const homeScore = managerScoresMap.get(homeManager) ?? null;
    const awayScore = managerScoresMap.get(awayManager) ?? null;

    if (!homeScore || !awayScore) {
      manual.push(fixture);
      continue;
    }

    const allowed = chipsAllowed(fixture.stage);
    const homeAdj = computeChipAdjustment({
      chip: homeScore.chip,
      points: homeScore.points,
      captainPoints: homeScore.captainPoints,
      benchPoints: homeScore.benchPoints,
      allowed,
    });
    const awayAdj = computeChipAdjustment({
      chip: awayScore.chip,
      points: awayScore.points,
      captainPoints: awayScore.captainPoints,
      benchPoints: awayScore.benchPoints,
      allowed,
    });

    if (homeAdj.note || awayAdj.note) {
      chipNotes[fixture.id] = { home: homeAdj.note, away: awayAdj.note };
    }

    if (homeAdj.requiresManual || awayAdj.requiresManual) {
      const reasons = [homeAdj.manualReason, awayAdj.manualReason].filter(
        Boolean,
      );
      manualReasons[fixture.id] = reasons.join(" ");
      manual.push(fixture);
      continue;
    }

    scored.push({
      fixtureId: fixture.id,
      homePoints: homeAdj.adjustedPoints,
      awayPoints: awayAdj.adjustedPoints,
    });
  }

  return { scored, manual, manualReasons, chipNotes };
}

export type { ChipNote };
