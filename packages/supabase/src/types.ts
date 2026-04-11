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
      audit_logs: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          created_at: string | null
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          created_at?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          created_at?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          internal_notes: string | null
          last_inbound_at: string | null
          last_outbound_at: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          internal_notes?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          internal_notes?: string | null
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          points: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          points?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          points?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_slots: {
        Row: {
          blocked: boolean
          blocked_reason: string | null
          created_at: string
          current_orders: number
          date: string
          id: string
          max_orders: number
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          blocked_reason?: string | null
          created_at?: string
          current_orders?: number
          date: string
          id?: string
          max_orders?: number
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          blocked_reason?: string | null
          created_at?: string
          current_orders?: number
          date?: string
          id?: string
          max_orders?: number
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          ai_handled: boolean
          content: string
          created_at: string | null
          customer_id: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          is_read: boolean | null
          media_url: string | null
          message_ref: string | null
          order_id: string | null
          payload: Json | null
          phone: string
          sender_name: string | null
          type: Database["public"]["Enums"]["message_type"]
          updated_at: string | null
          zapi_status: Database["public"]["Enums"]["message_zapi_status"] | null
        }
        Insert: {
          ai_handled?: boolean
          content: string
          created_at?: string | null
          customer_id?: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_ref?: string | null
          order_id?: string | null
          payload?: Json | null
          phone: string
          sender_name?: string | null
          type?: Database["public"]["Enums"]["message_type"]
          updated_at?: string | null
          zapi_status?:
            | Database["public"]["Enums"]["message_zapi_status"]
            | null
        }
        Update: {
          ai_handled?: boolean
          content?: string
          created_at?: string | null
          customer_id?: string | null
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_ref?: string | null
          order_id?: string | null
          payload?: Json | null
          phone?: string
          sender_name?: string | null
          type?: Database["public"]["Enums"]["message_type"]
          updated_at?: string | null
          zapi_status?:
            | Database["public"]["Enums"]["message_zapi_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {\
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_changes: {
        Row: {
          changed_by: string
          created_at: string
          field: string
          id: string
          is_ai_suggestion: boolean | null
          new_value: string | null
          old_value: string | null
          order_id: string
          reason: string | null
          status: Database["public"]["Enums"]["order_change_status"] | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          field: string
          id?: string
          is_ai_suggestion?: boolean | null
          new_value?: string | null
          old_value?: string | null
          order_id: string
          reason?: string | null
          status?: Database["public"]["Enums"]["order_change_status"] | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          field?: string
          id?: string
          is_ai_suggestion?: boolean | null
          new_value?: string | null
          old_value?: string | null
          order_id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["order_change_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "order_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_changes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          customizations: Json | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          customizations?: Json | null
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          customizations?: Json | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          ai_escalated: boolean
          ai_processed: boolean
          assigned_to_id: string | null
          conta_corrente: boolean
          created_at: string | null
          customer_id: string
          delivery_date: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          id: string
          invoice_id: string | null
          notes: string | null
          number: string
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          planner: Json | null
          sent_reminder_24h: boolean | null
          sinal_confirmado: boolean
          sinal_valor: number
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          ai_escalated?: boolean
          ai_processed?: boolean
          assigned_to_id?: string | null
          conta_corrente?: boolean
          created_at?: string | null
          customer_id: string
          delivery_date: string
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          id?: string
          invoice_id?: string | null
          notes?: string | null
          number: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          planner?: Json | null
          sent_reminder_24h?: boolean | null
          sinal_confirmado?: boolean
          sinal_valor?: number
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          ai_escalated?: boolean
          ai_processed?: boolean
          assigned_to_id?: string | null
          conta_corrente?: boolean
          created_at?: string | null
          customer_id?: string
          delivery_date?: string
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          id?: string
          invoice_id?: string | null
          notes?: string | null
          number?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          planner?: Json | null
          sent_reminder_24h?: boolean | null
          sinal_confirmado?: boolean
          sinal_valor?: number
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_entries: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          id: string
          notes: string | null
          order_id: string
          registered_at: string
          registered_by: string
          status: Database["public"]["Enums"]["payment_confirmation_status"]
          type: Database["public"]["Enums"]["payment_type"]
          valor: number
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          registered_at?: string
          registered_by: string
          status?: Database["public"]["Enums"]["payment_confirmation_status"]
          type?: Database["public"]["Enums"]["payment_type"]
          valor: number
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          registered_at?: string
          registered_by?: string
          status?: Database["public"]["Enums"]["payment_confirmation_status"]
          type?: Database["public"]["Enums"]["payment_type"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_entries_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_entries_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          cost_price: number | null
          created_at: string | null
          custom_options: Json | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          prep_time: number
          price: number
          updated_at: string | null
        }
        Insert: {
          category?: string
          cost_price?: number | null
          created_at?: string | null
          custom_options?: Json | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          prep_time?: number
          price: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          cost_price?: number | null
          created_at?: string | null
          custom_options?: Json | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          prep_time?: number
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
      quick_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          shortcut: string | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          shortcut?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          shortcut?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string
          id: string
          order_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          order_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          order_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      slots: {
        Row: {
          blocked: boolean
          created_at: string | null
          current: number
          date: string
          id: string
          max_orders: number
          reason: string | null
        }
        Insert: {
          blocked?: boolean
          created_at?: string | null
          current?: number
          date: string
          id?: string
          max_orders?: number
          reason?: string | null
        }
        Update: {
          blocked?: boolean
          created_at?: string | null
          current?: number
          date?: string
          id?: string
          max_orders?: number
          reason?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      initialize_delivery_slots: { Args: never; Returns: undefined }
    }
    Enums: {
      conversation_status: "NEW" | "IN_PROGRESS" | "WAITING_ORDER" | "RESOLVED"
      delivery_type: "RETIRADA" | "ENTREGA"
      message_direction: "INBOUND" | "OUTBOUND"
      message_type: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT"
      message_zapi_status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED"
      order_change_status: "PENDENTE" | "APROVADO" | "REJEITADO"
      order_status:
        | "PENDENTE"
        | "CONFIRMADO"
        | "PRODUCAO"
        | "PRONTO"
        | "ENTREGUE"
        | "CANCELADO"
      payment_confirmation_status:
        | "AGUARDANDO_CONFIRMACAO"
        | "CONFIRMADO"
        | "REJEITADO"
      payment_status:
        | "SINAL_PENDENTE"
        | "SINAL_PAGO"
        | "QUITADO"
        | "CONTA_CORRENTE"
      payment_type: "SINAL" | "SALDO" | "ANTECIPADO" | "PARCIAL"
      user_role: "ADMIN" | "GERENTE" | "PRODUTOR" | "ATENDENTE" | "BOT"
      user_status: "ATIVO" | "INATIVO" | "CONGELADO"
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
      conversation_status: ["NEW", "IN_PROGRESS", "WAITING_ORDER", "RESOLVED"],
      delivery_type: ["RETIRADA", "ENTREGA"],
      message_direction: ["INBOUND", "OUTBOUND"],
      message_type: ["TEXT", "IMAGE", "AUDIO", "DOCUMENT"],
      message_zapi_status: ["PENDING", "SENT", "DELIVERED", "READ", "FAILED"],
      order_change_status: ["PENDENTE", "APROVADO", "REJEITADO"],
      order_status: [
        "PENDENTE",
        "CONFIRMADO",
        "PRODUCAO",
        "PRONTO",
        "ENTREGUE",
        "CANCELADO",
      ],
      payment_confirmation_status: [
        "AGUARDANDO_CONFIRMACAO",
        "CONFIRMADO",
        "REJEITADO",
      ],
      payment_status: [
        "SINAL_PENDENTE",
        "SINAL_PAGO",
        "QUITADO",
        "CONTA_CORRENTE",
      ],
      payment_type: ["SINAL", "SALDO", "ANTECIPADO", "PARCIAL"],
      user_role: ["ADMIN", "GERENTE", "PRODUTOR", "ATENDENTE", "BOT"],
      user_status: ["ATIVO", "INATIVO", "CONGELADO"],
    },
  },
} as const
