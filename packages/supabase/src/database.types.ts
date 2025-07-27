export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string
          account_id: string
          title: string
          description: string | null
          sku: string | null
          price: number | null
          sequential_completion: boolean | null
          passing_score: number | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
          is_published: boolean
        }
        Insert: {
          id?: string
          account_id: string
          title: string
          description?: string | null
          sku?: string | null
          price?: number | null
          sequential_completion?: boolean | null
          passing_score?: number | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          is_published?: boolean
        }
        Update: {
          id?: string
          account_id?: string
          title?: string
          description?: string | null
          sku?: string | null
          price?: number | null
          sequential_completion?: boolean | null
          passing_score?: number | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          is_published?: boolean
        }
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      course_status: 'draft' | 'published' | 'archived'
      content_type: 'video' | 'text' | 'quiz' | 'asset'
      lesson_status: 'not_started' | 'in_progress' | 'completed'
      language_code: 'en' | 'es'
      license_status: 'available' | 'assigned' | 'completed' | 'expired'
      purchase_type: 'individual' | 'bulk'
      app_permissions: 'roles.manage' | 'billing.manage' | 'settings.manage' | 'members.manage' | 'invites.manage'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]