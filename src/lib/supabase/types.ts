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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_status: {
        Row: {
          created_at: string
          role: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          trial_ends_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          trial_ends_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          trial_ends_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_types: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      ai_calls: {
        Row: {
          completed_at: string | null
          cost_usd: number | null
          created_at: string
          id: string
          input_tokens: number | null
          kind: string
          model: string
          outcome: string
          output_tokens: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          kind: string
          model: string
          outcome?: string
          output_tokens?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          kind?: string
          model?: string
          outcome?: string
          output_tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          adjustment: Json | null
          applied: boolean | null
          created_at: string
          fatigue: number
          feeling: number
          id: string
          user_id: string
          week_start: string
        }
        Insert: {
          adjustment?: Json | null
          applied?: boolean | null
          created_at?: string
          fatigue: number
          feeling: number
          id?: string
          user_id: string
          week_start: string
        }
        Update: {
          adjustment?: Json | null
          applied?: boolean | null
          created_at?: string
          fatigue?: number
          feeling?: number
          id?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          granted_at: string
          id: string
          user_id: string
          version: string
          withdrawn_at: string | null
        }
        Insert: {
          granted_at?: string
          id?: string
          user_id?: string
          version: string
          withdrawn_at?: string | null
        }
        Update: {
          granted_at?: string
          id?: string
          user_id?: string
          version?: string
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      discomfort_marks: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discomfort_marks_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discomfort_marks_session_id_user_id_fkey"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      email_log: {
        Row: {
          created_at: string
          error_code: string | null
          id: string
          kind: string
          period: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: string
          kind: string
          period: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: string
          kind?: string
          period?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      equipment_types: {
        Row: {
          id: string
          increment_kg: number
          min_kg: number
          name: string
          zone: string
        }
        Insert: {
          id: string
          increment_kg: number
          min_kg?: number
          name: string
          zone: string
        }
        Update: {
          id?: string
          increment_kg?: number
          min_kg?: number
          name?: string
          zone?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          id: number
          name: string
          step: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          step?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          step?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exercise_state: {
        Row: {
          calibrated_at: string | null
          exercise_id: string
          increment_kg_override: number | null
          user_id: string
          working_weight_kg: number | null
        }
        Insert: {
          calibrated_at?: string | null
          exercise_id: string
          increment_kg_override?: number | null
          user_id?: string
          working_weight_kg?: number | null
        }
        Update: {
          calibrated_at?: string | null
          exercise_id?: string
          increment_kg_override?: number | null
          user_id?: string
          working_weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_state_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          calibration_load_kg: number
          equipment_type_id: string
          id: string
          joints: string[]
          muscle_groups: string[]
          name: string
          pattern: string
          region: string
        }
        Insert: {
          calibration_load_kg: number
          equipment_type_id: string
          id: string
          joints?: string[]
          muscle_groups: string[]
          name: string
          pattern: string
          region: string
        }
        Update: {
          calibration_load_kg?: number
          equipment_type_id?: string
          id?: string
          joints?: string[]
          muscle_groups?: string[]
          name?: string
          pattern?: string
          region?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_equipment_type_id_fkey"
            columns: ["equipment_type_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_profiles: {
        Row: {
          equipment_type_ids: string[]
          id: string
          preset: string
          updated_at: string
          user_id: string
        }
        Insert: {
          equipment_type_ids?: string[]
          id?: string
          preset: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          equipment_type_ids?: string[]
          id?: string
          preset?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_profile: {
        Row: {
          limitations: string[]
          screening_passed_at: string
          screening_version: string
          updated_at: string
          user_id: string
        }
        Insert: {
          limitations?: string[]
          screening_passed_at: string
          screening_version: string
          updated_at?: string
          user_id: string
        }
        Update: {
          limitations?: string[]
          screening_passed_at?: string
          screening_version?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_answers: {
        Row: {
          created_at: string
          days_per_week: number
          experience: string
          focus: string
          minutes_per_session: number
          sports: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_per_week: number
          experience: string
          focus: string
          minutes_per_session: number
          sports?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_per_week?: number
          experience?: string
          focus?: string
          minutes_per_session?: number
          sports?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_sessions: {
        Row: {
          day_index: number
          id: string
          label: string
          plan_id: string
          user_id: string
        }
        Insert: {
          day_index: number
          id?: string
          label: string
          plan_id: string
          user_id: string
        }
        Update: {
          day_index?: number
          id?: string
          label?: string
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_slots: {
        Row: {
          exercise_id: string | null
          gap_reason: string | null
          id: string
          pattern: string
          plan_session_id: string
          position: number
          region: string
          rep_max: number | null
          rep_min: number | null
          sets: number | null
          user_id: string
        }
        Insert: {
          exercise_id?: string | null
          gap_reason?: string | null
          id?: string
          pattern: string
          plan_session_id: string
          position: number
          region: string
          rep_max?: number | null
          rep_min?: number | null
          sets?: number | null
          user_id: string
        }
        Update: {
          exercise_id?: string | null
          gap_reason?: string | null
          id?: string
          pattern?: string
          plan_session_id?: string
          position?: number
          region?: string
          rep_max?: number | null
          rep_min?: number | null
          sets?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_slots_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slots_plan_session_id_fkey"
            columns: ["plan_session_id"]
            isOneToOne: false
            referencedRelation: "plan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          days_per_week: number
          focus: string
          id: string
          is_active: boolean
          source: string
          template: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          days_per_week: number
          focus: string
          id?: string
          is_active?: boolean
          source: string
          template: string
          user_id: string
          version: number
        }
        Update: {
          created_at?: string
          days_per_week?: number
          focus?: string
          id?: string
          is_active?: boolean
          source?: string
          template?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      set_logs: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          reps: number
          rir: number | null
          session_id: string
          set_index: number
          status: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id: string
          reps: number
          rir?: number | null
          session_id: string
          set_index: number
          status: string
          user_id?: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          reps?: number
          rir?: number | null
          session_id?: string
          set_index?: number
          status?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_session_id_user_id_fkey"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          event_id: string
          processed_at: string
        }
        Insert: {
          event_id: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          processed_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          show_rest_timer: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          show_rest_timer?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          show_rest_timer?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          ended_at: string | null
          id: string
          kind: string
          plan_session_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id: string
          kind: string
          plan_session_id?: string | null
          started_at?: string
          user_id?: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          kind?: string
          plan_session_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_session_id_fkey"
            columns: ["plan_session_id"]
            isOneToOne: false
            referencedRelation: "plan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_stripe_event: {
        Args: {
          p_customer_id: string
          p_event_id: string
          p_status: string
          p_subscription_id: string | null
        }
        Returns: string
      }
      bump_daily_counter: { Args: { p_metric: string }; Returns: undefined }
      reserve_ai_call: {
        Args: {
          p_kind: string
          p_max_duration_s: number
          p_model: string
          p_period_limit: number
          p_user: string
        }
        Returns: Json
      }
      save_plan: {
        Args: {
          p_ai_call: string
          p_cost_usd: number
          p_input_tokens: number
          p_output_tokens: number
          p_plan: Json
          p_user: string
        }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
