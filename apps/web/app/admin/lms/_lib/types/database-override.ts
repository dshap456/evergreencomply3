/**
 * Temporary type override until database types can be regenerated
 * This ensures TypeScript knows about the status field
 */

export interface DatabaseCourseOverride {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  sku: string | null;
  price: number | null;
  sequential_completion: boolean;
  passing_score: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// Cast helper to override types from Supabase
export function castToCourse(course: any): DatabaseCourseOverride {
  return course as DatabaseCourseOverride;
}