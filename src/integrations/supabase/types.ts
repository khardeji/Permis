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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      enrollment_requests: {
        Row: {
          city: string | null
          created_at: string
          decided_at: string | null
          email: string | null
          full_name: string
          id: string
          instructor_id: string
          message: string | null
          phone: string | null
          status: string
          student_user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          decided_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          instructor_id: string
          message?: string | null
          phone?: string | null
          status?: string
          student_user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          decided_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          instructor_id?: string
          message?: string | null
          phone?: string | null
          status?: string
          student_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_requests_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      galleries: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          instructor_id: string
          position: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          instructor_id: string
          position?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          instructor_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "galleries_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_students: {
        Row: {
          created_at: string
          id: string
          instructor_id: string
          student_id: string
          student_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructor_id: string
          student_id: string
          student_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instructor_id?: string
          student_id?: string
          student_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_students_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          accepting_students: boolean
          address: string | null
          availability: Json
          avatar_url: string | null
          bio: string | null
          city: string
          cover_url: string | null
          created_at: string
          driving_school_address: string | null
          driving_school_name: string | null
          email: string | null
          experience_years: number | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          price_per_hour: number | null
          rating: number
          services: string[]
          short_bio: string | null
          slug: string
          status: string
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          accepting_students?: boolean
          address?: string | null
          availability?: Json
          avatar_url?: string | null
          bio?: string | null
          city?: string
          cover_url?: string | null
          created_at?: string
          driving_school_address?: string | null
          driving_school_name?: string | null
          email?: string | null
          experience_years?: number | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          price_per_hour?: number | null
          rating?: number
          services?: string[]
          short_bio?: string | null
          slug: string
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          accepting_students?: boolean
          address?: string | null
          availability?: Json
          avatar_url?: string | null
          bio?: string | null
          city?: string
          cover_url?: string | null
          created_at?: string
          driving_school_address?: string | null
          driving_school_name?: string | null
          email?: string | null
          experience_years?: number | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          price_per_hour?: number | null
          rating?: number
          services?: string[]
          short_bio?: string | null
          slug?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          instructor_id: string
          location: string | null
          notes: string | null
          starts_at: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          instructor_id: string
          location?: string | null
          notes?: string | null
          starts_at: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          instructor_id?: string
          location?: string | null
          notes?: string | null
          starts_at?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          instructor_id: string
          method: string
          note: string | null
          paid_at: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          instructor_id: string
          method?: string
          note?: string | null
          paid_at?: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          instructor_id?: string
          method?: string
          note?: string | null
          paid_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          instructor_id: string | null
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          instructor_id?: string | null
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          instructor_id?: string | null
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          agreed_price: number
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          hours_package: number
          id: string
          instructor_id: string
          license_type: string
          notes: string | null
          phone: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          agreed_price?: number
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hours_package?: number
          id?: string
          instructor_id: string
          license_type?: string
          notes?: string | null
          phone?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          agreed_price?: number
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hours_package?: number
          id?: string
          instructor_id?: string
          license_type?: string
          notes?: string | null
          phone?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      decide_enrollment: {
        Args: {
          _accept: boolean
          _agreed_price?: number
          _hours?: number
          _request_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_my_instructor: { Args: { _instructor_id: string }; Returns: boolean }
      my_instructor_id: { Args: never; Returns: string }
      my_student_ids: { Args: never; Returns: string[] }
      owns_student: { Args: { _student_id: string }; Returns: boolean }
      seed_my_demo_data: { Args: never; Returns: undefined }
      slugify: { Args: { _txt: string }; Returns: string }
      unique_instructor_slug: { Args: { _base: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "instructor" | "student"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "instructor", "student"],
    },
  },
} as const
