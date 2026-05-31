import type { EnrichedPlayer, WeightConfig, IndexedPlayer } from "./fpl-types";

export const DEFAULT_WEIGHTS: WeightConfig = {
  total_points: 0.25,
  points_per_game: 0,
  form: 0.15,
  value: 0.05,
  ict_index: 0.1,
  influence: 0,
  creativity: 0,
  threat: 0,
  xg: 0,
  xa: 0,
  xgi: 0.05,
  xgc: 0,
  goals_scored: 0.1,
  assists: 0.1,
  clean_sheets: 0.1,
  goals_conceded: 0,
  bonus: 0.05,
  bps: 0,
  minutes: 0.05,
  selected_by_percent: 0,
  avg_fdr_next5: 0,
};

type NumericStat = keyof WeightConfig;

// Stats where a LOWER raw value is better — these are inverted during normalization.
const INVERTED_STATS = new Set<NumericStat>([
  "xgc",
  "goals_conceded",
  "avg_fdr_next5",
]);

function getRawValue(player: EnrichedPlayer, stat: NumericStat): number {
  switch (stat) {
    case "total_points":
      return player.total_points;
    case "points_per_game":
      return Number.parseFloat(player.points_per_game) || 0;
    case "form":
      return Number.parseFloat(player.form) || 0;
    case "value":
      return player.price > 0 ? player.total_points / player.price : 0;
    case "ict_index":
      return Number.parseFloat(player.ict_index) || 0;
    case "influence":
      return Number.parseFloat(player.influence) || 0;
    case "creativity":
      return Number.parseFloat(player.creativity) || 0;
    case "threat":
      return Number.parseFloat(player.threat) || 0;
    case "xg":
      return Number.parseFloat(player.expected_goals) || 0;
    case "xa":
      return Number.parseFloat(player.expected_assists) || 0;
    case "xgi":
      return Number.parseFloat(player.expected_goal_involvements) || 0;
    case "xgc":
      return Number.parseFloat(player.expected_goals_conceded) || 0;
    case "goals_scored":
      return player.goals_scored;
    case "assists":
      return player.assists;
    case "clean_sheets":
      return player.clean_sheets;
    case "goals_conceded":
      return player.goals_conceded;
    case "bonus":
      return player.bonus;
    case "bps":
      return player.bps;
    case "minutes":
      return player.minutes;
    case "selected_by_percent":
      return Number.parseFloat(player.selected_by_percent) || 0;
    case "avg_fdr_next5":
      return player.avg_fdr_next5;
    default:
      return 0;
  }
}

/**
 * Normalize all players' raw stat values to [0, 1] using min-max scaling.
 * Returns a map of stat → [min, max] for reference.
 */
const ALL_NUMERIC_STATS: NumericStat[] = [
  "total_points", "points_per_game", "form", "value",
  "ict_index", "influence", "creativity", "threat",
  "xg", "xa", "xgi", "xgc",
  "goals_scored", "assists", "clean_sheets", "goals_conceded",
  "bonus", "bps", "minutes", "selected_by_percent", "avg_fdr_next5",
];

function buildNormalizationBounds(
  players: EnrichedPlayer[],
): Record<NumericStat, { min: number; max: number }> {
  const bounds = {} as Record<NumericStat, { min: number; max: number }>;

  for (const stat of ALL_NUMERIC_STATS) {
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
    let norm = normalize(raw, bounds[stat].min, bounds[stat].max);
    // Invert so that lower raw values score higher (e.g. fewer goals conceded = better)
    if (INVERTED_STATS.has(stat)) norm = 1 - norm;
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
