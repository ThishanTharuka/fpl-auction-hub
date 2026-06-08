export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auction_bids: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          nomination_id: string
          participant_id: string | null
          participant_name: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          nomination_id: string
          participant_id?: string | null
          participant_name: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          nomination_id?: string
          participant_id?: string | null
          participant_name?: string
        }
        Relationships: []
      }
      auction_nominations: {
        Row: {
          bid_end_time: string | null
          created_at: string | null
          current_bid: number
          current_bidder_id: string | null
          current_bidder_name: string | null
          fpl_player_id: number
          id: string
          is_paused: boolean
          league_id: string
          paused_seconds: number | null
          player_name: string
          player_team: string | null
          position: string
          starting_price: number
          status: string | null
          winning_participant_id: string | null
          winning_price: number | null
        }
        Insert: {
          bid_end_time?: string | null
          created_at?: string | null
          current_bid: number
          current_bidder_id?: string | null
          current_bidder_name?: string | null
          fpl_player_id: number
          id?: string
          is_paused?: boolean
          league_id: string
          paused_seconds?: number | null
          player_name: string
          player_team?: string | null
          position: string
          starting_price: number
          status?: string | null
          winning_participant_id?: string | null
          winning_price?: number | null
        }
        Update: {
          bid_end_time?: string | null
          created_at?: string | null
          current_bid?: number
          current_bidder_id?: string | null
          current_bidder_name?: string | null
          fpl_player_id?: number
          id?: string
          is_paused?: boolean
          league_id?: string
          paused_seconds?: number | null
          player_name?: string
          player_team?: string | null
          position?: string
          starting_price?: number
          status?: string | null
          winning_participant_id?: string | null
          winning_price?: number | null
        }
        Relationships: []
      }
      auction_results: {
        Row: {
          created_at: string | null
          fpl_player_id: number
          id: string
          league_id: string | null
          participant_id: string | null
          player_name: string | null
          player_team: string | null
          position_slot: string | null
          price_paid: number
        }
        Insert: {
          created_at?: string | null
          fpl_player_id: number
          id?: string
          league_id?: string | null
          participant_id?: string | null
          player_name?: string | null
          player_team?: string | null
          position_slot?: string | null
          price_paid: number
        }
        Update: {
          created_at?: string | null
          fpl_player_id?: number
          id?: string
          league_id?: string | null
          participant_id?: string | null
          player_name?: string | null
          player_team?: string | null
          position_slot?: string | null
          price_paid?: number
        }
        Relationships: []
      }
      fpl_cache: {
        Row: {
          key: string
          ttl_ms: number
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          ttl_ms?: number
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          ttl_ms?: number
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      leagues: {
        Row: {
          base_price_def: number | null
          base_price_fwd: number | null
          base_price_gkp: number | null
          base_price_mid: number | null
          bid_increment: number | null
          bid_increment_tiers: Json | null
          budget_per_team: number
          created_at: string | null
          created_by: string | null
          id: string
          max_def: number | null
          max_fwd: number | null
          max_gkp: number | null
          max_mid: number | null
          max_per_club: number | null
          name: string
          room_password: string | null
          squad_size: number | null
          status: string | null
          timer_seconds: number | null
        }
        Insert: {
          base_price_def?: number | null
          base_price_fwd?: number | null
          base_price_gkp?: number | null
          base_price_mid?: number | null
          bid_increment?: number | null
          bid_increment_tiers?: Json | null
          budget_per_team: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          max_def?: number | null
          max_fwd?: number | null
          max_gkp?: number | null
          max_mid?: number | null
          max_per_club?: number | null
          name: string
          room_password?: string | null
          squad_size?: number | null
          status?: string | null
          timer_seconds?: number | null
        }
        Update: {
          base_price_def?: number | null
          base_price_fwd?: number | null
          base_price_gkp?: number | null
          base_price_mid?: number | null
          bid_increment?: number | null
          bid_increment_tiers?: Json | null
          budget_per_team?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          max_def?: number | null
          max_fwd?: number | null
          max_gkp?: number | null
          max_mid?: number | null
          max_per_club?: number | null
          name?: string
          room_password?: string | null
          squad_size?: number | null
          status?: string | null
          timer_seconds?: number | null
        }
        Relationships: []
      }
      participants: {
        Row: {
          color: string | null
          id: string
          league_id: string | null
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          id?: string
          league_id?: string | null
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          id?: string
          league_id?: string | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      team_formations: {
        Row: {
          formation: string | null
          id: string
          participant_id: string | null
          updated_at: string | null
        }
        Insert: {
          formation?: string | null
          id?: string
          participant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          formation?: string | null
          id?: string
          participant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          league_id: string
          participant_id: string
          status: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          league_id: string
          participant_id: string
          status?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          league_id?: string
          participant_id?: string
          status?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_server_time: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
