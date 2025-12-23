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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_commissions: {
        Row: {
          commission_cents: number
          commission_rate: number | null
          created_at: string
          id: string
          order_id: string
          vendor_id: string
        }
        Insert: {
          commission_cents: number
          commission_rate?: number | null
          created_at?: string
          id?: string
          order_id: string
          vendor_id: string
        }
        Update: {
          commission_cents?: number
          commission_rate?: number | null
          created_at?: string
          id?: string
          order_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_commissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: Json | null
          created_at: string
          id: string
          is_read: boolean
          media_url: string | null
          read_at: string | null
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          chat_id: string
          content?: Json | null
          created_at?: string
          id?: string
          is_read?: boolean
          media_url?: string | null
          read_at?: string | null
          sender_id: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          chat_id?: string
          content?: Json | null
          created_at?: string
          id?: string
          is_read?: boolean
          media_url?: string | null
          read_at?: string | null
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          role_in_chat: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          role_in_chat?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          role_in_chat?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          last_updated: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_updated?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_updated?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invite_status"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price_cents?: number
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
          client_id: string
          created_at: string
          driver_id: string | null
          id: string
          location_snapshot: Json | null
          payment_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          status: Database["public"]["Enums"]["order_status"]
          total_cents: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          driver_id?: string | null
          id?: string
          location_snapshot?: Json | null
          payment_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["order_status"]
          total_cents?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          driver_id?: string | null
          id?: string
          location_snapshot?: Json | null
          payment_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["order_status"]
          total_cents?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          price_cents: number
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          price_cents: number
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          price_cents?: number
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          failed_attempts: number
          id: string
          is_blocked: boolean
          is_locked: boolean
          is_online: boolean
          last_login_attempt: string | null
          mercado_pago_configured: boolean
          mercado_pago_connected_at: string | null
          photo_url: string | null
          pin_hash: string | null
          updated_at: string
          username: string | null
          vendor_access_expires_at: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          failed_attempts?: number
          id: string
          is_blocked?: boolean
          is_locked?: boolean
          is_online?: boolean
          last_login_attempt?: string | null
          mercado_pago_configured?: boolean
          mercado_pago_connected_at?: string | null
          photo_url?: string | null
          pin_hash?: string | null
          updated_at?: string
          username?: string | null
          vendor_access_expires_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          failed_attempts?: number
          id?: string
          is_blocked?: boolean
          is_locked?: boolean
          is_online?: boolean
          last_login_attempt?: string | null
          mercado_pago_configured?: boolean
          mercado_pago_connected_at?: string | null
          photo_url?: string | null
          pin_hash?: string | null
          updated_at?: string
          username?: string | null
          vendor_access_expires_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
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
      vendor_clients: {
        Row: {
          access_expires_at: string | null
          client_id: string
          created_at: string
          id: string
          is_blocked: boolean
          updated_at: string
          vendor_id: string
        }
        Insert: {
          access_expires_at?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          updated_at?: string
          vendor_id: string
        }
        Update: {
          access_expires_at?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_clients_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_connections: {
        Row: {
          access_expires_at: string | null
          associate_id: string
          created_at: string
          id: string
          is_blocked: boolean
          status: string
          type: Database["public"]["Enums"]["connection_type"]
          vendor_id: string
        }
        Insert: {
          access_expires_at?: string | null
          associate_id: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          status?: string
          type: Database["public"]["Enums"]["connection_type"]
          vendor_id: string
        }
        Update: {
          access_expires_at?: string | null
          associate_id?: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          status?: string
          type?: Database["public"]["Enums"]["connection_type"]
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_drivers: {
        Row: {
          access_expires_at: string | null
          created_at: string
          driver_id: string
          id: string
          is_blocked: boolean
          updated_at: string
          vendor_id: string
        }
        Insert: {
          access_expires_at?: string | null
          created_at?: string
          driver_id: string
          id?: string
          is_blocked?: boolean
          updated_at?: string
          vendor_id: string
        }
        Update: {
          access_expires_at?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          is_blocked?: boolean
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_drivers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          access_expires_at: string | null
          created_at: string
          display_name: string | null
          id: string
          is_blocked: boolean
          mercado_pago_enabled: boolean
          updated_at: string
        }
        Insert: {
          access_expires_at?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_blocked?: boolean
          mercado_pago_enabled?: boolean
          updated_at?: string
        }
        Update: {
          access_expires_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_blocked?: boolean
          mercado_pago_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      orders_finance_view: {
        Row: {
          order_count: number | null
          total_cents: number | null
          vendor_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "vendor" | "client" | "driver"
      connection_type: "client" | "driver"
      invite_status: "available" | "used" | "expired"
      message_type: "text" | "product" | "location" | "system" | "payment"
      order_status:
        | "pending"
        | "paid"
        | "assigned"
        | "on_route"
        | "delivered"
        | "canceled"
      payment_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "vendor", "client", "driver"],
      connection_type: ["client", "driver"],
      invite_status: ["available", "used", "expired"],
      message_type: ["text", "product", "location", "system", "payment"],
      order_status: [
        "pending",
        "paid",
        "assigned",
        "on_route",
        "delivered",
        "canceled",
      ],
      payment_status: ["pending", "approved", "rejected"],
    },
  },
} as const
