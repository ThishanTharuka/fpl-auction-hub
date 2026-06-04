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
      [_ in never]: never
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
