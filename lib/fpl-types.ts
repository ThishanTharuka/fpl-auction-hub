// ─── FPL API Types ────────────────────────────────────────────────────────────

export interface FPLTeam {
  id: number;
  code: number;
  name: string;
  short_name: string;
  strength: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface FPLPlayer {
  id: number;
  code: number;
  first_name: string;
  second_name: string;
  web_name: string;
  photo: string;
  team: number; // team id
  team_code: number;
  element_type: 1 | 2 | 3 | 4; // 1=GKP 2=DEF 3=MID 4=FWD
  now_cost: number; // in tenths (e.g. 65 = £6.5m)
  cost_change_event?: number;
  cost_change_event_fall?: number;
  cost_change_start?: number;
  cost_change_start_fall?: number;
  total_points: number;
  points_per_game: string;
  selected_by_percent: string;
  form: string;
  value_form: string;
  value_season: string;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  expected_goals_per_90?: number;
  expected_assists_per_90?: number;
  expected_goal_involvements_per_90?: number;
  expected_goals_conceded_per_90?: number;
  clean_sheets_per_90?: number;
  saves_per_90?: number;
  starts: number;
  transfers_in?: number;
  transfers_out?: number;
  transfers_in_event: number;
  transfers_out_event: number;
  status: "a" | "d" | "i" | "n" | "s" | "u"; // available/doubtful/injured/not eligible/suspended/unavailable
  news: string;
  news_added: string | null;
  chance_of_playing_next_round: number | null;
  chance_of_playing_this_round: number | null;
}

export interface FPLEventChipPlay {
  chip_name: string;
  num_played: number;
}

export interface FPLEventTopElementInfo {
  id: number;
  points: number;
}

export interface FPLEvent {
  id: number;
  name: string;
  deadline_time: string;
  average_entry_score?: number;
  finished: boolean;
  data_checked?: boolean;
  highest_scoring_entry?: number | null;
  deadline_time_epoch?: number;
  deadline_time_game_offset?: number;
  highest_score?: number | null;
  is_previous: boolean;
  is_current: boolean;
  is_next: boolean;
  chip_plays?: FPLEventChipPlay[];
  most_selected?: number | null;
  most_transferred_in?: number | null;
  top_element?: number | null;
  top_element_info?: FPLEventTopElementInfo | null;
  transfers_made?: number;
  most_captained?: number | null;
  most_vice_captained?: number | null;
}

export interface FPLFixture {
  id: number;
  event: number | null; // gameweek, null = TBC
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  finished: boolean;
  kickoff_time: string | null;
  team_h_score?: number | null;
  team_a_score?: number | null;
}

export interface FPLBootstrapResponse {
  teams: FPLTeam[];
  elements: FPLPlayer[];
  element_types: Array<{
    id: number;
    singular_name: string;
    singular_name_short: string;
    plural_name: string;
    plural_name_short: string;
  }>;
  events: FPLEvent[];
}

export interface FPLElementSummary {
  history: Array<{
    element: number;
    fixture: number;
    opponent_team: number;
    total_points: number;
    was_home: boolean;
    kickoff_time: string;
    team_h_score: number | null;
    team_a_score: number | null;
    round: number;
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    goals_conceded: number;
    yellow_cards: number;
    red_cards: number;
    bonus: number;
    bps: number;
    value: number;
  }>;
  fixtures: Array<{
    id: number;
    event: number;
    difficulty: number;
    team_h: number;
    team_a: number;
    is_home: boolean;
    kickoff_time: string | null;
  }>;
}

// ─── Enriched / Computed Types ────────────────────────────────────────────────

export interface EnrichedPlayer extends FPLPlayer {
  full_name: string;
  image_url: string;
  team_crest_url: string;
  team_name: string;
  team_short: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  price: number; // now_cost / 10
  avg_fdr_next5: number; // average fixture difficulty rating, next 5 GWs
}

export interface FplDataResult {
  players: EnrichedPlayer[];
  teams: FPLTeam[];
  events?: FPLEvent[];
  fixtures?: FPLFixture[];
  currentGameweek: number;
  liveGameweek?: number | null;
}

// ─── Index Builder Types ──────────────────────────────────────────────────────

export interface WeightConfig {
  // Core scoring
  total_points: number;
  points_per_game: number;
  form: number;
  value: number; // points per cost
  // ICT
  ict_index: number;
  influence: number;
  creativity: number;
  threat: number;
  // Expected stats
  xg: number;
  xa: number;
  xgi: number;
  xgc: number; // lower = better (inverted)
  // Season stats
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number; // lower = better (inverted)
  bonus: number;
  bps: number;
  minutes: number;
  // Transfer activity
  selected_by_percent: number;
  // Fixtures
  avg_fdr_next5: number; // lower = better (inverted)
}

export interface IndexedPlayer extends EnrichedPlayer {
  index_score: number;
  normalized: Record<keyof WeightConfig, number>;
}

// ─── Supabase / App Types ─────────────────────────────────────────────────────

export interface League {
  id: string;
  name: string;
  budget_per_team: number;
  created_by: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  league_id: string;
  name: string;
  color: string | null;
  user_id: string | null;
}

export interface AuctionResult {
  id: string;
  league_id: string;
  participant_id: string;
  fpl_player_id: number;
  price_paid: number;
  position_slot: "GKP" | "DEF" | "MID" | "FWD" | "BENCH" | null;
  created_at: string;
}

export interface TeamFormation {
  id: string;
  participant_id: string;
  formation: string;
  updated_at: string;
}
