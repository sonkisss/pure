export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null;
          company_code: string | null;
          company_name: string;
          contact_person: string | null;
          contact_phone: string | null;
          created_at: string | null;
          id: number;
          status: number | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          company_code?: string | null;
          company_name: string;
          contact_person?: string | null;
          contact_phone?: string | null;
          created_at?: string | null;
          id?: number;
          status?: number | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          company_code?: string | null;
          company_name?: string;
          contact_person?: string | null;
          contact_phone?: string | null;
          created_at?: string | null;
          id?: number;
          status?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      contract_attachments: {
        Row: {
          attachment_type: string;
          contract_id: number;
          created_at: string | null;
          file_name: string;
          file_size: number;
          file_type: string;
          file_url: string;
          id: number;
          updated_at: string | null;
          uploaded_by: number;
        };
        Insert: {
          attachment_type: string;
          contract_id: number;
          created_at?: string | null;
          file_name: string;
          file_size: number;
          file_type: string;
          file_url: string;
          id?: number;
          updated_at?: string | null;
          uploaded_by: number;
        };
        Update: {
          attachment_type?: string;
          contract_id?: number;
          created_at?: string | null;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          file_url?: string;
          id?: number;
          updated_at?: string | null;
          uploaded_by?: number;
        };
        Relationships: [
          {
            foreignKeyName: "contract_attachments_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "contracts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contract_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      contract_details: {
        Row: {
          contract_id: number;
          created_at: string | null;
          id: number;
          is_credited: boolean | null;
          includes_tax: number | null;
          product_name: string;
          purchase_amount: number | null;
          purchase_price: number | null;
          quantity: number | null;
          remark: string | null;
          sale_amount: number | null;
          sale_price: number | null;
          spec_model: string | null;
          supplier: string | null;
          sync_status: string | null;
          unit: string | null;
          updated_at: string | null;
        };
        Insert: {
          contract_id: number;
          created_at?: string | null;
          id?: number;
          is_credited?: boolean | null;
          includes_tax?: number | null;
          product_name: string;
          purchase_amount?: number | null;
          purchase_price?: number | null;
          quantity?: number | null;
          remark?: string | null;
          sale_amount?: number | null;
          sale_price?: number | null;
          spec_model?: string | null;
          supplier?: string | null;
          sync_status?: string | null;
          unit?: string | null;
          updated_at?: string | null;
        };
        Update: {
          contract_id?: number;
          created_at?: string | null;
          id?: number;
          is_credited?: boolean | null;
          includes_tax?: number | null;
          product_name?: string;
          purchase_amount?: number | null;
          purchase_price?: number | null;
          quantity?: number | null;
          remark?: string | null;
          sale_amount?: number | null;
          sale_price?: number | null;
          spec_model?: string | null;
          supplier?: string | null;
          sync_status?: string | null;
          unit?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contract_details_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "contracts";
            referencedColumns: ["id"];
          }
        ];
      };
      contracts: {
        Row: {
          company_id: number;
          contract_amount: number | null;
          contract_date: string | null;
          contract_name: string;
          contract_year: number;
          created_at: string | null;
          created_by: number | null;
          id: number;
          remark: string | null;
          status: number | null;
          updated_at: string | null;
        };
        Insert: {
          company_id: number;
          contract_amount?: number | null;
          contract_date?: string | null;
          contract_name: string;
          contract_year: number;
          created_at?: string | null;
          created_by?: number | null;
          id?: number;
          remark?: string | null;
          status?: number | null;
          updated_at?: string | null;
        };
        Update: {
          company_id?: number;
          contract_amount?: number | null;
          contract_date?: string | null;
          contract_name?: string;
          contract_year?: number;
          created_at?: string | null;
          created_by?: number | null;
          id?: number;
          remark?: string | null;
          status?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      custom_fees: {
        Row: {
          amount: number;
          created_at: string | null;
          id: number;
          inquiry_id: number;
          label: string;
          updated_at: string | null;
        };
        Insert: {
          amount?: number;
          created_at?: string | null;
          id?: number;
          inquiry_id: number;
          label: string;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          id?: number;
          inquiry_id?: number;
          label?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "custom_fees_inquiry_id_fkey";
            columns: ["inquiry_id"];
            isOneToOne: false;
            referencedRelation: "inquiries";
            referencedColumns: ["id"];
          }
        ];
      };
      customer_credit_records: {
        Row: {
          amount: number;
          created_at: string | null;
          credit_date: string;
          customer_id: number | null;
          id: number;
          invoice_url: string | null;
          remark: string | null;
          status: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          credit_date: string;
          customer_id?: number | null;
          id?: number;
          invoice_url?: string | null;
          remark?: string | null;
          status?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          credit_date?: string;
          customer_id?: number | null;
          id?: number;
          invoice_url?: string | null;
          remark?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_credit_records_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      customer_payments: {
        Row: {
          amount: number;
          created_at: string | null;
          customer_id: number | null;
          id: number;
          payment_time: string;
          payment_type: string | null;
          remark: string | null;
          status: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          customer_id?: number | null;
          id?: number;
          payment_time: string;
          payment_type?: string | null;
          remark?: string | null;
          status?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          customer_id?: number | null;
          id?: number;
          payment_time?: string;
          payment_type?: string | null;
          remark?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_payments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      customers: {
        Row: {
          created_at: string | null;
          id: number;
          name: string;
          total_debt: number | null;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          name: string;
          total_debt?: number | null;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          name?: string;
          total_debt?: number | null;
        };
        Relationships: [];
      };
      expense_categories: {
        Row: {
          color: string | null;
          created_at: string | null;
          description: string | null;
          icon: string | null;
          id: number;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: number;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: number;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          attachments: string[] | null;
          category: string;
          company_id: number | null;
          company_name: string | null;
          contract_id: number | null;
          created_at: string | null;
          description: string | null;
          expense_date: string;
          id: number;
          payer_id: number | null;
          payer_name: string | null;
          title: string;
          updated_at: string | null;
          year: number | null;
        };
        Insert: {
          amount: number;
          attachments?: string[] | null;
          category: string;
          company_id?: number | null;
          company_name?: string | null;
          contract_id?: number | null;
          created_at?: string | null;
          description?: string | null;
          expense_date: string;
          id?: number;
          payer_id?: number | null;
          payer_name?: string | null;
          title: string;
          updated_at?: string | null;
          year?: number | null;
        };
        Update: {
          amount?: number;
          attachments?: string[] | null;
          category?: string;
          company_id?: number | null;
          company_name?: string | null;
          contract_id?: number | null;
          created_at?: string | null;
          description?: string | null;
          expense_date?: string;
          id?: number;
          payer_id?: number | null;
          payer_name?: string | null;
          title?: string;
          updated_at?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "contracts";
            referencedColumns: ["id"];
          }
        ];
      };
      inquiries: {
        Row: {
          company: string | null;
          created_at: string | null;
          date: string;
          id: number;
          name: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string | null;
          date: string;
          id?: number;
          name: string;
        };
        Update: {
          company?: string | null;
          created_at?: string | null;
          date?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      inquiry_items: {
        Row: {
          amount_with_tax: number | null;
          created_at: string | null;
          delivery_time: string | null;
          id: number;
          inquiry_id: number;
          match_status: string | null;
          matched_product_id: number | null;
          product_name: string | null;
          quantity: number | null;
          remark: string | null;
          sale_amount: number | null;
          sale_price: number | null;
          specification: string | null;
          status: string | null;
          supplier: string | null;
          tax_amount: number | null;
          tax_rate: number | null;
          tax_type: string | null;
          total_price: number | null;
          unit: string | null;
          unit_price: number | null;
          updated_at: string | null;
        };
        Insert: {
          amount_with_tax?: number | null;
          created_at?: string | null;
          delivery_time?: string | null;
          id?: number;
          inquiry_id: number;
          match_status?: string | null;
          matched_product_id?: number | null;
          product_name?: string | null;
          quantity?: number | null;
          remark?: string | null;
          sale_amount?: number | null;
          sale_price?: number | null;
          specification?: string | null;
          status?: string | null;
          supplier?: string | null;
          tax_amount?: number | null;
          tax_rate?: number | null;
          tax_type?: string | null;
          total_price?: number | null;
          unit?: string | null;
          unit_price?: number | null;
          updated_at?: string | null;
        };
        Update: {
          amount_with_tax?: number | null;
          created_at?: string | null;
          delivery_time?: string | null;
          id?: number;
          inquiry_id?: number;
          match_status?: string | null;
          matched_product_id?: number | null;
          product_name?: string | null;
          quantity?: number | null;
          remark?: string | null;
          sale_amount?: number | null;
          sale_price?: number | null;
          specification?: string | null;
          status?: string | null;
          supplier?: string | null;
          tax_amount?: number | null;
          tax_rate?: number | null;
          tax_type?: string | null;
          total_price?: number | null;
          unit?: string | null;
          unit_price?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inquiry_items_inquiry_id_fkey";
            columns: ["inquiry_id"];
            isOneToOne: false;
            referencedRelation: "inquiries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inquiry_items_matched_product_id_fkey";
            columns: ["matched_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      products: {
        Row: {
          created_at: string | null;
          id: number;
          name: string;
          purchase_price: number | null;
          remark: string | null;
          specification: string | null;
          supplier: string | null;
          tax_type: string | null;
          unit: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          name: string;
          purchase_price?: number | null;
          remark?: string | null;
          specification?: string | null;
          supplier?: string | null;
          tax_type?: string | null;
          unit?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          name?: string;
          purchase_price?: number | null;
          remark?: string | null;
          specification?: string | null;
          supplier?: string | null;
          tax_type?: string | null;
          unit?: string | null;
        };
        Relationships: [];
      };
      profit_calculations: {
        Row: {
          calculated_tax_fee: number;
          created_at: string | null;
          estimated_profit: number;
          freight_fee: number;
          id: number;
          inquiry_id: number;
          profit_rate: number;
          purchase_total: number;
          sale_total: number;
          taxable_purchase_total: number;
          updated_at: string | null;
        };
        Insert: {
          calculated_tax_fee?: number;
          created_at?: string | null;
          estimated_profit?: number;
          freight_fee?: number;
          id?: number;
          inquiry_id: number;
          profit_rate?: number;
          purchase_total?: number;
          sale_total?: number;
          taxable_purchase_total?: number;
          updated_at?: string | null;
        };
        Update: {
          calculated_tax_fee?: number;
          created_at?: string | null;
          estimated_profit?: number;
          freight_fee?: number;
          id?: number;
          inquiry_id?: number;
          profit_rate?: number;
          purchase_total?: number;
          sale_total?: number;
          taxable_purchase_total?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profit_calculations_inquiry_id_fkey";
            columns: ["inquiry_id"];
            isOneToOne: false;
            referencedRelation: "inquiries";
            referencedColumns: ["id"];
          }
        ];
      };
      supplier_debt_items: {
        Row: {
          amount: number | null;
          created_at: string | null;
          debt_id: number;
          id: number;
          product_name: string;
          quantity: number | null;
          remark: string | null;
          specification: string | null;
          tax_type: string | null;
          unit: string | null;
          unit_price: number | null;
        };
        Insert: {
          amount?: number | null;
          created_at?: string | null;
          debt_id: number;
          id?: never;
          product_name: string;
          quantity?: number | null;
          remark?: string | null;
          specification?: string | null;
          tax_type?: string | null;
          unit?: string | null;
          unit_price?: number | null;
        };
        Update: {
          amount?: number | null;
          created_at?: string | null;
          debt_id?: number;
          id?: never;
          product_name?: string;
          quantity?: number | null;
          remark?: string | null;
          specification?: string | null;
          tax_type?: string | null;
          unit?: string | null;
          unit_price?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_debt_items_debt_id_fkey";
            columns: ["debt_id"];
            isOneToOne: false;
            referencedRelation: "supplier_debts";
            referencedColumns: ["id"];
          }
        ];
      };
      supplier_debts: {
        Row: {
          amount: number;
          created_at: string | null;
          debt_date: string | null;
          description: string;
          excel_item_count: number | null;
          excel_url: string | null;
          has_excel_data: boolean | null;
          id: number;
          image_url: string | null;
          supplier_id: number;
          updated_at: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          debt_date?: string | null;
          description: string;
          excel_item_count?: number | null;
          excel_url?: string | null;
          has_excel_data?: boolean | null;
          id?: never;
          image_url?: string | null;
          supplier_id: number;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          debt_date?: string | null;
          description?: string;
          excel_item_count?: number | null;
          excel_url?: string | null;
          has_excel_data?: boolean | null;
          id?: never;
          image_url?: string | null;
          supplier_id?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_debts_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          }
        ];
      };
      supplier_payments: {
        Row: {
          amount: number;
          created_at: string | null;
          id: number;
          payment_date: string;
          payment_type: string | null;
          remark: string | null;
          status: string | null;
          supplier_id: number | null;
          updated_at: string | null;
          voucher_url: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          id?: number;
          payment_date: string;
          payment_type?: string | null;
          remark?: string | null;
          status?: string | null;
          supplier_id?: number | null;
          updated_at?: string | null;
          voucher_url?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          id?: number;
          payment_date?: string;
          payment_type?: string | null;
          remark?: string | null;
          status?: string | null;
          supplier_id?: number | null;
          updated_at?: string | null;
          voucher_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          }
        ];
      };
      suppliers: {
        Row: {
          created_at: string | null;
          id: number;
          name: string;
          total_payable: number | null;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          name: string;
          total_payable?: number | null;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          name?: string;
          total_payable?: number | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          avatar: string | null;
          created_at: string | null;
          id: number;
          is_active: boolean | null;
          nickname: string | null;
          password_hash: string;
          permissions: string[] | null;
          role: string;
          updated_at: string | null;
          username: string;
        };
        Insert: {
          avatar?: string | null;
          created_at?: string | null;
          id?: number;
          is_active?: boolean | null;
          nickname?: string | null;
          password_hash: string;
          permissions?: string[] | null;
          role?: string;
          updated_at?: string | null;
          username: string;
        };
        Update: {
          avatar?: string | null;
          created_at?: string | null;
          id?: number;
          is_active?: boolean | null;
          nickname?: string | null;
          password_hash?: string;
          permissions?: string[] | null;
          role?: string;
          updated_at?: string | null;
          username?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_user: {
        Args: {
          p_is_active?: boolean;
          p_nickname?: string;
          p_password_hash: string;
          p_permissions?: string[];
          p_role?: string;
          p_username: string;
        };
        Returns: {
          avatar: string | null;
          created_at: string | null;
          id: number;
          is_active: boolean | null;
          nickname: string | null;
          password_hash: string;
          permissions: string[] | null;
          role: string;
          updated_at: string | null;
          username: string;
        };
        SetofOptions: {
          from: "*";
          to: "users";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      delete_user: { Args: { p_user_id: number }; Returns: boolean };
      get_current_user_id: { Args: never; Returns: number };
      get_current_username: { Args: never; Returns: string };
      get_user_permissions: { Args: { p_user_id: number }; Returns: string[] };
      is_current_user_admin: { Args: never; Returns: boolean };
      toggle_user_status: {
        Args: { p_user_id: number };
        Returns: {
          avatar: string | null;
          created_at: string | null;
          id: number;
          is_active: boolean | null;
          nickname: string | null;
          password_hash: string;
          permissions: string[] | null;
          role: string;
          updated_at: string | null;
          username: string;
        };
        SetofOptions: {
          from: "*";
          to: "users";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_user: {
        Args: {
          p_is_active?: boolean;
          p_nickname?: string;
          p_password_hash?: string;
          p_permissions?: string[];
          p_role?: string;
          p_user_id: number;
          p_username?: string;
        };
        Returns: {
          avatar: string | null;
          created_at: string | null;
          id: number;
          is_active: boolean | null;
          nickname: string | null;
          password_hash: string;
          permissions: string[] | null;
          role: string;
          updated_at: string | null;
          username: string;
        };
        SetofOptions: {
          from: "*";
          to: "users";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_user_password: {
        Args: { p_new_password: string; p_user_id: number };
        Returns: {
          avatar: string | null;
          created_at: string | null;
          id: number;
          is_active: boolean | null;
          nickname: string | null;
          password_hash: string;
          permissions: string[] | null;
          role: string;
          updated_at: string | null;
          username: string;
        };
        SetofOptions: {
          from: "*";
          to: "users";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      verify_user_password: {
        Args: { p_password: string; p_username: string };
        Returns: boolean;
      };
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
    : never = never
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
    : never = never
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
    : never = never
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {}
  }
} as const;
