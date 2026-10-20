export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      command_log: {
        Row: {
          action_id: string
          actor_id: string
          created_at: string
          kind: string
          trip_id: string | null
        }
        Insert: {
          action_id: string
          actor_id: string
          created_at?: string
          kind: string
          trip_id?: string | null
        }
        Update: {
          action_id?: string
          actor_id?: string
          created_at?: string
          kind?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "command_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["company_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["company_type"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["company_type"]
        }
        Relationships: []
      }
      handovers: {
        Row: {
          comment: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          handed_at: string
          id: string
          photo_path: string | null
          receiver_name: string
          signature_path: string | null
          trip_id: string
        }
        Insert: {
          comment?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          handed_at?: string
          id?: string
          photo_path?: string | null
          receiver_name: string
          signature_path?: string | null
          trip_id: string
        }
        Update: {
          comment?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          handed_at?: string
          id?: string
          photo_path?: string | null
          receiver_name?: string
          signature_path?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handovers_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handovers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          title: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cargo_name: string
          carrier_company_id: string
          client_company_id: string
          created_at: string
          created_by: string | null
          delivery_address: string
          delivery_city: string
          delivery_contact_name: string | null
          delivery_contact_phone: string | null
          desired_delivery_at: string
          id: string
          load_date: string
          number: string
          pickup_address: string
          pickup_city: string
          pickup_contact_name: string | null
          pickup_contact_phone: string | null
          places: number | null
          places_unit: string | null
          status: Database["public"]["Enums"]["order_status"]
          weight_kg: number
        }
        Insert: {
          cargo_name: string
          carrier_company_id: string
          client_company_id: string
          created_at?: string
          created_by?: string | null
          delivery_address: string
          delivery_city: string
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          desired_delivery_at: string
          id?: string
          load_date: string
          number: string
          pickup_address: string
          pickup_city: string
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          places?: number | null
          places_unit?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          weight_kg: number
        }
        Update: {
          cargo_name?: string
          carrier_company_id?: string
          client_company_id?: string
          created_at?: string
          created_by?: string | null
          delivery_address?: string
          delivery_city?: string
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          desired_delivery_at?: string
          id?: string
          load_date?: string
          number?: string
          pickup_address?: string
          pickup_city?: string
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          places?: number | null
          places_unit?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_carrier_company_id_fkey"
            columns: ["carrier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          company_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_documents: {
        Row: {
          created_at: string
          id: string
          number: string | null
          status: string
          storage_path: string
          title: string
          trip_id: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          number?: string | null
          status?: string
          storage_path: string
          title: string
          trip_id: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          number?: string | null
          status?: string
          storage_path?: string
          title?: string
          trip_id?: string
          type?: Database["public"]["Enums"]["document_type"]
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_events: {
        Row: {
          actor_id: string | null
          client_action_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["trip_status"] | null
          id: string
          payload: Json
          to_status: Database["public"]["Enums"]["trip_status"] | null
          trip_id: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          actor_id?: string | null
          client_action_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["trip_status"] | null
          id?: string
          payload?: Json
          to_status?: Database["public"]["Enums"]["trip_status"] | null
          trip_id: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          actor_id?: string | null
          client_action_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["trip_status"] | null
          id?: string
          payload?: Json
          to_status?: Database["public"]["Enums"]["trip_status"] | null
          trip_id?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "trip_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_photos: {
        Row: {
          id: string
          stage: Database["public"]["Enums"]["photo_stage"]
          storage_path: string
          taken_at: string
          trip_id: string
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          stage: Database["public"]["Enums"]["photo_stage"]
          storage_path: string
          taken_at?: string
          trip_id: string
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          stage?: Database["public"]["Enums"]["photo_stage"]
          storage_path?: string
          taken_at?: string
          trip_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_photos_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_problems: {
        Row: {
          acknowledged_by: string | null
          category: Database["public"]["Enums"]["problem_category"]
          comment: string | null
          created_at: string
          estimated_delay_min: number | null
          id: string
          photo_path: string | null
          reason: string
          reported_by: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["problem_status"]
          trip_id: string
        }
        Insert: {
          acknowledged_by?: string | null
          category: Database["public"]["Enums"]["problem_category"]
          comment?: string | null
          created_at?: string
          estimated_delay_min?: number | null
          id?: string
          photo_path?: string | null
          reason: string
          reported_by?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["problem_status"]
          trip_id: string
        }
        Update: {
          acknowledged_by?: string | null
          category?: Database["public"]["Enums"]["problem_category"]
          comment?: string | null
          created_at?: string
          estimated_delay_min?: number | null
          id?: string
          photo_path?: string | null
          reason?: string
          reported_by?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["problem_status"]
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_problems_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_problems_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_problems_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_planned_delivery_at: string
          delayed: boolean
          depart_date: string
          driver_id: string
          has_problem: boolean
          id: string
          number: string
          order_id: string
          planned_delivery_at: string
          status: Database["public"]["Enums"]["trip_status"]
          vehicle_id: string
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_planned_delivery_at: string
          delayed?: boolean
          depart_date: string
          driver_id: string
          has_problem?: boolean
          id?: string
          number: string
          order_id: string
          planned_delivery_at: string
          status?: Database["public"]["Enums"]["trip_status"]
          vehicle_id: string
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_planned_delivery_at?: string
          delayed?: boolean
          depart_date?: string
          driver_id?: string
          has_problem?: boolean
          id?: string
          number?: string
          order_id?: string
          planned_delivery_at?: string
          status?: Database["public"]["Enums"]["trip_status"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          capacity_kg: number | null
          company_id: string
          id: string
          make_model: string
          plate: string
          status: Database["public"]["Enums"]["vehicle_status"]
        }
        Insert: {
          capacity_kg?: number | null
          company_id: string
          id?: string
          make_model: string
          plate: string
          status?: Database["public"]["Enums"]["vehicle_status"]
        }
        Update: {
          capacity_kg?: number | null
          company_id?: string
          id?: string
          make_model?: string
          plate?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_command: { Args: { command: Json }; Returns: Json }
      my_company: { Args: never; Returns: string }
      my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      company_type: "carrier" | "client"
      document_type:
        | "waybill"
        | "act"
        | "power_of_attorney"
        | "signed_receipt"
        | "other"
      event_type:
        | "status"
        | "photo"
        | "document"
        | "problem"
        | "problem_ack"
        | "note"
        | "eta_changed"
        | "handover"
        | "confirmation"
      order_status: "new" | "in_trip" | "done" | "cancelled"
      photo_stage: "before_load" | "after_load" | "at_delivery" | "problem"
      problem_category: "delay" | "breakdown" | "cargo" | "road" | "other"
      problem_status: "open" | "acknowledged" | "resolved"
      trip_status:
        | "assigned"
        | "accepted"
        | "to_pickup"
        | "at_pickup"
        | "loading"
        | "loaded"
        | "in_transit"
        | "at_delivery"
        | "unloading"
        | "handed_over"
        | "awaiting_confirmation"
        | "delivered"
        | "completed"
        | "cancelled"
      user_role: "dispatcher" | "driver" | "client" | "manager"
      vehicle_status: "free" | "on_trip" | "service"
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
      company_type: ["carrier", "client"],
      document_type: [
        "waybill",
        "act",
        "power_of_attorney",
        "signed_receipt",
        "other",
      ],
      event_type: [
        "status",
        "photo",
        "document",
        "problem",
        "problem_ack",
        "note",
        "eta_changed",
        "handover",
        "confirmation",
      ],
      order_status: ["new", "in_trip", "done", "cancelled"],
      photo_stage: ["before_load", "after_load", "at_delivery", "problem"],
      problem_category: ["delay", "breakdown", "cargo", "road", "other"],
      problem_status: ["open", "acknowledged", "resolved"],
      trip_status: [
        "assigned",
        "accepted",
        "to_pickup",
        "at_pickup",
        "loading",
        "loaded",
        "in_transit",
        "at_delivery",
        "unloading",
        "handed_over",
        "awaiting_confirmation",
        "delivered",
        "completed",
        "cancelled",
      ],
      user_role: ["dispatcher", "driver", "client", "manager"],
      vehicle_status: ["free", "on_trip", "service"],
    },
  },
} as const
