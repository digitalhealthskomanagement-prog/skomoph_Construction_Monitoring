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
      calendar_events: {
        Row: {
          created_at: string
          end_date: string
          id: string
          note: string | null
          phase_id: string | null
          project_id: string | null
          start_date: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          note?: string | null
          phase_id?: string | null
          project_id?: string | null
          start_date: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          note?: string | null
          phase_id?: string | null
          project_id?: string | null
          start_date?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          category: string
          code: string | null
          color: string
          created_at: string
          duration_label: string | null
          end_date: string | null
          id: string
          name: string
          order: number
          progress: number
          project_id: string | null
          start_date: string | null
          weight: number | null
        }
        Insert: {
          category?: string
          code?: string | null
          color?: string
          created_at?: string
          duration_label?: string | null
          end_date?: string | null
          id?: string
          name: string
          order?: number
          progress?: number
          project_id?: string | null
          start_date?: string | null
          weight?: number | null
        }
        Update: {
          category?: string
          code?: string | null
          color?: string
          created_at?: string
          duration_label?: string | null
          end_date?: string | null
          id?: string
          name?: string
          order?: number
          progress?: number
          project_id?: string | null
          start_date?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget_baht: number | null
          calendar_start_month: string | null
          cons_heading: string | null
          cons_subtitle: string | null
          end_date: string
          hero_image_path: string | null
          id: string
          intro_text: string | null
          org_name: string | null
          org_tagline: string | null
          prep_heading: string | null
          prep_subtitle: string | null
          start_date: string
          subtitle: string | null
          title: string
          total_progress: number
          updated_at: string
          unit_name: string | null
          unit_type: string | null
          district: string | null
          province: string | null
          is_active: boolean
          lat: number | null
          lng: number | null
        }
        Insert: {
          budget_baht?: number | null
          calendar_start_month?: string | null
          cons_heading?: string | null
          cons_subtitle?: string | null
          end_date: string
          hero_image_path?: string | null
          id?: string
          intro_text?: string | null
          org_name?: string | null
          org_tagline?: string | null
          prep_heading?: string | null
          prep_subtitle?: string | null
          start_date: string
          subtitle?: string | null
          title: string
          total_progress?: number
          updated_at?: string
          unit_name?: string | null
          unit_type?: string | null
          district?: string | null
          province?: string | null
          is_active?: boolean
          lat?: number | null
          lng?: number | null
        }
        Update: {
          budget_baht?: number | null
          calendar_start_month?: string | null
          cons_heading?: string | null
          cons_subtitle?: string | null
          end_date?: string
          hero_image_path?: string | null
          id?: string
          intro_text?: string | null
          org_name?: string | null
          org_tagline?: string | null
          prep_heading?: string | null
          prep_subtitle?: string | null
          start_date?: string
          subtitle?: string | null
          title?: string
          total_progress?: number
          updated_at?: string
          unit_name?: string | null
          unit_type?: string | null
          district?: string | null
          province?: string | null
          is_active?: boolean
          lat?: number | null
          lng?: number | null
        }
        Relationships: []
      }
      resource_links: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          label: string
          order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          label: string
          order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          label?: string
          order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      risks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          mitigation: string | null
          phase_id: string | null
          project_id: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          mitigation?: string | null
          phase_id?: string | null
          project_id?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          mitigation?: string | null
          phase_id?: string | null
          project_id?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      updates: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          image_urls: string[]
          phase_id: string | null
          project_id: string | null
          progress_snapshot: number | null
          reporter_name: string | null
          thumb_urls: string[]
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          image_urls?: string[]
          phase_id?: string | null
          project_id?: string | null
          progress_snapshot?: number | null
          reporter_name?: string | null
          thumb_urls?: string[]
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          image_urls?: string[]
          phase_id?: string | null
          project_id?: string | null
          progress_snapshot?: number | null
          reporter_name?: string | null
          thumb_urls?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "updates_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
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
