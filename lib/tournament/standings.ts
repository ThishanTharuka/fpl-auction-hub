import type {
  CompetitionConfig,
  CompetitionFixtureRow,
  CompetitionTeamRow,
  StandingRow,
  TieResult,
} from "./types";

/**
 * Groups fixtures into ties and computes the aggregate result of each. Only
 * fully scored ties are returned (legs present on both sides).
 */
export function computeGroupTies(fixtures: CompetitionFixtureRow[]): TieResult[] {
  const byTie = new Map<string, CompetitionFixtureRow[]>();
  for (const f of fixtures) {
    if (f.stage !== "group") continue;
    const key = `${f.phase}:${f.tie_index}`;
    const arr = byTie.get(key) ?? [];
    arr.push(f);
    byTie.set(key, arr);
  }

  const ties: TieResult[] = [];
  for (const rows of byTie.values()) {
    const first = rows[0];
    if (!first) continue;
    let homeTotal = 0;
    let awayTotal = 0;
    let homeId: string | null = null;
    let awayId: string | null = null;
    let complete = true;
    for (const r of rows) {
      if (r.home_points === null || r.away_points === null) {
        complete = false;
        break;
      }
      const homeIsHome = r.leg % 2 === 1;
      homeTotal += homeIsHome ? r.home_points : r.away_points;
      awayTotal += homeIsHome ? r.away_points : r.home_points;
      homeId = homeIsHome ? r.home_team_id : r.away_team_id;
      awayId = homeIsHome ? r.away_team_id : r.home_team_id;
    }
    if (!complete || homeId === null || awayId === null) continue;
    const draw = homeTotal === awayTotal;
    ties.push({
      phase: first.phase,
      tieIndex: first.tie_index,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homePoints: homeTotal,
      awayPoints: awayTotal,
      winnerId: draw ? homeId : homeTotal > awayTotal ? homeId : awayId,
      loserId: draw ? awayId : homeTotal > awayTotal ? awayId : homeId,
      draw,
    });
  }
  return ties;
}

function buildHeadToHead(
  ties: TieResult[],
): Map<string, Map<string, number>> {
  const h2h = new Map<string, Map<string, number>>();
  const add = (team: string, opponent: string, pts: number) => {
    let m = h2h.get(team);
    if (!m) {
      m = new Map();
      h2h.set(team, m);
    }
    m.set(opponent, (m.get(opponent) ?? 0) + pts);
  };
  for (const tie of ties) {
    const homePts = tie.draw ? 1 : tie.homePoints > tie.awayPoints ? 3 : 0;
    const awayPts = tie.draw ? 1 : tie.awayPoints > tie.homePoints ? 3 : 0;
    add(tie.homeTeamId, tie.awayTeamId, homePts);
    add(tie.awayTeamId, tie.homeTeamId, awayPts);
  }
  return h2h;
}

/**
 * Computes standings from scored group fixtures using the configured
 * tiebreakers (points, goal_diff, head_to_head). Pure function of the fixtures
 * — no persistence required.
 */
export function computeGroupStandings(
  teams: CompetitionTeamRow[],
  fixtures: CompetitionFixtureRow[],
  config: CompetitionConfig,
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const t of teams) {
    rows.set(t.id, {
      teamId: t.id,
      group: t.group_label === "B" ? "B" : "A",
      name: t.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      goalDiff: 0,
      points: 0,
    });
  }

  const ties = computeGroupTies(fixtures);
  for (const tie of ties) {
    const homeRow = rows.get(tie.homeTeamId);
    const awayRow = rows.get(tie.awayTeamId);
    if (!homeRow || !awayRow) continue;
    homeRow.played++;
    awayRow.played++;
    homeRow.pointsFor += tie.homePoints;
    homeRow.pointsAgainst += tie.awayPoints;
    awayRow.pointsFor += tie.awayPoints;
    awayRow.pointsAgainst += tie.homePoints;
    homeRow.goalDiff += tie.homePoints - tie.awayPoints;
    awayRow.goalDiff += tie.awayPoints - tie.homePoints;
    if (tie.draw) {
      homeRow.drawn++;
      awayRow.drawn++;
      homeRow.points += 1;
      awayRow.points += 1;
    } else if (tie.winnerId === tie.homeTeamId) {
      homeRow.won++;
      awayRow.lost++;
      homeRow.points += 3;
    } else {
      awayRow.won++;
      homeRow.lost++;
      awayRow.points += 3;
    }
  }

  const h2h = buildHeadToHead(ties);
  const tiebreakers = config.qualification.tiebreakers;

  return [...rows.values()].sort((a, b) => {
    for (const tb of tiebreakers) {
      if (tb === "points" && b.points !== a.points) {
        return b.points - a.points;
      }
      if (tb === "goal_diff" && b.goalDiff !== a.goalDiff) {
        return b.goalDiff - a.goalDiff;
      }
      if (tb === "head_to_head") {
        const aPts = h2h.get(a.teamId)?.get(b.teamId) ?? 0;
        const bPts = h2h.get(b.teamId)?.get(a.teamId) ?? 0;
        if (bPts !== aPts) return bPts - aPts;
      }
    }
    return a.name.localeCompare(b.name);
  });
}