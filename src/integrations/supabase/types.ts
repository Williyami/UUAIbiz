export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      companies: {
        Row: {
          assigned_to: string | null;
          contact_email: string | null;
          contact_person: string | null;
          contact_phone: string | null;
          created_at: string;
          id: string;
          last_contact_date: string | null;
          name: string;
          notes: string | null;
          source: string | null;
          status: Database["public"]["Enums"]["company_status"];
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          contact_email?: string | null;
          contact_person?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          last_contact_date?: string | null;
          name: string;
          notes?: string | null;
          source?: string | null;
          status?: Database["public"]["Enums"]["company_status"];
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          contact_email?: string | null;
          contact_person?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          last_contact_date?: string | null;
          name?: string;
          notes?: string | null;
          source?: string | null;
          status?: Database["public"]["Enums"]["company_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "companies_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contract_templates: {
        Row: {
          language: string;
          pricing: Json;
          template: string;
          updated_at: string;
        };
        Insert: {
          language: string;
          pricing?: Json;
          template: string;
          updated_at?: string;
        };
        Update: {
          language?: string;
          pricing?: Json;
          template?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          company_name: string;
          content_snapshot: string | null;
          custom_terms: string | null;
          date_generated: string;
          event_type: Database["public"]["Enums"]["event_type"];
          generated_by: string | null;
          id: string;
          language: string;
          price: number;
        };
        Insert: {
          company_name: string;
          content_snapshot?: string | null;
          custom_terms?: string | null;
          date_generated?: string;
          event_type: Database["public"]["Enums"]["event_type"];
          generated_by?: string | null;
          id?: string;
          language?: string;
          price: number;
        };
        Update: {
          company_name?: string;
          content_snapshot?: string | null;
          custom_terms?: string | null;
          date_generated?: string;
          event_type?: Database["public"]["Enums"]["event_type"];
          generated_by?: string | null;
          id?: string;
          language?: string;
          price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "contracts_generated_by_fkey";
            columns: ["generated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          assigned_to: string | null;
          company_id: string | null;
          cost_to_us: number;
          created_at: string;
          date: string | null;
          duration: string | null;
          event_type: Database["public"]["Enums"]["event_type"];
          food_cost: number;
          id: string;
          luma_link: string | null;
          notes: string | null;
          participant_count: number | null;
          revenue_from_partner: number;
          status: Database["public"]["Enums"]["event_status"];
          title: string;
          updated_at: string;
          venue: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          company_id?: string | null;
          cost_to_us?: number;
          created_at?: string;
          date?: string | null;
          duration?: string | null;
          event_type?: Database["public"]["Enums"]["event_type"];
          food_cost?: number;
          id?: string;
          luma_link?: string | null;
          notes?: string | null;
          participant_count?: number | null;
          revenue_from_partner?: number;
          status?: Database["public"]["Enums"]["event_status"];
          title: string;
          updated_at?: string;
          venue?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          company_id?: string | null;
          cost_to_us?: number;
          created_at?: string;
          date?: string | null;
          duration?: string | null;
          event_type?: Database["public"]["Enums"]["event_type"];
          food_cost?: number;
          id?: string;
          luma_link?: string | null;
          notes?: string | null;
          participant_count?: number | null;
          revenue_from_partner?: number;
          status?: Database["public"]["Enums"]["event_status"];
          title?: string;
          updated_at?: string;
          venue?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      info_sections: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          id: string;
          must_change_password: boolean;
          name: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          id: string;
          must_change_password?: boolean;
          name?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          must_change_password?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          assigned_to: string | null;
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          priority: Database["public"]["Enums"]["task_priority"];
          related_company_id: string | null;
          related_event_id: string | null;
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          related_company_id?: string | null;
          related_event_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          related_company_id?: string | null;
          related_event_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_related_company_id_fkey";
            columns: ["related_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_related_event_id_fkey";
            columns: ["related_event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "member";
      company_status: "Contacted" | "Negotiating" | "Booked" | "Completed" | "Declined" | "On hold";
      event_status: "Planned" | "Confirmed" | "Completed" | "Cancelled";
      event_type: "Lunch lecture" | "Evening event" | "Weekend event or longer" | "Other";
      task_priority: "Low" | "Medium" | "High";
      task_status: "To do" | "In progress" | "Done";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
      company_status: ["Contacted", "Negotiating", "Booked", "Completed", "Declined", "On hold"],
      event_status: ["Planned", "Confirmed", "Completed", "Cancelled"],
      event_type: ["Lunch lecture", "Evening event", "Weekend event or longer", "Other"],
      task_priority: ["Low", "Medium", "High"],
      task_status: ["To do", "In progress", "Done"],
    },
  },
} as const;
