/**
 * Manual database types for courses table
 * Use this until you can regenerate the actual types
 */

export type Database = {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string
          account_id: string
          title: string
          description: string | null
          status: 'draft' | 'published' | 'archived'
          sku: string | null
          price: number | null
          sequential_completion: boolean
          passing_score: number
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          account_id: string
          title: string
          description?: string | null
          status?: 'draft' | 'published' | 'archived'
          sku?: string | null
          price?: number | null
          sequential_completion?: boolean
          passing_score?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          title?: string
          description?: string | null
          status?: 'draft' | 'published' | 'archived'
          sku?: string | null
          price?: number | null
          sequential_completion?: boolean
          passing_score?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
    }
    Enums: {
      course_status: 'draft' | 'published' | 'archived'
    }
  }
}