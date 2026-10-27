import type { CompetitionConfig } from "./types";

/**
 * FPL chip identifiers (`active_chip` on the picks endpoint).
 * 2026/27 exposes wildcard, freehit, bboost and 3xc.
 */
export const CHIP_LABELS: Record<string, string> = {
  bboost: "Bench Boost",
  "3xc": "Triple Captain",
  freehit: "Free Hit",
  wildcard: "Wildcard",
  manager: "Assistant Manager",
};

export function chipLabel(chip: string): string {
  return CHIP_LABELS[chip] ?? chip;
}

/** Stored on `competition_fixtures.chip_notes` for the admin audit trail. */
export interface ChipNote {
  chip: string;
  label: string;
  /** FPL's reported gameweek points (chip effect included). */
  rawPoints: number;
  /** Points removed because the chip is not allowed in this stage. */
  penalty: number;
  /** Points actually recorded for the fixture. */
  adjustedPoints: number;
  /** False when the effect could not be reversed automatically. */
  applied: boolean;
  reason: string;
}

export interface FixtureChipNotes {
  home?: ChipNote | null;
  away?: ChipNote | null;
}

/**
 * Chips are only permitted from the knockout stage onwards. The rule can be
 * relaxed per tournament via `format_config.chip_policy.league_phase_allowed`.
 */
export function chipsAllowedForStage(
  config: Pick<CompetitionConfig, "chip_policy"> | null | undefined,
  stage: string,
): boolean {
  if (stage !== "group") return true;
  return config?.chip_policy?.league_phase_allowed === true;
}

export interface ChipScoreInput {
  chip: string | null;
  /** FPL's reported gameweek points (chip effect included). */
  points: number;
  /** Base points of the captain; null when live data was unavailable. */
  captainPoints: number | null;
  /** Total bench points; null when live data was unavailable. */
  benchPoints: number | null;
  /** Whether chips are permitted for the fixture's stage. */
  allowed: boolean;
}

export interface ChipAdjustment {
  chip: string | null;
  label: string | null;
  penalty: number;
  adjustedPoints: number;
  /** True when the fixture needs a manually entered score. */
  requiresManual: boolean;
  manualReason: string | null;
  /** Only set when a chip was used where it should not have been. */
  note: ChipNote | null;
}

/**
 * Removes the scoring effect of a chip from a manager's gameweek points.
 *
 * - Triple Captain: the captain scores 3x instead of 2x, so `captainPoints` comes off.
 * - Bench Boost: all 15 players score, so the bench total comes off.
 * - Wildcard: transfers only, no points effect - flagged but not penalised.
 * - Free Hit: the original squad is gone, so the score cannot be reconstructed.
 */
export function computeChipAdjustment(input: ChipScoreInput): ChipAdjustment {
  const { chip, points, captainPoints, benchPoints, allowed } = input;

  if (!chip) {
    return {
      chip: null,
      label: null,
      penalty: 0,
      adjustedPoints: points,
      requiresManual: false,
      manualReason: null,
      note: null,
    };
  }

  const label = chipLabel(chip);

  if (allowed) {
    // Legal chip - FPL's number stands and nothing is recorded against it.
    return {
      chip,
      label,
      penalty: 0,
      adjustedPoints: points,
      requiresManual: false,
      manualReason: null,
      note: null,
    };
  }

  let penalty = 0;
  let requiresManual = false;
  let reason = `${label} used in the league phase - not counted`;

  switch (chip) {
    case "3xc":
      if (captainPoints === null) {
        requiresManual = true;
        reason = `${label} used in the league phase and the captain's points could not be fetched`;
      } else {
        penalty = Math.max(0, captainPoints);
      }
      break;
    case "bboost":
      if (benchPoints === null) {
        requiresManual = true;
        reason = `${label} used in the league phase and the bench points could not be fetched`;
      } else {
        penalty = Math.max(0, benchPoints);
      }
      break;
    case "wildcard":
      // Unlimited transfers carry no points effect, but the rule was still broken.
      penalty = 0;
      reason = `${label} used in the league phase - no points impact`;
      break;
    case "freehit":
      requiresManual = true;
      reason = `${label} used in the league phase and cannot be reversed automatically`;
      break;
    default:
      requiresManual = true;
      reason = `${label} used in the league phase and cannot be reversed automatically`;
  }

  const adjustedPoints = Math.max(0, points - penalty);

  return {
    chip,
    label,
    penalty,
    adjustedPoints,
    requiresManual,
    manualReason: requiresManual
      ? `${reason}. Enter this manager's score manually.`
      : null,
    note: {
      chip,
      label,
      rawPoints: points,
      penalty,
      adjustedPoints,
      applied: !requiresManual,
      reason,
    },
  };
}
