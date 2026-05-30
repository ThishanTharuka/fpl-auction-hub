// ─── FPL API Types ────────────────────────────────────────────────────────────

export interface FPLTeam {
  id: number;
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
  first_name: string;
  second_name: string;
  web_name: string;
  team: number; // team id
  team_code: number;
  element_type: 1 | 2 | 3 | 4; // 1=GKP 2=DEF 3=MID 4=FWD
  now_cost: number; // in tenths (e.g. 65 = £6.5m)
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
  transfers_in_event: number;
  transfers_out_event: number;
  status: "a" | "d" | "i" | "n" | "s" | "u"; // available/doubtful/injured/not eligible/suspended/unavailable
  news: string;
  news_added: string | null;
  chance_of_playing_next_round: number | null;
  chance_of_playing_this_round: number | null;
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
  events: Array<{
    id: number;
    name: string;
    deadline_time: string;
    finished: boolean;
    is_current: boolean;
    is_next: boolean;
  }>;
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
  team_name: string;
  team_short: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  price: number; // now_cost / 10
  avg_fdr_next5: number; // average fixture difficulty rating, next 5 GWs
}

// ─── Index Builder Types ──────────────────────────────────────────────────────

export interface WeightConfig {
  total_points: number;
  form: number;
  ict_index: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  bonus: number;
  minutes: number;
  xgi: number; // expected goal involvements
  value: number; // points per cost
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
