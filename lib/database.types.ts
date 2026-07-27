export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
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
        Relationships: [
          {
            foreignKeyName: "auction_bids_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "auction_nominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "auction_nominations_current_bidder_id_fkey"
            columns: ["current_bidder_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_nominations_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_nominations_winning_participant_id_fkey"
            columns: ["winning_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "auction_results_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_results_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: number
          league_id: string
          message: string
          participant_id: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: never
          league_id: string
          message: string
          participant_id?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          id?: never
          league_id?: string
          message?: string
          participant_id?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
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
          avatar_url: string | null
          color: string | null
          fpl_manager_id: number | null
          id: string
          league_id: string | null
          name: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          color?: string | null
          fpl_manager_id?: number | null
          id?: string
          league_id?: string | null
          name: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          color?: string | null
          fpl_manager_id?: number | null
          id?: string
          league_id?: string | null
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "team_formations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "team_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          away_fpl_pts: number | null
          away_team_id: string | null
          created_at: string | null
          group_name: string | null
          gw: number
          home_fpl_pts: number | null
          home_team_id: string | null
          id: string
          round_label: Database["public"]["Enums"]["round_label"]
          round_number: number
          stage_id: string
          status: Database["public"]["Enums"]["match_status"]
          winner_team_id: string | null
        }
        Insert: {
          away_fpl_pts?: number | null
          away_team_id?: string | null
          created_at?: string | null
          group_name?: string | null
          gw: number
          home_fpl_pts?: number | null
          home_team_id?: string | null
          id?: string
          round_label?: Database["public"]["Enums"]["round_label"]
          round_number: number
          stage_id: string
          status?: Database["public"]["Enums"]["match_status"]
          winner_team_id?: string | null
        }
        Update: {
          away_fpl_pts?: number | null
          away_team_id?: string | null
          created_at?: string | null
          group_name?: string | null
          gw?: number
          home_fpl_pts?: number | null
          home_team_id?: string | null
          id?: string
          round_label?: Database["public"]["Enums"]["round_label"]
          round_number?: number
          stage_id?: string
          status?: Database["public"]["Enums"]["match_status"]
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_stages: {
        Row: {
          advance_qualifiers: number | null
          config: Json
          created_at: string | null
          end_gw: number
          id: string
          name: string
          scoring_mode: Database["public"]["Enums"]["scoring_mode"]
          stage_order: number
          start_gw: number
          status: Database["public"]["Enums"]["tournament_status"]
          tournament_id: string
          type: Database["public"]["Enums"]["stage_type"]
        }
        Insert: {
          advance_qualifiers?: number | null
          config?: Json
          created_at?: string | null
          end_gw: number
          id?: string
          name: string
          scoring_mode?: Database["public"]["Enums"]["scoring_mode"]
          stage_order: number
          start_gw: number
          status?: Database["public"]["Enums"]["tournament_status"]
          tournament_id: string
          type: Database["public"]["Enums"]["stage_type"]
        }
        Update: {
          advance_qualifiers?: number | null
          config?: Json
          created_at?: string | null
          end_gw?: number
          id?: string
          name?: string
          scoring_mode?: Database["public"]["Enums"]["scoring_mode"]
          stage_order?: number
          start_gw?: number
          status?: Database["public"]["Enums"]["tournament_status"]
          tournament_id?: string
          type?: Database["public"]["Enums"]["stage_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tournament_stages_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_standings: {
        Row: {
          drawn: number | null
          fpl_pts_against: number | null
          fpl_pts_diff: number | null
          fpl_pts_for: number | null
          group_name: string | null
          id: string
          lost: number | null
          match_points: number | null
          played: number | null
          position: number | null
          stage_id: string
          team_id: string
          won: number | null
        }
        Insert: {
          drawn?: number | null
          fpl_pts_against?: number | null
          fpl_pts_diff?: number | null
          fpl_pts_for?: number | null
          group_name?: string | null
          id?: string
          lost?: number | null
          match_points?: number | null
          played?: number | null
          position?: number | null
          stage_id: string
          team_id: string
          won?: number | null
        }
        Update: {
          drawn?: number | null
          fpl_pts_against?: number | null
          fpl_pts_diff?: number | null
          fpl_pts_for?: number | null
          group_name?: string | null
          id?: string
          lost?: number | null
          match_points?: number | null
          played?: number | null
          position?: number | null
          stage_id?: string
          team_id?: string
          won?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_standings_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_gw: number
          id: string
          league_id: string
          name: string
          start_gw: number
          status: Database["public"]["Enums"]["tournament_status"]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_gw?: number
          id?: string
          league_id: string
          name: string
          start_gw?: number
          status?: Database["public"]["Enums"]["tournament_status"]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_gw?: number
          id?: string
          league_id?: string
          name?: string
          start_gw?: number
          status?: Database["public"]["Enums"]["tournament_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user: { Args: never; Returns: undefined }
      get_server_time: { Args: never; Returns: string }
      insert_tournament_matches: {
        Args: { p_matches: Json }
        Returns: undefined
      }
      upsert_tournament_standings: {
        Args: { p_standings: Json }
        Returns: undefined
      }
    }
    Enums: {
      match_status: "scheduled" | "completed" | "bye"
      round_label:
        | "league"
        | "swiss"
        | "r32"
        | "r16"
        | "qf"
        | "sf"
        | "third_place"
        | "final"
      scoring_mode: "total_points" | "head_to_head"
      stage_type:
        | "league"
        | "round_robin"
        | "swiss"
        | "knockout"
        | "group_stage"
      tournament_status: "draft" | "active" | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
