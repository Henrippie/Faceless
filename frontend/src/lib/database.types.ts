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
      api_credentials: {
        Row: {
          elevenlabs_api_key_secret_id: string | null
          image_api_key_secret_id: string | null
          image_base_url: string
          image_model: string
          llm_api_key_secret_id: string | null
          llm_base_url: string
          llm_model: string
          llm_provider: string
          owner_id: string
          updated_at: string
          upload_post_api_key_secret_id: string | null
          upload_post_username: string
        }
        Insert: {
          elevenlabs_api_key_secret_id?: string | null
          image_api_key_secret_id?: string | null
          image_base_url?: string
          image_model?: string
          llm_api_key_secret_id?: string | null
          llm_base_url?: string
          llm_model?: string
          llm_provider?: string
          owner_id: string
          updated_at?: string
          upload_post_api_key_secret_id?: string | null
          upload_post_username?: string
        }
        Update: {
          elevenlabs_api_key_secret_id?: string | null
          image_api_key_secret_id?: string | null
          image_base_url?: string
          image_model?: string
          llm_api_key_secret_id?: string | null
          llm_base_url?: string
          llm_model?: string
          llm_provider?: string
          owner_id?: string
          updated_at?: string
          upload_post_api_key_secret_id?: string | null
          upload_post_username?: string
        }
        Relationships: []
      }
      channels: {
        Row: {
          avatar_url: string | null
          bg_music_path: string | null
          bg_music_volume: number
          created_at: string
          custom_system_prompt: string
          daily_video_target: number
          formats: string[]
          id: string
          image_prompt_template: string
          language: string
          name: string
          niche: string
          owner_id: string
          publish_platforms: string[]
          slug: string
          status: string
          tts_provider: string
          updated_at: string
          video_script_prompt: string
          voice_name: string
          youtube_made_for_kids: boolean
        }
        Insert: {
          avatar_url?: string | null
          bg_music_path?: string | null
          bg_music_volume?: number
          created_at?: string
          custom_system_prompt?: string
          daily_video_target?: number
          formats?: string[]
          id?: string
          image_prompt_template?: string
          language?: string
          name: string
          niche?: string
          owner_id?: string
          publish_platforms?: string[]
          slug: string
          status?: string
          tts_provider?: string
          updated_at?: string
          video_script_prompt?: string
          voice_name?: string
          youtube_made_for_kids?: boolean
        }
        Update: {
          avatar_url?: string | null
          bg_music_path?: string | null
          bg_music_volume?: number
          created_at?: string
          custom_system_prompt?: string
          daily_video_target?: number
          formats?: string[]
          id?: string
          image_prompt_template?: string
          language?: string
          name?: string
          niche?: string
          owner_id?: string
          publish_platforms?: string[]
          slug?: string
          status?: string
          tts_provider?: string
          updated_at?: string
          video_script_prompt?: string
          voice_name?: string
          youtube_made_for_kids?: boolean
        }
        Relationships: []
      }
      videos: {
        Row: {
          approved_at: string | null
          channel_id: string
          created_at: string
          duration_seconds: number | null
          error: string | null
          est_cost_usd: number | null
          horizontal_path: string | null
          id: string
          mode: string
          owner_id: string
          progress_detail: Json
          progress_stage: string | null
          publish_error: string | null
          publish_results: Json
          publish_state: string
          published: Json
          scene_preview_paths: Json
          scheduled_at: string | null
          script: string | null
          status: string
          subject: string
          subtitle_path: string | null
          thumbnail_path: string | null
          title: string | null
          updated_at: string
          vertical_path: string | null
        }
        Insert: {
          approved_at?: string | null
          channel_id: string
          created_at?: string
          duration_seconds?: number | null
          error?: string | null
          est_cost_usd?: number | null
          horizontal_path?: string | null
          id?: string
          mode?: string
          owner_id?: string
          progress_detail?: Json
          progress_stage?: string | null
          publish_error?: string | null
          publish_results?: Json
          publish_state?: string
          published?: Json
          scene_preview_paths?: Json
          scheduled_at?: string | null
          script?: string | null
          status?: string
          subject: string
          subtitle_path?: string | null
          thumbnail_path?: string | null
          title?: string | null
          updated_at?: string
          vertical_path?: string | null
        }
        Update: {
          approved_at?: string | null
          channel_id?: string
          created_at?: string
          duration_seconds?: number | null
          error?: string | null
          est_cost_usd?: number | null
          horizontal_path?: string | null
          id?: string
          mode?: string
          owner_id?: string
          progress_detail?: Json
          progress_stage?: string | null
          publish_error?: string | null
          publish_results?: Json
          publish_state?: string
          published?: Json
          scene_preview_paths?: Json
          scheduled_at?: string | null
          script?: string | null
          status?: string
          subject?: string
          subtitle_path?: string | null
          thumbnail_path?: string | null
          title?: string | null
          updated_at?: string
          vertical_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_video: {
        Args: { p_scheduled_at?: string; p_video_id: string }
        Returns: undefined
      }
      get_credentials_for_owner: { Args: { p_owner_id: string }; Returns: Json }
      get_my_elevenlabs_credential: { Args: never; Returns: Json }
      get_my_image_credential: { Args: never; Returns: Json }
      get_my_llm_credential: { Args: never; Returns: Json }
      set_elevenlabs_credential: {
        Args: { p_api_key: string }
        Returns: undefined
      }
      set_image_credential: {
        Args: { p_api_key: string; p_base_url: string; p_model: string }
        Returns: undefined
      }
      set_llm_credential: {
        Args: {
          p_api_key: string
          p_base_url?: string
          p_model: string
          p_provider: string
        }
        Returns: undefined
      }
      set_upload_post_credential: {
        Args: { p_api_key: string; p_username: string }
        Returns: undefined
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
