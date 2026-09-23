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
      companies: {
        Row: {
          id: string
          name: string
          document_cnpj: string | null
          asaas_api_key: string | null
          segment: string | null
          app_mode: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          document_cnpj?: string | null
          asaas_api_key?: string | null
          segment?: string | null
          app_mode?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          document_cnpj?: string | null
          asaas_api_key?: string | null
          segment?: string | null
          app_mode?: string | null
          created_at?: string
        }
        Relationships: []
      }
      company_users: {
        Row: {
          id: string
          company_id: string
          user_id: string
          role: string | null
          partner_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          role?: string | null
          partner_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          role?: string | null
          partner_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          }
        ]
      }
      asaas_settings: {
        Row: {
          created_at: string
          default_description: string
          discount_deadline_days: number
          discount_percent: number
          due_day: number
          fine_percent: number
          id: string
          interest_percent: number
          sandbox: boolean
          updated_at: string
                  company_id: string
        }
        Insert: {
          created_at?: string
          default_description?: string
          discount_deadline_days?: number
          discount_percent?: number
          due_day?: number
          fine_percent?: number
          id?: string
          interest_percent?: number
          sandbox?: boolean
          updated_at?: string
                  company_id?: string
        }
        Update: {
          created_at?: string
          default_description?: string
          discount_deadline_days?: number
          discount_percent?: number
          due_day?: number
          fine_percent?: number
          id?: string
          interest_percent?: number
          sandbox?: boolean
          updated_at?: string
                  company_id?: string
        }
        Relationships: []
      }
      asaas_webhook_events: {
        Row: {
          asaas_payment_id: string | null
          created_at: string
          event: string
          id: string
          payload: Json
        }
        Insert: {
          asaas_payment_id?: string | null
          created_at?: string
          event: string
          id?: string
          payload?: Json
        }
        Update: {
          asaas_payment_id?: string | null
          created_at?: string
          event?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      closures: {
        Row: {
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          created_at: string
          id: string
          merchant_id: string
          net_invoice_amount: number
          paid_amount: number | null
          paid_at: string | null
          reference_month: string
          reissued_at: string | null
          savings_amount: number
          status: Database["public"]["Enums"]["closure_status"]
          total_expenses: number
          total_gross_volume: number
          total_op_fee_amount: number
          traditional_cost_estimate: number
                  company_id: string
        }
        Insert: {
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          net_invoice_amount?: number
          paid_amount?: number | null
          paid_at?: string | null
          reference_month: string
          reissued_at?: string | null
          savings_amount?: number
          status?: Database["public"]["Enums"]["closure_status"]
          total_expenses?: number
          total_gross_volume?: number
          total_op_fee_amount?: number
          traditional_cost_estimate?: number
                  company_id?: string
        }
        Update: {
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          net_invoice_amount?: number
          paid_amount?: number | null
          paid_at?: string | null
          reference_month?: string
          reissued_at?: string | null
          savings_amount?: number
          status?: Database["public"]["Enums"]["closure_status"]
          total_expenses?: number
          total_gross_volume?: number
          total_op_fee_amount?: number
          traditional_cost_estimate?: number
                  company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "closures_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses_adjustments: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          merchant_id: string
          reference_month: string
                  company_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          id?: string
          merchant_id: string
          reference_month: string
                  company_id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          merchant_id?: string
          reference_month?: string
                  company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_adjustments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plans: {
        Row: {
          cash_rate: number
          created_at: string
          credit_installment_rate: number
          credit_vista_rate: number
          debit_rate: number
          fixed_rate_percent: number
          id: string
          merchant_id: string
          pix_rate: number
          traditional_fee_avg: number
                  company_id: string
        }
        Insert: {
          cash_rate?: number
          created_at?: string
          credit_installment_rate?: number
          credit_vista_rate?: number
          debit_rate?: number
          fixed_rate_percent?: number
          id?: string
          merchant_id: string
          pix_rate?: number
          traditional_fee_avg?: number
                  company_id?: string
        }
        Update: {
          cash_rate?: number
          created_at?: string
          credit_installment_rate?: number
          credit_vista_rate?: number
          debit_rate?: number
          fixed_rate_percent?: number
          id?: string
          merchant_id?: string
          pix_rate?: number
          traditional_fee_avg?: number
                  company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_plans_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          created_at: string
          document_cnpj: string
          email: string
          id: string
          name: string
          phone_whatsapp: string
          status: Database["public"]["Enums"]["merchant_status"]
                  company_id: string
        }
        Insert: {
          created_at?: string
          document_cnpj?: string
          email?: string
          id?: string
          name: string
          phone_whatsapp?: string
          status?: Database["public"]["Enums"]["merchant_status"]
                  company_id?: string
        }
        Update: {
          created_at?: string
          document_cnpj?: string
          email?: string
          id?: string
          name?: string
          phone_whatsapp?: string
          status?: Database["public"]["Enums"]["merchant_status"]
                  company_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          description: string
          id: string
          is_read: boolean
          title: string
          type: string
                  company_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_read?: boolean
          title: string
          type?: string
                  company_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_read?: boolean
          title?: string
          type?: string
                  company_id?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          id: string
          company_id: string
          name: string
          email: string | null
          asaas_wallet_id: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string
          name: string
          email?: string | null
          asaas_wallet_id: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          email?: string | null
          asaas_wallet_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      pos_terminals: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          model: string
          serial_number: string
          status: Database["public"]["Enums"]["merchant_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          model?: string
          serial_number: string
          status?: Database["public"]["Enums"]["merchant_status"]
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          model?: string
          serial_number?: string
          status?: Database["public"]["Enums"]["merchant_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pos_terminals_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      split_rules: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          partner_id: string | null
          partner_asaas_wallet_id: string
          partner_name: string
          percentage: number
                  company_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          partner_id?: string | null
          partner_asaas_wallet_id?: string
          partner_name: string
          percentage?: number
                  company_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          partner_id?: string | null
          partner_asaas_wallet_id?: string
          partner_name?: string
          percentage?: number
                  company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_rules_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_rules_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          }
        ]
      }
      statements_imports: {
        Row: {
          created_at: string
          file_name: string
          id: string
          merchant_id: string | null
          reference_month: string
          status: Database["public"]["Enums"]["import_status"]
                  company_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          merchant_id?: string | null
          reference_month: string
          status?: Database["public"]["Enums"]["import_status"]
                  company_id?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          merchant_id?: string | null
          reference_month?: string
          status?: Database["public"]["Enums"]["import_status"]
                  company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statements_imports_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          brand: string
          created_at: string
          gross_amount: number
          id: string
          import_id: string | null
          installments: number
          merchant_id: string
          modality: Database["public"]["Enums"]["payment_modality"]
          pos_serial: string
          transaction_date: string
                  company_id: string
        }
        Insert: {
          brand?: string
          created_at?: string
          gross_amount?: number
          id?: string
          import_id?: string | null
          installments?: number
          merchant_id: string
          modality: Database["public"]["Enums"]["payment_modality"]
          pos_serial?: string
          transaction_date?: string
                  company_id?: string
        }
        Update: {
          brand?: string
          created_at?: string
          gross_amount?: number
          id?: string
          import_id?: string | null
          installments?: number
          merchant_id?: string
          modality?: Database["public"]["Enums"]["payment_modality"]
          pos_serial?: string
          transaction_date?: string
                  company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "statements_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff"
      closure_status: "draft" | "closed" | "invoice_generated" | "paid"
      import_status: "processing" | "completed" | "error"
      merchant_status: "active" | "inactive"
      payment_modality:
        | "pix"
        | "debit"
        | "credit_vista"
        | "credit_installment"
        | "cash"
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
      app_role: ["admin", "staff"],
      closure_status: ["draft", "closed", "invoice_generated", "paid"],
      import_status: ["processing", "completed", "error"],
      merchant_status: ["active", "inactive"],
      payment_modality: [
        "pix",
        "debit",
        "credit_vista",
        "credit_installment",
        "cash",
      ],
    },
  },
} as const
