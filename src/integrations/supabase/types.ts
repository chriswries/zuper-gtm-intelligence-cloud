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
      activity_log: {
        Row: {
          bot_id: string | null
          bot_name: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          estimated_cost_usd: number | null
          id: string
          input_tokens: number | null
          model_used: string | null
          output_tokens: number | null
          query_text: string | null
          response_text: string | null
          slack_channel_id: string | null
          slack_user_id: string | null
          slack_user_name: string | null
          status: Database["public"]["Enums"]["activity_status"]
          tool_calls: Json | null
        }
        Insert: {
          bot_id?: string | null
          bot_name?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          model_used?: string | null
          output_tokens?: number | null
          query_text?: string | null
          response_text?: string | null
          slack_channel_id?: string | null
          slack_user_id?: string | null
          slack_user_name?: string | null
          status: Database["public"]["Enums"]["activity_status"]
          tool_calls?: Json | null
        }
        Update: {
          bot_id?: string | null
          bot_name?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          model_used?: string | null
          output_tokens?: number | null
          query_text?: string | null
          response_text?: string | null
          slack_channel_id?: string | null
          slack_user_id?: string | null
          slack_user_name?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action_type: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_connectors: {
        Row: {
          bot_id: string
          connector_id: string
          created_at: string
          id: string
        }
        Insert: {
          bot_id: string
          connector_id: string
          created_at?: string
          id?: string
        }
        Update: {
          bot_id?: string
          connector_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_connectors_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_connectors_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      bots: {
        Row: {
          acknowledgment_message: string | null
          created_at: string
          created_by: string | null
          description: string | null
          escalation_user_id: string | null
          handler_type: Database["public"]["Enums"]["handler_type"]
          id: string
          is_active: boolean
          model: Database["public"]["Enums"]["model_type"]
          name: string
          processing_mode: Database["public"]["Enums"]["processing_mode"]
          slack_channel_id: string | null
          system_prompt: string | null
          trigger_pattern: string | null
          trigger_type: Database["public"]["Enums"]["trigger_type"]
          updated_at: string
        }
        Insert: {
          acknowledgment_message?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalation_user_id?: string | null
          handler_type: Database["public"]["Enums"]["handler_type"]
          id?: string
          is_active?: boolean
          model?: Database["public"]["Enums"]["model_type"]
          name: string
          processing_mode?: Database["public"]["Enums"]["processing_mode"]
          slack_channel_id?: string | null
          system_prompt?: string | null
          trigger_pattern?: string | null
          trigger_type: Database["public"]["Enums"]["trigger_type"]
          updated_at?: string
        }
        Update: {
          acknowledgment_message?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalation_user_id?: string | null
          handler_type?: Database["public"]["Enums"]["handler_type"]
          id?: string
          is_active?: boolean
          model?: Database["public"]["Enums"]["model_type"]
          name?: string
          processing_mode?: Database["public"]["Enums"]["processing_mode"]
          slack_channel_id?: string | null
          system_prompt?: string | null
          trigger_pattern?: string | null
          trigger_type?: Database["public"]["Enums"]["trigger_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      connectors: {
        Row: {
          connector_type: Database["public"]["Enums"]["connector_type"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_shared: boolean
          name: string
          status: Database["public"]["Enums"]["connector_status"]
          updated_at: string
          vault_key: string | null
        }
        Insert: {
          connector_type: Database["public"]["Enums"]["connector_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean
          name: string
          status?: Database["public"]["Enums"]["connector_status"]
          updated_at?: string
          vault_key?: string | null
        }
        Update: {
          connector_type?: Database["public"]["Enums"]["connector_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean
          name?: string
          status?: Database["public"]["Enums"]["connector_status"]
          updated_at?: string
          vault_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connectors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          bot_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          query_text: string | null
          slack_channel_id: string | null
          slack_thread_ts: string | null
          slack_user_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
        }
        Insert: {
          bot_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          query_text?: string | null
          slack_channel_id?: string | null
          slack_thread_ts?: string | null
          slack_user_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Update: {
          bot_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          query_text?: string | null
          slack_channel_id?: string | null
          slack_thread_ts?: string | null
          slack_user_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "jobs_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_slack_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
        }
        Relationships: []
      }
      tool_definitions: {
        Row: {
          bot_id: string
          created_at: string
          handler_config: Json | null
          handler_type: Database["public"]["Enums"]["handler_type"]
          id: string
          input_schema: Json | null
          is_active: boolean
          sort_order: number
          tool_description: string | null
          tool_name: string
          updated_at: string
        }
        Insert: {
          bot_id: string
          created_at?: string
          handler_config?: Json | null
          handler_type: Database["public"]["Enums"]["handler_type"]
          id?: string
          input_schema?: Json | null
          is_active?: boolean
          sort_order?: number
          tool_description?: string | null
          tool_name: string
          updated_at?: string
        }
        Update: {
          bot_id?: string
          created_at?: string
          handler_config?: Json | null
          handler_type?: Database["public"]["Enums"]["handler_type"]
          id?: string
          input_schema?: Json | null
          is_active?: boolean
          sort_order?: number
          tool_description?: string | null
          tool_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_definitions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_active: boolean
          role: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          is_active?: boolean
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_slack_events: { Args: never; Returns: undefined }
      delete_connector_secret: {
        Args: { p_vault_key: string }
        Returns: undefined
      }
      read_connector_secret_full: {
        Args: { p_vault_key: string }
        Returns: string
      }
      read_connector_secret_masked: {
        Args: { p_vault_key: string }
        Returns: string
      }
      store_connector_secret: {
        Args: { p_name: string; p_secret: string }
        Returns: string
      }
      update_connector_secret: {
        Args: { p_secret: string; p_vault_key: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_status: "success" | "error" | "timeout" | "rate_limited"
      connector_status: "configured" | "not_configured" | "error"
      connector_type:
        | "slack"
        | "anthropic"
        | "hubspot"
        | "web_search"
        | "custom"
      handler_type: "hubspot" | "web_search" | "passthrough" | "custom"
      job_status: "queued" | "running" | "completed" | "failed"
      model_type: "sonnet" | "opus"
      processing_mode: "sync" | "async"
      trigger_type: "prefix" | "emoji"
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
    Enums: {
      activity_status: ["success", "error", "timeout", "rate_limited"],
      connector_status: ["configured", "not_configured", "error"],
      connector_type: ["slack", "anthropic", "hubspot", "web_search", "custom"],
      handler_type: ["hubspot", "web_search", "passthrough", "custom"],
      job_status: ["queued", "running", "completed", "failed"],
      model_type: ["sonnet", "opus"],
      processing_mode: ["sync", "async"],
      trigger_type: ["prefix", "emoji"],
    },
  },
} as const
