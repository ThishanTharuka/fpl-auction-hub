// Auto-generated from Supabase MCP — do not edit manually
// Regenerate with: npx supabase gen types typescript --project-id fmwspeazgltewhuknywb

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      auction_results: {
        Row: {
          created_at: string | null;
          fpl_player_id: number;
          id: string;
          league_id: string | null;
          participant_id: string | null;
          position_slot: string | null;
          price_paid: number;
        };
        Insert: {
          created_at?: string | null;
          fpl_player_id: number;
          id?: string;
          league_id?: string | null;
          participant_id?: string | null;
          position_slot?: string | null;
          price_paid: number;
        };
        Update: {
          created_at?: string | null;
          fpl_player_id?: number;
          id?: string;
          league_id?: string | null;
          participant_id?: string | null;
          position_slot?: string | null;
          price_paid?: number;
        };
        Relationships: [
          {
            foreignKeyName: "auction_results_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "auction_results_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
        ];
      };
      leagues: {
        Row: {
          budget_per_team: number;
          created_at: string | null;
          created_by: string | null;
          id: string;
          name: string;
        };
        Insert: {
          budget_per_team: number;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          budget_per_team?: number;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      participants: {
        Row: {
          color: string | null;
          id: string;
          league_id: string | null;
          name: string;
          user_id: string | null;
        };
        Insert: {
          color?: string | null;
          id?: string;
          league_id?: string | null;
          name: string;
          user_id?: string | null;
        };
        Update: {
          color?: string | null;
          id?: string;
          league_id?: string | null;
          name?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "participants_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
        ];
      };
      team_formations: {
        Row: {
          formation: string | null;
          id: string;
          participant_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          formation?: string | null;
          id?: string;
          participant_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          formation?: string | null;
          id?: string;
          participant_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "team_formations_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;
