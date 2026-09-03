// Supabase-compatible Database type definition.
// Shape must match what @supabase/supabase-js v2 expects exactly.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          phone: string | null
          display_name: string
          avatar_url: string | null
          bio: string | null
          birthday: string | null
          auth_provider: string
          favorite_songs: string[]
          photo_streak: number
          longest_streak: number
          last_upload_date: string | null
          aura: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          phone?: string | null
          display_name: string
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          auth_provider?: string
          favorite_songs?: string[]
          photo_streak?: number
          longest_streak?: number
          last_upload_date?: string | null
          aura?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          phone?: string | null
          display_name?: string
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          auth_provider?: string
          favorite_songs?: string[]
          photo_streak?: number
          longest_streak?: number
          last_upload_date?: string | null
          aura?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      families: {
        Row: {
          id: string
          name: string
          newspaper_name: string | null
          invite_code: string
          avatar_url: string | null
          timezone: string
          family_streak: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          newspaper_name?: string | null
          invite_code: string
          avatar_url?: string | null
          timezone?: string
          family_streak?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          newspaper_name?: string | null
          invite_code?: string
          avatar_url?: string | null
          timezone?: string
          family_streak?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          id: string
          family_id: string
          user_id: string
          role: string
          nickname: string | null
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          user_id: string
          role?: string
          nickname?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          user_id?: string
          role?: string
          nickname?: string | null
          created_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          family_id: string
          author_id: string
          caption: string | null
          media_urls: string[]
          media_type: string
          ai_tags: string[]
          location_name: string | null
          latitude: number | null
          longitude: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          author_id: string
          caption?: string | null
          media_urls: string[]
          media_type?: string
          ai_tags?: string[]
          location_name?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          author_id?: string
          caption?: string | null
          media_urls?: string[]
          media_type?: string
          ai_tags?: string[]
          location_name?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_reactions: {
        Row: {
          id: string
          post_id: string
          user_id: string
          reaction_type: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          reaction_type: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          reaction_type?: string
          created_at?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          text?: string
          created_at?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          id: string
          family_id: string
          author_id: string
          media_url: string
          media_type: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          author_id: string
          media_url: string
          media_type?: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          author_id?: string
          media_url?: string
          media_type?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          id: string
          family_id: string
          challenge_date: string
          prompts: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          challenge_date: string
          prompts?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          challenge_date?: string
          prompts?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_uploads: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          media_url: string
          prompt_label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          user_id: string
          media_url: string
          prompt_label?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          user_id?: string
          media_url?: string
          prompt_label?: string | null
          created_at?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          id: string
          family_id: string
          title: string
          description: string | null
          category: string
          cover_url: string | null
          start_date: string | null
          end_date: string | null
          location_name: string | null
          ai_summary: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          title: string
          description?: string | null
          category?: string
          cover_url?: string | null
          start_date?: string | null
          end_date?: string | null
          location_name?: string | null
          ai_summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          title?: string
          description?: string | null
          category?: string
          cover_url?: string | null
          start_date?: string | null
          end_date?: string | null
          location_name?: string | null
          ai_summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          family_id: string
          created_by: string
          title: string
          description: string | null
          event_type: string
          start_time: string
          end_time: string | null
          location: string | null
          reminder_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          created_by: string
          title: string
          description?: string | null
          event_type?: string
          start_time: string
          end_time?: string | null
          location?: string | null
          reminder_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          created_by?: string
          title?: string
          description?: string | null
          event_type?: string
          start_time?: string
          end_time?: string | null
          location?: string | null
          reminder_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      newspapers: {
        Row: {
          id: string
          family_id: string
          edition_date: string
          title: string
          sections: Json[]
          cover_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          edition_date: string
          title: string
          sections?: Json[]
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          edition_date?: string
          title?: string
          sections?: Json[]
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      podcast_episodes: {
        Row: {
          id: string
          family_id: string
          week_start: string
          title: string
          script: string
          generated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          week_start: string
          title: string
          script: string
          generated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          week_start?: string
          title?: string
          script?: string
          generated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          id: string
          family_id: string
          game_type: string
          status: string
          config: Json
          scores: Json
          winner_id: string | null
          started_at: string | null
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          game_type: string
          status?: string
          config?: Json
          scores?: Json
          winner_id?: string | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          game_type?: string
          status?: string
          config?: Json
          scores?: Json
          winner_id?: string | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bucket_list_items: {
        Row: {
          id: string
          family_id: string
          created_by: string
          title: string
          description: string | null
          category: string | null
          is_completed: boolean
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          created_by: string
          title: string
          description?: string | null
          category?: string | null
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          created_by?: string
          title?: string
          description?: string | null
          category?: string | null
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_capsules: {
        Row: {
          id: string
          family_id: string
          author_id: string
          title: string
          content_type: string
          content_url: string | null
          text_content: string | null
          unlock_type: string
          unlock_date: string | null
          unlock_milestone: string | null
          is_unlocked: boolean
          unlocked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          author_id: string
          title: string
          content_type: string
          content_url?: string | null
          text_content?: string | null
          unlock_type: string
          unlock_date?: string | null
          unlock_milestone?: string | null
          is_unlocked?: boolean
          unlocked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          author_id?: string
          title?: string
          content_type?: string
          content_url?: string | null
          text_content?: string | null
          unlock_type?: string
          unlock_date?: string | null
          unlock_milestone?: string | null
          is_unlocked?: boolean
          unlocked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          id: string
          family_id: string
          user_id: string | null
          achievement_type: string
          title: string
          description: string | null
          badge_url: string | null
          earned_at: string
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          user_id?: string | null
          achievement_type: string
          title: string
          description?: string | null
          badge_url?: string | null
          earned_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          user_id?: string | null
          achievement_type?: string
          title?: string
          description?: string | null
          badge_url?: string | null
          earned_at?: string
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          family_id: string | null
          type: string
          title: string
          body: string | null
          data: Json
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          family_id?: string | null
          type: string
          title: string
          body?: string | null
          data?: Json
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          family_id?: string | null
          type?: string
          title?: string
          body?: string | null
          data?: Json
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      member_locations: {
        Row: {
          id: string
          family_id: string
          user_id: string
          latitude: number | null
          longitude: number | null
          accuracy: number | null
          location_name: string | null
          sharing_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          user_id: string
          latitude?: number | null
          longitude?: number | null
          accuracy?: number | null
          location_name?: string | null
          sharing_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          user_id?: string
          latitude?: number | null
          longitude?: number | null
          accuracy?: number | null
          location_name?: string | null
          sharing_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mailbox_letters: {
        Row: {
          id: string
          family_id: string
          author_id: string
          recipient_id: string
          title: string
          body: string
          open_condition: string
          open_condition_text: string | null
          is_opened: boolean
          opened_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          author_id: string
          recipient_id: string
          title: string
          body: string
          open_condition?: string
          open_condition_text?: string | null
          is_opened?: boolean
          opened_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          author_id?: string
          recipient_id?: string
          title?: string
          body?: string
          open_condition?: string
          open_condition_text?: string | null
          is_opened?: boolean
          opened_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      wall_entries: {
        Row: {
          id: string
          family_id: string
          author_id: string
          slot: string
          wall_date: string
          message: string
          photo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          author_id: string
          slot: string
          wall_date: string
          message: string
          photo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          author_id?: string
          slot?: string
          wall_date?: string
          message?: string
          photo_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      voice_notes: {
        Row: {
          id: string
          family_id: string
          author_id: string
          audio_url: string
          duration_sec: number
          caption: string | null
          transcript: string | null
          week_start: string
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          author_id: string
          audio_url: string
          duration_sec: number
          caption?: string | null
          transcript?: string | null
          week_start: string
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          author_id?: string
          audio_url?: string
          duration_sec?: number
          caption?: string | null
          transcript?: string | null
          week_start?: string
          created_at?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          id: string
          family_id: string
          user_id: string
          role: string
          content: string
          action_type: string | null
          action_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          user_id: string
          role: string
          content: string
          action_type?: string | null
          action_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          user_id?: string
          role?: string
          content?: string
          action_type?: string | null
          action_data?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      join_family_by_code: {
        Args: {
          code: string
        }
        Returns: Database['public']['Tables']['families']['Row'][]
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
