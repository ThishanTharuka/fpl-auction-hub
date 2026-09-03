import type {
  CompetitionConfig,
  FixtureDraft,
  GroupLabel,
  TwoPathBracket,
} from "./types";
import {
  generateCrossGroupSchedule,
  generateSingleRoundRobin,
} from "./round-robin";
import { buildTwoPathBracket } from "./knockout-two-path";

export type GroupRoster = {
  group: GroupLabel;
  teamIds: string[];
};

/**
 * Builds the full fixture schedule for a competition: group stage followed by
 * the knockout bracket. Group fixtures carry real team ids; knockout fixtures
 * start with NULL team ids and are populated as group standings / results
 * resolve.
 *
 * The group stage is paced as one matchday per round: each intra-group phase
 * is a full round-robin (rotation 2 = the return fixtures of a double
 * round-robin), and the cross-group phase is a full round-robin of every A-B
 * pairing. A single bye gameweek separates the group stage from the knockout,
 * so for 10-team groups (28 group matchdays) the first knockout round falls on
 * startGw + 29 and the final on startGw + 37.
 */
export function buildSchedule(
  competitionId: string,
  config: CompetitionConfig,
  groupA: GroupRoster,
  groupB: GroupRoster,
  startGw: number,
): FixtureDraft[] {
  const fixtures: FixtureDraft[] = [];
  let tieIndex = 1;
  let gwCursor = startGw;

  const pushTie = (
    stage: "group" | "knockout",
    phase: string,
    home: string | null,
    away: string | null,
    legs: number,
    gw: number,
  ) => {
    for (let leg = 1; leg <= legs; leg++) {
      fixtures.push({
        competition_id: competitionId,
        stage,
        phase,
        tie_index: tieIndex,
        leg,
        gw: gw + leg - 1,
        home_team_id: leg % 2 === 1 ? home : away,
        away_team_id: leg % 2 === 1 ? away : home,
      });
    }
    tieIndex++;
  };

  let intraIndex = 0;
  for (const phase of config.group_stage.phases) {
    if (phase.type === "intra_group") {
      const rotation = intraIndex % 2 === 0 ? 1 : 2;
      const aRounds = generateSingleRoundRobin(groupA.teamIds, rotation);
      const bRounds = generateSingleRoundRobin(groupB.teamIds, rotation);
      const maxRounds = Math.max(aRounds.length, bRounds.length);
      for (let r = 0; r < maxRounds; r++) {
        for (const pairing of aRounds[r] ?? []) {
          pushTie("group", "intra_group", pairing.home, pairing.away, phase.legs, gwCursor);
        }
        for (const pairing of bRounds[r] ?? []) {
          pushTie("group", "intra_group", pairing.home, pairing.away, phase.legs, gwCursor);
        }
        gwCursor += phase.legs;
      }
      intraIndex++;
    } else {
      const rounds = generateCrossGroupSchedule(groupA.teamIds, groupB.teamIds);
      for (const round of rounds) {
        for (const pairing of round) {
          pushTie("group", "cross_group", pairing.home, pairing.away, phase.legs, gwCursor);
        }
        gwCursor += phase.legs;
      }
    }
  }

  // Bye week before the knockout (group stage ends, KO begins the following GW).
  gwCursor += 1;

  const bracket = buildTwoPathBracket();
  const knockout = buildKnockoutFixtures(competitionId, bracket, gwCursor, tieIndex);
  fixtures.push(...knockout);

  return fixtures;
}

export function buildKnockoutFixtures(
  competitionId: string,
  bracket: TwoPathBracket,
  koStartGw: number,
  startTieIndex: number,
): FixtureDraft[] {
  const fixtures: FixtureDraft[] = [];
  let tieIndex = startTieIndex;

  for (const slot of bracket.slots) {
    for (let i = 0; i < slot.legs; i++) {
      const offset = slot.gwOffsets[i] ?? i;
      fixtures.push({
        competition_id: competitionId,
        stage: "knockout",
        phase: slot.phase,
        tie_index: tieIndex,
        leg: i + 1,
        gw: koStartGw + offset,
        home_team_id: null,
        away_team_id: null,
      });
    }
    tieIndex++;
  }

  const decider = bracket.decider;
  for (let i = 0; i < 3; i++) {
    fixtures.push({
      competition_id: competitionId,
      stage: "knockout",
      phase: "decider",
      tie_index: tieIndex,
      leg: 1,
      gw: koStartGw + decider.gwOffset,
      home_team_id: null,
      away_team_id: null,
    });
    tieIndex++;
  }

  return fixtures;
}

export function countGroupMatchdays(
  config: CompetitionConfig,
  groupASize: number,
  groupBSize: number,
): number {
  let total = 0;
  for (const phase of config.group_stage.phases) {
    if (phase.type === "intra_group") {
      total += Math.max(1, Math.max(groupASize, groupBSize) - 1) * phase.legs;
    } else {
      total += Math.max(groupASize, groupBSize) * phase.legs;
    }
  }
  return total;
}