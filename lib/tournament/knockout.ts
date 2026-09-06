import type {
  CompetitionFixtureRow,
  GroupLabel,
  KnockoutEntrant,
  ResolvedSlot,
  TwoPathBracket,
} from "./types";

export type TieOutcome = {
  phase: string;
  winnerId: string | null;
  loserId: string | null;
};

/**
 * Computes the outcome of every tie from its (possibly multi-leg) fixture rows.
 * A tie's result is the aggregate points across legs. Level aggregates on
 * knockout ties fall back to the second-leg away team, then null (manual).
 */
export function computeTieOutcomes(
  fixtures: CompetitionFixtureRow[],
): Map<string, TieOutcome> {
  const byTie = new Map<string, CompetitionFixtureRow[]>();
  const deciderRows: CompetitionFixtureRow[] = [];
  for (const f of fixtures) {
    if (f.phase === "decider") {
      deciderRows.push(f);
      continue;
    }
    const key = `${f.phase}:${f.tie_index}`;
    const arr = byTie.get(key) ?? [];
    arr.push(f);
    byTie.set(key, arr);
  }

  const outcomes = new Map<string, TieOutcome>();

  if (deciderRows.length > 0) {
    const totals = new Map<string, number>();
    let complete = true;
    for (const r of deciderRows) {
      if (r.home_points === null || r.away_points === null) {
        complete = false;
        continue;
      }
      if (r.home_team_id) {
        totals.set(r.home_team_id, (totals.get(r.home_team_id) ?? 0) + r.home_points);
      }
      if (r.away_team_id) {
        totals.set(r.away_team_id, (totals.get(r.away_team_id) ?? 0) + r.away_points);
      }
    }
    let winnerId: string | null = null;
    let best = -Infinity;
    for (const [id, pts] of totals) {
      if (pts > best) {
        best = pts;
        winnerId = id;
      }
    }
    outcomes.set("decider", {
      phase: "decider",
      winnerId: complete ? winnerId : null,
      loserId: null,
    });
  }

  for (const [key, rows] of byTie) {
    const phase = key.slice(0, key.lastIndexOf(":"));

    let homeTotal = 0;
    let awayTotal = 0;
    let homeId: string | null = null;
    let awayId: string | null = null;
    let complete = true;
    for (const r of rows) {
      if (r.home_points === null || r.away_points === null) {
        complete = false;
        continue;
      }
      const homeIsHome = r.leg % 2 === 1;
      homeTotal += homeIsHome ? r.home_points : r.away_points;
      awayTotal += homeIsHome ? r.away_points : r.home_points;
      homeId = homeIsHome ? r.home_team_id : r.away_team_id;
      awayId = homeIsHome ? r.away_team_id : r.home_team_id;
    }

    if (!complete || homeId === null || awayId === null) {
      outcomes.set(phase, { phase, winnerId: null, loserId: null });
      continue;
    }

    if (homeTotal > awayTotal) {
      outcomes.set(phase, { phase, winnerId: homeId, loserId: awayId });
    } else if (awayTotal > homeTotal) {
      outcomes.set(phase, { phase, winnerId: awayId, loserId: homeId });
    } else {
      const leg2 = rows.find((r) => r.leg === 2);
      if (leg2 && leg2.away_points !== null && leg2.home_points !== null) {
        if (leg2.away_points > leg2.home_points) {
          outcomes.set(phase, { phase, winnerId: awayId, loserId: homeId });
        } else if (leg2.home_points > leg2.away_points) {
          outcomes.set(phase, { phase, winnerId: homeId, loserId: awayId });
        } else {
          outcomes.set(phase, { phase, winnerId: null, loserId: null });
        }
      } else {
        outcomes.set(phase, { phase, winnerId: null, loserId: null });
      }
    }
  }

  return outcomes;
}

export function resolveEntrant(
  ent: KnockoutEntrant,
  outcomes: Map<string, TieOutcome>,
  seeds: { group: GroupLabel; teamIds: string[] }[],
): string | null {
  if (ent.kind === "seed") {
    const roster = seeds.find((s) => s.group === ent.group);
    return roster?.teamIds[ent.rank - 1] ?? null;
  }
  const outcome = outcomes.get(ent.from);
  if (!outcome) return null;
  return ent.kind === "winner" ? outcome.winnerId : outcome.loserId;
}

/**
 * Resolves every knockout slot's team ids: seed slots from the group rankings
 * (index 0 = rank 1) and dependent slots from the tie outcomes map.
 */
export function resolveKnockoutPlacement(
  bracket: TwoPathBracket,
  outcomes: Map<string, TieOutcome>,
  seeds: { group: GroupLabel; teamIds: string[] }[],
): ResolvedSlot[] {
  const placements: ResolvedSlot[] = [];
  for (const slot of bracket.slots) {
    const home = resolveEntrant(slot.home, outcomes, seeds);
    const away = resolveEntrant(slot.away, outcomes, seeds);
    placements.push({ phase: slot.phase, homeTeamId: home, awayTeamId: away });
  }
  const decider = bracket.decider;
  const entrants = decider.entrants.map((e) => resolveEntrant(e, outcomes, seeds));
  placements.push({
    phase: decider.phase,
    homeTeamId: entrants[0] ?? null,
    awayTeamId: entrants[1] ?? null,
  });
  return placements;
}