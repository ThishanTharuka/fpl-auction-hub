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
    PostgrestVersion: "14.15"
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
          is_bench: boolean
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
          is_bench?: boolean
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
          is_bench?: boolean
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
      competition_fixtures: {
        Row: {
          away_points: number | null
          away_team_id: string | null
          competition_id: string
          created_at: string
          gw: number
          home_points: number | null
          home_team_id: string | null
          id: string
          leg: number
          phase: string
          stage: string
          status: string
          tie_index: number
        }
        Insert: {
          away_points?: number | null
          away_team_id?: string | null
          competition_id: string
          created_at?: string
          gw: number
          home_points?: number | null
          home_team_id?: string | null
          id?: string
          leg?: number
          phase: string
          stage: string
          status?: string
          tie_index: number
        }
        Update: {
          away_points?: number | null
          away_team_id?: string | null
          competition_id?: string
          created_at?: string
          gw?: number
          home_points?: number | null
          home_team_id?: string | null
          id?: string
          leg?: number
          phase?: string
          stage?: string
          status?: string
          tie_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "competition_fixtures_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_fixtures_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_fixtures_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_teams: {
        Row: {
          avatar_url: string | null
          color: string | null
          competition_id: string
          created_at: string
          fpl_manager_id: number | null
          group_label: string
          id: string
          league_id: string
          name: string
          participant_id: string
          team_number: number
        }
        Insert: {
          avatar_url?: string | null
          color?: string | null
          competition_id: string
          created_at?: string
          fpl_manager_id?: number | null
          group_label: string
          id?: string
          league_id: string
          name: string
          participant_id: string
          team_number: number
        }
        Update: {
          avatar_url?: string | null
          color?: string | null
          competition_id?: string
          created_at?: string
          fpl_manager_id?: number | null
          group_label?: string
          id?: string
          league_id?: string
          name?: string
          participant_id?: string
          team_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "competition_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_teams_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          created_by: string
          format_config: Json
          id: string
          league_a_id: string
          league_b_id: string
          name: string
          start_gw: number
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          format_config: Json
          id?: string
          league_a_id: string
          league_b_id: string
          name: string
          start_gw: number
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          format_config?: Json
          id?: string
          league_a_id?: string
          league_b_id?: string
          name?: string
          start_gw?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_league_a_id_fkey"
            columns: ["league_a_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_league_b_id_fkey"
            columns: ["league_b_id"]
            isOneToOne: false
            referencedRelation: "leagues"
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
          allow_spectator_chat: boolean
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
          allow_spectator_chat?: boolean
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
          allow_spectator_chat?: boolean
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_fixture_scores: {
        Args: {
          p_fixtures: Json
          p_deciders?: Json | null
          p_knockout_placements?: Json | null
          p_competition_id?: string | null
          p_competition_status?: string | null
        }
        Returns: undefined
      }
      delete_user: { Args: never; Returns: undefined }
      get_server_time: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const