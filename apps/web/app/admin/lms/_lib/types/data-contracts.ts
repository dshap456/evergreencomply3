/**
 * Data Contracts: Single Source of Truth for LMS Entity Types
 * 
 * This file defines the canonical data formats for all LMS entities,
 * preventing the data format mismatch anti-pattern that has been causing
 * persistence issues throughout the platform.
 */

// ============================================================================
// SHARED ENUMS (Database-aligned)
// ============================================================================

export const CourseStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published', 
  ARCHIVED: 'archived'
} as const;

export const LessonContentType = {
  VIDEO: 'video',
  TEXT: 'text',
  QUIZ: 'quiz',
  ASSET: 'asset' // Note: Missing from some components
} as const;

export const VideoProcessingStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  ERROR: 'error'
} as const;

export const EnrollmentStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress', 
  COMPLETED: 'completed',
  SUSPENDED: 'suspended'
} as const;

export const QuizQuestionType = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  SHORT_ANSWER: 'short_answer'
} as const;

export const LanguageCode = {
  EN: 'en',
  ES: 'es'
} as const;

// ============================================================================
// DATABASE TYPES (Raw from database)
// ============================================================================

export interface DatabaseCourse {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  slug: string | null;
  is_published?: boolean; // ⚠️ LEGACY: Boolean in old schema
  status?: keyof typeof CourseStatus; // NEW: Enum in updated schema
  sku: string | null;
  price: number | null;
  sequential_completion: boolean;
  passing_score: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface DatabaseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  language: keyof typeof LanguageCode;
  created_at: string;
  updated_at: string;
}

export interface DatabaseLesson {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  description: string | null;
  content_type: keyof typeof LessonContentType;
  order_index: number;
  is_final_quiz: boolean;
  video_url: string | null;
  text_content: string | null;
  quiz_data: any; // JSON - needs transformation
  language: keyof typeof LanguageCode;
  created_at: string;
  updated_at: string;
}

export interface DatabaseVideo {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  file_path: string;
  processing_status: string; // ⚠️ Not enum validated in DB
  duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseQuizQuestion {
  id: string;
  lesson_id: string;
  question_text: string;
  question_type: keyof typeof QuizQuestionType;
  options: any; // JSON array - needs transformation
  correct_answer: string;
  explanation: string | null;
  order_index: number;
  language: keyof typeof LanguageCode;
}

export interface DatabaseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress_percentage: number;
  status: keyof typeof EnrollmentStatus;
  completed_modules: number;
  completed_lessons: number;
  completed_at: string | null;
  final_quiz_score: number | null;
  certificate_url: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// UI TYPES (Optimized for components)
// ============================================================================

export interface UICourse {
  id: string;
  account_id: string;
  title: string;
  description: string;
  slug?: string;
  status: keyof typeof CourseStatus; // ⚠️ Enum in UI
  sku?: string;
  price?: number;
  bulk_price?: number;
  sequential_completion: boolean;
  passing_score: number;
  lessons_count: number; // Computed field
  enrollments_count: number; // Computed field  
  completion_rate: number; // Computed field
  version: string; // UI-only field
  created_at: string;
  updated_at: string;
  estimated_duration?: string;
  seo_description?: string;
  category?: string;
  certificate_enabled?: boolean;
  progress_tracking_enabled?: boolean;
  time_limit_days?: number;
}

export interface UILesson {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  description: string;
  content_type: keyof typeof LessonContentType;
  order_index: number;
  is_final_quiz: boolean;
  video_url?: string;
  text_content?: string;
  quiz_questions?: UIQuizQuestion[]; // ⚠️ Transformed from JSON
  created_at: string;
  updated_at: string;
}

export interface UIVideo {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  file_path: string;
  status: keyof typeof VideoProcessingStatus; // ⚠️ Different name from DB
  duration?: number;
  thumbnail_url?: string;
  upload_progress?: number; // UI-only field
  created_at: string;
  updated_at: string;
}

export interface UIQuizQuestion {
  id: string;
  lesson_id: string;
  question_text: string;
  question_type: keyof typeof QuizQuestionType;
  options: UIQuizOption[]; // ⚠️ Structured array vs JSON
  correct_answer: string;
  explanation?: string;
  order_index: number;
}

export interface UIQuizOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface UIEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  course_title: string; // Joined field
  progress_percentage: number;
  status: keyof typeof EnrollmentStatus;
  completed_modules: number;
  completed_lessons: number;
  total_modules: number; // Computed field
  total_lessons: number; // Computed field
  completed_at?: string;
  final_quiz_score?: number;
  certificate_url?: string;
  enrollment_date: string; // Alias for created_at
  last_accessed?: string;
}

// ============================================================================
// VALIDATION SCHEMAS (Runtime type checking)
// ============================================================================

export function isValidCourseStatus(status: string): status is keyof typeof CourseStatus {
  return Object.values(CourseStatus).includes(status as any);
}

export function isValidVideoStatus(status: string): status is keyof typeof VideoProcessingStatus {
  return Object.values(VideoProcessingStatus).includes(status as any);
}

export function isValidEnrollmentStatus(status: string): status is keyof typeof EnrollmentStatus {
  return Object.values(EnrollmentStatus).includes(status as any);
}

// ============================================================================
// TYPE GUARDS (Runtime validation)
// ============================================================================

export function isDatabaseCourse(obj: any): obj is DatabaseCourse {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.is_published === 'boolean' &&
    typeof obj.title === 'string'
  );
}

export function isUICourse(obj: any): obj is UICourse {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    isValidCourseStatus(obj.status) &&
    typeof obj.title === 'string' &&
    typeof obj.lessons_count === 'number'
  );
}

// ============================================================================
// TRANSFORMATION ERROR TYPES
// ============================================================================

export class DataTransformationError extends Error {
  constructor(
    public entity: string,
    public direction: 'toUI' | 'toDatabase',
    public originalError?: Error
  ) {
    super(`Failed to transform ${entity} ${direction}: ${originalError?.message || 'Unknown error'}`);
    this.name = 'DataTransformationError';
  }
}