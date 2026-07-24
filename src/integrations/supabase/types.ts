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
      deals: {
        Row: {
          ai_summary: string | null
          ai_talking_points: Json | null
          color_theme: string | null
          created_at: string
          id: string
          name: string
          prospect_brand: Json | null
          prospect_company: string | null
          prospect_logo_url: string | null
          report: Json | null
          scenario: string
          template_id: string | null
          template_snapshot: Json | null
          updated_at: string
          user_id: string
          values: Json
        }
        Insert: {
          ai_summary?: string | null
          ai_talking_points?: Json | null
          color_theme?: string | null
          created_at?: string
          id?: string
          name?: string
          prospect_brand?: Json | null
          prospect_company?: string | null
          prospect_logo_url?: string | null
          report?: Json | null
          scenario?: string
          template_id?: string | null
          template_snapshot?: Json | null
          updated_at?: string
          user_id?: string
          values?: Json
        }
        Update: {
          ai_summary?: string | null
          ai_talking_points?: Json | null
          color_theme?: string | null
          created_at?: string
          id?: string
          name?: string
          prospect_brand?: Json | null
          prospect_company?: string | null
          prospect_logo_url?: string | null
          report?: Json | null
          scenario?: string
          template_id?: string | null
          template_snapshot?: Json | null
          updated_at?: string
          user_id?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "deals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          content: Json
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      research: {
        Row: {
          created_at: string
          deal_id: string | null
          id: string
          mode: string
          query: string
          result: Json
          sources: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          id?: string
          mode?: string
          query: string
          result?: Json
          sources?: Json | null
          user_id?: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          id?: string
          mode?: string
          query?: string
          result?: Json
          sources?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          color_theme: string | null
          created_at: string
          description: string | null
          formulas: Json
          icon: string | null
          id: string
          industry: string | null
          is_builtin: boolean
          name: string
          outputs: Json
          parameters: Json
          returns: Json
          scenarios: Json
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color_theme?: string | null
          created_at?: string
          description?: string | null
          formulas?: Json
          icon?: string | null
          id?: string
          industry?: string | null
          is_builtin?: boolean
          name: string
          outputs?: Json
          parameters?: Json
          returns?: Json
          scenarios?: Json
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          color_theme?: string | null
          created_at?: string
          description?: string | null
          formulas?: Json
          icon?: string | null
          id?: string
          industry?: string | null
          is_builtin?: boolean
          name?: string
          outputs?: Json
          parameters?: Json
          returns?: Json
          scenarios?: Json
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          brand_logo_url: string | null
          brand_primary_color: string | null
          brand_tagline: string | null
          company_name: string | null
          created_at: string
          default_currency: string | null
          default_template_id: string | null
          id: string
          preferences: Json | null
          product_description: string | null
          scenario_multipliers: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_tagline?: string | null
          company_name?: string | null
          created_at?: string
          default_currency?: string | null
          default_template_id?: string | null
          id?: string
          preferences?: Json | null
          product_description?: string | null
          scenario_multipliers?: Json | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_tagline?: string | null
          company_name?: string | null
          created_at?: string
          default_currency?: string | null
          default_template_id?: string | null
          id?: string
          preferences?: Json | null
          product_description?: string | null
          scenario_multipliers?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          ai_prompt: string | null
          chatwoot_account_id: string | null
          chatwoot_inbox_id: string | null
          created_at: string
          due_date: string | null
          followup_max_attempts: number
          followup_wait_hours: number
          horario_atendimento_dias: number[]
          horario_atendimento_fim: string
          horario_atendimento_inicio: string
          id: string
          mercadopago_access_token: string | null
          name: string | null
          reengajamento_dias_inativo: number
          reengajamento_enabled: boolean
          updated_at: string
          user_id: string
          whatsapp_phone: string | null
        }
        Insert: {
          ai_prompt?: string | null
          chatwoot_account_id?: string | null
          chatwoot_inbox_id?: string | null
          created_at?: string
          due_date?: string | null
          followup_max_attempts?: number
          followup_wait_hours?: number
          horario_atendimento_dias?: number[]
          horario_atendimento_fim?: string
          horario_atendimento_inicio?: string
          id?: string
          mercadopago_access_token?: string | null
          name?: string | null
          reengajamento_dias_inativo?: number
          reengajamento_enabled?: boolean
          updated_at?: string
          user_id?: string
          whatsapp_phone?: string | null
        }
        Update: {
          ai_prompt?: string | null
          chatwoot_account_id?: string | null
          chatwoot_inbox_id?: string | null
          created_at?: string
          due_date?: string | null
          followup_max_attempts?: number
          followup_wait_hours?: number
          horario_atendimento_dias?: number[]
          horario_atendimento_fim?: string
          horario_atendimento_inicio?: string
          id?: string
          mercadopago_access_token?: string | null
          name?: string | null
          reengajamento_dias_inativo?: number
          reengajamento_enabled?: boolean
          updated_at?: string
          user_id?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          company_id: string
          contact_phone: string | null
          conversation_id: string | null
          created_at: string
          google_event_id: string | null
          google_event_link: string | null
          id: string
          resource_id: string | null
          scheduled_at: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          google_event_id?: string | null
          google_event_link?: string | null
          id?: string
          resource_id?: string | null
          scheduled_at: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          google_event_id?: string | null
          google_event_link?: string | null
          id?: string
          resource_id?: string | null
          scheduled_at?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agenda_bloqueios: {
        Row: {
          company_id: string
          created_at: string
          data: string
          id: string
          motivo: string | null
          periodo: string
          resource_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          data: string
          id?: string
          motivo?: string | null
          periodo?: string
          resource_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          data?: string
          id?: string
          motivo?: string | null
          periodo?: string
          resource_id?: string | null
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          calendar_id: string
          company_id: string
          created_at: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          calendar_id?: string
          company_id: string
          created_at?: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          company_id?: string
          created_at?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company_id: string
          created_at: string
          first_contact_at: string
          id: string
          name: string | null
          phone: string
        }
        Insert: {
          company_id: string
          created_at?: string
          first_contact_at?: string
          id?: string
          name?: string | null
          phone: string
        }
        Update: {
          company_id?: string
          created_at?: string
          first_contact_at?: string
          id?: string
          name?: string | null
          phone?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          active: boolean
          calendar_id: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          calendar_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          calendar_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      agenda_config: {
        Row: {
          buffer_minutos: number
          resource_id: string
          created_at: string
          dias_semana: number[]
          duracao_minutos: number
          hora_fim: string
          hora_inicio: string
          id: string
          max_por_dia: number | null
          updated_at: string
        }
        Insert: {
          buffer_minutos?: number
          resource_id: string
          created_at?: string
          dias_semana?: number[]
          duracao_minutos?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          max_por_dia?: number | null
          updated_at?: string
        }
        Update: {
          buffer_minutos?: number
          resource_id?: string
          created_at?: string
          dias_semana?: number[]
          duracao_minutos?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          max_por_dia?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      google_calendar_connections: {
        Row: {
          calendar_id: string | null
          company_id: string
          connected_at: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          calendar_id?: string | null
          company_id: string
          connected_at?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string | null
          company_id?: string
          connected_at?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          arquivo_digital_url: string | null
          available: boolean
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          estoque: number | null
          id: string
          name: string
          photo_url: string | null
          price: number | null
          tipo: string
          updated_at: string
          vender_com_pix: boolean
        }
        Insert: {
          arquivo_digital_url?: string | null
          available?: boolean
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          estoque?: number | null
          id?: string
          name: string
          photo_url?: string | null
          price?: number | null
          tipo?: string
          updated_at?: string
          vender_com_pix?: boolean
        }
        Update: {
          arquivo_digital_url?: string | null
          available?: boolean
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          estoque?: number | null
          id?: string
          name?: string
          photo_url?: string | null
          price?: number | null
          tipo?: string
          updated_at?: string
          vender_com_pix?: boolean
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          company_id: string
          contact_phone: string | null
          conversation_id: string | null
          created_at: string
          expira_em: string | null
          id: string
          lembrete_enviado: boolean
          mercadopago_payment_id: string | null
          product_id: string
          status: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          company_id: string
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          expira_em?: string | null
          id?: string
          lembrete_enviado?: boolean
          mercadopago_payment_id?: string | null
          product_id: string
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          company_id?: string
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          expira_em?: string | null
          id?: string
          lembrete_enviado?: boolean
          mercadopago_payment_id?: string | null
          product_id?: string
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      company_documents: {
        Row: {
          company_id: string
          content_type: string
          created_at: string
          file_url: string
          id: string
          title: string
        }
        Insert: {
          company_id: string
          content_type?: string
          created_at?: string
          file_url: string
          id?: string
          title: string
        }
        Update: {
          company_id?: string
          content_type?: string
          created_at?: string
          file_url?: string
          id?: string
          title?: string
        }
        Relationships: []
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
