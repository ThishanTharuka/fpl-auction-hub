import type { Database } from "@/lib/database.types";

export type CompetitionRow = Database["public"]["Tables"]["competitions"]["Row"];
export type CompetitionTeamRow =
  Database["public"]["Tables"]["competition_teams"]["Row"];
export type CompetitionFixtureRow =
  Database["public"]["Tables"]["competition_fixtures"]["Row"];

export type PhaseType = "intra_group" | "cross_group";

export type GroupPhaseConfig = {
  type: PhaseType;
  legs: number;
};

export type GroupStageConfig = {
  phases: GroupPhaseConfig[];
};

export type Tiebreaker = "points" | "goal_diff" | "head_to_head";

export type QualificationConfig = {
  qualifiers_per_group: number;
  tiebreakers: Tiebreaker[];
};

export type KnockoutConfig = {
  template: string;
  third_place: boolean;
};

export type CompetitionConfig = {
  group_stage: GroupStageConfig;
  qualification: QualificationConfig;
  knockout: KnockoutConfig;
};

export const DEFAULT_FORMAT_CONFIG: CompetitionConfig = {
  group_stage: {
    phases: [
      // Phase 1 (MD1-9): first intra-group round-robin in each group
      { type: "intra_group", legs: 1 },
      // Phase 2 (MD10-18): second intra-group round-robin (return rotation)
      { type: "intra_group", legs: 1 },
      // Phase 3 (MD19-28): full cross-group round-robin (A vs B)
      { type: "cross_group", legs: 1 },
    ],
  },
  qualification: {
    qualifiers_per_group: 8,
    tiebreakers: ["points", "goal_diff", "head_to_head"],
  },
  knockout: { template: "two_path_v1", third_place: false },
};

export type GroupLabel = "A" | "B";

export type FixtureDraft = {
  competition_id: string;
  stage: "group" | "knockout";
  phase: string;
  tie_index: number;
  leg: number;
  gw: number;
  home_team_id: string | null;
  away_team_id: string | null;
};

export type KnockoutEntrant =
  | { kind: "seed"; group: GroupLabel; rank: number }
  | { kind: "winner"; from: string }
  | { kind: "loser"; from: string };

export type KnockoutSlotDef = {
  phase: string;
  legs: number;
  gwOffsets: number[];
  home: KnockoutEntrant;
  away: KnockoutEntrant;
  onWin: string;
  onLose?: string;
};

export type DeciderSlotDef = {
  phase: "decider";
  entrants: [KnockoutEntrant, KnockoutEntrant, KnockoutEntrant];
  gwOffset: number;
  onWin: string;
};

export type TwoPathBracket = {
  slots: KnockoutSlotDef[];
  decider: DeciderSlotDef;
};

export type TieResult = {
  phase: string;
  tieIndex: number;
  homeTeamId: string;
  awayTeamId: string;
  homePoints: number;
  awayPoints: number;
  winnerId: string;
  loserId: string;
  draw: boolean;
};

export type StandingRow = {
  teamId: string;
  group: GroupLabel;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  goalDiff: number;
  points: number;
};

export type ResolvedSlot = {
  phase: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
};