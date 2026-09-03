export type RoundRobinPairing = {
  home: string;
  away: string;
};

const BYE = "__BYE__";

/**
 * Circle-method single round-robin. Returns rounds; each round lists pairings
 * where every team plays exactly once (teams receiving a bye are omitted when
 * the roster size is odd). Never assumes a specific team count.
 *
 * `rotation` selects which leg of a double round-robin is generated:
 *   1 = first rotation (as produced by the circle method)
 *   2 = return fixtures (rounds reversed, home/away swapped) so every pair
 *       plays twice, once at home each.
 */
export function generateSingleRoundRobin(
  teamIds: string[],
  rotation: 1 | 2 = 1,
): RoundRobinPairing[][] {
  const n = teamIds.length;
  if (n < 2) return [];
  const roster: (string | null)[] = [...teamIds];
  if (n % 2 === 1) {
    roster.push(BYE);
  }
  const m = roster.length;
  const fixed = roster[0];
  const rotating = roster.slice(1);
  const rounds: RoundRobinPairing[][] = [];
  for (let r = 0; r < m - 1; r++) {
    const arr = [fixed, ...rotating];
    const round: RoundRobinPairing[] = [];
    const half = m / 2;
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[m - 1 - i];
      if (
        home !== undefined &&
        away !== undefined &&
        home !== null &&
        away !== null &&
        home !== BYE &&
        away !== BYE
      ) {
        round.push({ home, away });
      }
    }
    rounds.push(round);
    const last = rotating.pop();
    if (last !== undefined) {
      rotating.unshift(last);
    }
  }
  if (rotation === 2) {
    return rounds
      .slice()
      .reverse()
      .map((round) => round.map((p) => ({ home: p.away, away: p.home })));
  }
  return rounds;
}

/**
 * Full cross-group round-robin: every team in group A plays every team in
 * group B exactly once. Returns rounds; each round pairs each member of the
 * smaller group with a distinct member of the larger group (larger group
 * members beyond the smaller group's size take a bye that round). The number
 * of rounds equals the larger group's size, so for equal 10-team groups this
 * is 10 rounds of 10 matches (100 fixtures total).
 */
export function generateCrossGroupSchedule(
  groupA: string[],
  groupB: string[],
): RoundRobinPairing[][] {
  const [big, small, bigIsA] =
    groupA.length >= groupB.length
      ? [groupA, groupB, true]
      : [groupB, groupA, false];
  const rounds: RoundRobinPairing[][] = [];
  const n = big.length;
  const m = small.length;
  if (n === 0 || m === 0) return rounds;
  for (let r = 0; r < n; r++) {
    const round: RoundRobinPairing[] = [];
    const homeIsBig = bigIsA ? r % 2 === 0 : r % 2 === 1;
    for (let i = 0; i < m; i++) {
      const bigTeam = big[(i + r) % n];
      const smallTeam = small[i];
      if (bigTeam === undefined || smallTeam === undefined) continue;
      round.push(
        homeIsBig
          ? { home: bigTeam, away: smallTeam }
          : { home: smallTeam, away: bigTeam },
      );
    }
    rounds.push(round);
  }
  return rounds;
}