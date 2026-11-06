export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: Json | null;
          entity: string;
          entity_id: string | null;
          id: number;
          project_id: string | null;
          summary: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: never;
          project_id?: string | null;
          summary?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: never;
          project_id?: string | null;
          summary?: string | null;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          created_at: string;
          end_date: string;
          id: string;
          note: string | null;
          phase_id: string | null;
          project_id: string | null;
          start_date: string;
          title: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          end_date: string;
          id?: string;
          note?: string | null;
          phase_id?: string | null;
          project_id?: string | null;
          start_date: string;
          title: string;
          type?: string;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          id?: string;
          note?: string | null;
          phase_id?: string | null;
          project_id?: string | null;
          start_date?: string;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_phase_id_fkey";
            columns: ["phase_id"];
            isOneToOne: false;
            referencedRelation: "phases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      phases: {
        Row: {
          category: string;
          code: string | null;
          color: string;
          created_at: string;
          duration_label: string | null;
          end_date: string | null;
          id: string;
          name: string;
          order: number;
          progress: number;
          project_id: string | null;
          start_date: string | null;
          weight: number | null;
        };
        ComputedFields: never;
        Insert: {
          category?: string;
          code?: string | null;
          color?: string;
          created_at?: string;
          duration_label?: string | null;
          end_date?: string | null;
          id?: string;
          name: string;
          order?: number;
          progress?: number;
          project_id?: string | null;
          start_date?: string | null;
          weight?: number | null;
        };
        Update: {
          category?: string;
          code?: string | null;
          color?: string;
          created_at?: string;
          duration_label?: string | null;
          end_date?: string | null;
          id?: string;
          name?: string;
          order?: number;
          progress?: number;
          project_id?: string | null;
          start_date?: string | null;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "phases_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          budget_baht: number | null;
          budget_source: string | null;
          calendar_start_month: string | null;
          cons_heading: string | null;
          cons_subtitle: string | null;
          end_date: string;
          hero_image_path: string | null;
          id: string;
          intro_text: string | null;
          is_active: boolean | null;
          org_name: string | null;
          org_tagline: string | null;
          prep_heading: string | null;
          prep_subtitle: string | null;
          start_date: string;
          subtitle: string | null;
          title: string;
          total_progress: number;
          unit_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          budget_baht?: number | null;
          budget_source?: string | null;
          calendar_start_month?: string | null;
          cons_heading?: string | null;
          cons_subtitle?: string | null;
          end_date: string;
          hero_image_path?: string | null;
          id?: string;
          intro_text?: string | null;
          is_active?: boolean | null;
          org_name?: string | null;
          org_tagline?: string | null;
          prep_heading?: string | null;
          prep_subtitle?: string | null;
          start_date: string;
          subtitle?: string | null;
          title: string;
          total_progress?: number;
          unit_id?: string | null;
          updated_at?: string;
        };
        Update: {
          budget_baht?: number | null;
          budget_source?: string | null;
          calendar_start_month?: string | null;
          cons_heading?: string | null;
          cons_subtitle?: string | null;
          end_date?: string;
          hero_image_path?: string | null;
          id?: string;
          intro_text?: string | null;
          is_active?: boolean | null;
          org_name?: string | null;
          org_tagline?: string | null;
          prep_heading?: string | null;
          prep_subtitle?: string | null;
          start_date?: string;
          subtitle?: string | null;
          title?: string;
          total_progress?: number;
          unit_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      resource_links: {
        Row: {
          created_at: string;
          description: string | null;
          icon: string;
          id: string;
          label: string;
          order: number;
          updated_at: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          label: string;
          order?: number;
          updated_at?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          label?: string;
          order?: number;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      risks: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          mitigation: string | null;
          phase_id: string | null;
          project_id: string | null;
          severity: string;
          status: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          mitigation?: string | null;
          phase_id?: string | null;
          project_id?: string | null;
          severity?: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          mitigation?: string | null;
          phase_id?: string | null;
          project_id?: string | null;
          severity?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "risks_phase_id_fkey";
            columns: ["phase_id"];
            isOneToOne: false;
            referencedRelation: "phases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "risks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      units: {
        Row: {
          created_at: string | null;
          district: string | null;
          id: string;
          lat: number | null;
          lng: number | null;
          name: string;
          province: string | null;
          type: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          district?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          name: string;
          province?: string | null;
          type?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          district?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          name?: string;
          province?: string | null;
          type?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      updates: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          image_url: string | null;
          image_urls: string[];
          phase_id: string | null;
          progress_snapshot: number | null;
          project_id: string | null;
          reporter_name: string | null;
          thumb_urls: string[];
          title: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          image_urls?: string[];
          phase_id?: string | null;
          progress_snapshot?: number | null;
          project_id?: string | null;
          reporter_name?: string | null;
          thumb_urls?: string[];
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          image_urls?: string[];
          phase_id?: string | null;
          progress_snapshot?: number | null;
          project_id?: string | null;
          reporter_name?: string | null;
          thumb_urls?: string[];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "updates_phase_id_fkey";
            columns: ["phase_id"];
            isOneToOne: false;
            referencedRelation: "phases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "updates_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: string;
          unit_id: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          role: string;
          unit_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
          unit_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
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

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
