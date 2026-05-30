import type { EnrichedPlayer, WeightConfig, IndexedPlayer } from "./fpl-types";

export const DEFAULT_WEIGHTS: WeightConfig = {
  total_points: 0.25,
  form: 0.15,
  ict_index: 0.1,
  goals_scored: 0.1,
  assists: 0.1,
  clean_sheets: 0.1,
  bonus: 0.05,
  minutes: 0.05,
  xgi: 0.05,
  value: 0.05,
};

type NumericStat = keyof WeightConfig;

function getRawValue(player: EnrichedPlayer, stat: NumericStat): number {
  switch (stat) {
    case "total_points":
      return player.total_points;
    case "form":
      return parseFloat(player.form) || 0;
    case "ict_index":
      return parseFloat(player.ict_index) || 0;
    case "goals_scored":
      return player.goals_scored;
    case "assists":
      return player.assists;
    case "clean_sheets":
      return player.clean_sheets;
    case "bonus":
      return player.bonus;
    case "minutes":
      return player.minutes;
    case "xgi":
      return parseFloat(player.expected_goal_involvements) || 0;
    case "value":
      return player.price > 0 ? player.total_points / player.price : 0;
    default:
      return 0;
  }
}

/**
 * Normalize all players' raw stat values to [0, 1] using min-max scaling.
 * Returns a map of stat → [min, max] for reference.
 */
function buildNormalizationBounds(
  players: EnrichedPlayer[],
): Record<NumericStat, { min: number; max: number }> {
  const stats: NumericStat[] = [
    "total_points",
    "form",
    "ict_index",
    "goals_scored",
    "assists",
    "clean_sheets",
    "bonus",
    "minutes",
    "xgi",
    "value",
  ];

  const bounds = {} as Record<NumericStat, { min: number; max: number }>;

  for (const stat of stats) {
    const values = players.map((p) => getRawValue(p, stat));
    bounds[stat] = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  return bounds;
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

/**
 * Calculate a weighted index score for a single player.
 * Normalizes stats across the full player pool before applying weights.
 *
 * @param player - The player to score
 * @param weights - Weights for each stat (should sum to ~1.0)
 * @param bounds - Pre-computed min/max bounds from buildNormalizationBounds
 */
export function calculateIndex(
  player: EnrichedPlayer,
  weights: WeightConfig,
  bounds: Record<NumericStat, { min: number; max: number }>,
): { score: number; normalized: Record<NumericStat, number> } {
  const normalized = {} as Record<NumericStat, number>;
  let score = 0;

  for (const [stat, weight] of Object.entries(weights) as [
    NumericStat,
    number,
  ][]) {
    const raw = getRawValue(player, stat);
    const norm = normalize(raw, bounds[stat].min, bounds[stat].max);
    normalized[stat] = Math.round(norm * 1000) / 1000;
    score += norm * weight;
  }

  return { score: Math.round(score * 1000) / 1000, normalized };
}

/**
 * Apply index scoring to an entire player array.
 * Computes bounds once, then scores each player.
 */
export function applyIndexToPlayers(
  players: EnrichedPlayer[],
  weights: WeightConfig = DEFAULT_WEIGHTS,
): IndexedPlayer[] {
  const bounds = buildNormalizationBounds(players);

  return players
    .map((player) => {
      const { score, normalized } = calculateIndex(player, weights, bounds);
      return { ...player, index_score: score, normalized };
    })
    .sort((a, b) => b.index_score - a.index_score);
}
