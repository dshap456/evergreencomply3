/**
 * Data Transformers: Safe Bidirectional Data Conversion
 * 
 * This module provides safe, validated transformations between database
 * and UI data formats, preventing the data format mismatch anti-pattern
 * that has been causing persistence issues.
 */

import {
  DatabaseCourse, UICourse, CourseStatus,
  DatabaseLesson, UILesson, UIQuizQuestion, UIQuizOption,
  DatabaseVideo, UIVideo, VideoProcessingStatus,
  DatabaseEnrollment, UIEnrollment,
  DatabaseQuizQuestion,
  DataTransformationError,
  isValidCourseStatus, isValidVideoStatus, isValidEnrollmentStatus
} from '../types/data-contracts';

// ============================================================================
// COURSE TRANSFORMERS
// ============================================================================

export const CourseTransformer = {
  /**
   * Transform database course to UI format
   * Handles: status enum mapping + computed fields
   */
  toUI: (dbCourse: DatabaseCourse, stats?: { lessonsCount?: number; enrollmentsCount?: number; completionRate?: number }): UICourse => {
    try {
      // Handle both old (is_published) and new (status) schema
      let uiStatus: CourseStatus;
      
      if (dbCourse.status) {
        // New schema with status field
        uiStatus = dbCourse.status as CourseStatus;
      } else if ('is_published' in dbCourse) {
        // Old schema with is_published boolean
        uiStatus = (dbCourse as any).is_published ? CourseStatus.PUBLISHED : CourseStatus.DRAFT;
      } else {
        // Default to draft if neither field exists
        uiStatus = CourseStatus.DRAFT;
      }

      return {
        id: dbCourse.id,
        account_id: dbCourse.account_id,
        title: dbCourse.title,
        description: dbCourse.description || '',
        slug: dbCourse.slug || undefined,
        status: uiStatus,
        sku: dbCourse.sku || undefined,
        price: dbCourse.price || undefined,
        sequential_completion: dbCourse.sequential_completion,
        passing_score: dbCourse.passing_score,
        lessons_count: stats?.lessonsCount || 0,
        enrollments_count: stats?.enrollmentsCount || 0,
        completion_rate: stats?.completionRate || 0,
        version: '1.0', // Default version
        created_at: dbCourse.created_at,
        updated_at: dbCourse.updated_at,
      };
    } catch (error) {
      throw new DataTransformationError('Course', 'toUI', error as Error);
    }
  },

  /**
   * Transform UI course to database format
   * Handles: status enum mapping
   */
  toDatabase: (uiCourse: Partial<UICourse>, useOldSchema: boolean = false): Partial<DatabaseCourse> => {
    try {
      const result: Partial<DatabaseCourse> = {};
      
      // Only include fields that are actually present in the input
      if (uiCourse.title !== undefined) result.title = uiCourse.title;
      if (uiCourse.description !== undefined) result.description = uiCourse.description || null;
      if (uiCourse.slug !== undefined) result.slug = uiCourse.slug || null;
      if (uiCourse.sku !== undefined) result.sku = uiCourse.sku || null;
      if (uiCourse.price !== undefined) result.price = uiCourse.price || null;
      if (uiCourse.sequential_completion !== undefined) result.sequential_completion = uiCourse.sequential_completion;
      if (uiCourse.passing_score !== undefined) result.passing_score = uiCourse.passing_score;
      
      // Always update the timestamp
      result.updated_at = new Date().toISOString();

      // Handle status mapping based on schema version
      if (uiCourse.status) {
        if (!isValidCourseStatus(uiCourse.status)) {
          throw new Error(`Invalid course status: ${uiCourse.status}`);
        }
        
        if (useOldSchema) {
          // Map to old is_published boolean
          (result as any).is_published = uiCourse.status === CourseStatus.PUBLISHED;
        } else {
          // Use new status field
          result.status = uiCourse.status;
        }
      }

      return result;
    } catch (error) {
      throw new DataTransformationError('Course', 'toDatabase', error as Error);
    }
  }
};

// ============================================================================
// VIDEO TRANSFORMERS
// ============================================================================

export const VideoTransformer = {
  /**
   * Transform database video to UI format
   * Handles: processing_status validation + field renaming
   */
  toUI: (dbVideo: DatabaseVideo): UIVideo => {
    try {
      // Validate and normalize processing status
      let status = dbVideo.processing_status;
      if (!isValidVideoStatus(status)) {
        console.warn(`Invalid video processing status: ${status}, defaulting to pending`);
        status = VideoProcessingStatus.PENDING;
      }

      return {
        id: dbVideo.id,
        lesson_id: dbVideo.lesson_id,
        title: dbVideo.title,
        description: dbVideo.description || '',
        file_path: dbVideo.file_path,
        status: status as keyof typeof VideoProcessingStatus,
        duration: dbVideo.duration || undefined,
        thumbnail_url: dbVideo.thumbnail_url || undefined,
        created_at: dbVideo.created_at,
        updated_at: dbVideo.updated_at,
      };
    } catch (error) {
      throw new DataTransformationError('Video', 'toUI', error as Error);
    }
  },

  /**
   * Transform UI video to database format
   * Handles: status validation + field renaming
   */
  toDatabase: (uiVideo: Partial<UIVideo>): Partial<DatabaseVideo> => {
    try {
      const result: Partial<DatabaseVideo> = {
        title: uiVideo.title,
        description: uiVideo.description || null,
        file_path: uiVideo.file_path,
        duration: uiVideo.duration || null,
        thumbnail_url: uiVideo.thumbnail_url || null,
        updated_at: new Date().toISOString(),
      };

      // Handle status validation
      if (uiVideo.status) {
        if (!isValidVideoStatus(uiVideo.status)) {
          throw new Error(`Invalid video status: ${uiVideo.status}`);
        }
        result.processing_status = uiVideo.status;
      }

      return result;
    } catch (error) {
      throw new DataTransformationError('Video', 'toDatabase', error as Error);
    }
  }
};

// ============================================================================
// QUIZ TRANSFORMERS
// ============================================================================

export const QuizTransformer = {
  /**
   * Transform database quiz questions to UI format
   * Handles: JSON options array → structured UIQuizOption objects
   */
  questionsToUI: (dbQuestions: DatabaseQuizQuestion[]): UIQuizQuestion[] => {
    try {
      return dbQuestions.map(dbQuestion => {
        let options: UIQuizOption[] = [];
        
        // Parse JSON options safely
        try {
          const parsedOptions = Array.isArray(dbQuestion.options) 
            ? dbQuestion.options 
            : JSON.parse(dbQuestion.options || '[]');
          
          options = parsedOptions.map((opt: any, index: number) => ({
            id: opt.id || `${dbQuestion.id}-option-${index}`,
            text: opt.text || opt.option || '',
            is_correct: opt.is_correct || opt.correct || false
          }));
        } catch (parseError) {
          console.warn(`Failed to parse quiz options for question ${dbQuestion.id}:`, parseError);
          options = [];
        }

        return {
          id: dbQuestion.id,
          lesson_id: dbQuestion.lesson_id,
          question_text: dbQuestion.question_text,
          question_type: dbQuestion.question_type,
          options,
          correct_answer: dbQuestion.correct_answer,
          explanation: dbQuestion.explanation || undefined,
          order_index: dbQuestion.order_index,
        };
      });
    } catch (error) {
      throw new DataTransformationError('QuizQuestions', 'toUI', error as Error);
    }
  },

  /**
   * Transform UI quiz questions to database format
   * Handles: structured UIQuizOption objects → JSON options array
   */
  questionsToDatabase: (uiQuestions: UIQuizQuestion[]): Partial<DatabaseQuizQuestion>[] => {
    try {
      return uiQuestions.map(uiQuestion => ({
        lesson_id: uiQuestion.lesson_id,
        question_text: uiQuestion.question_text,
        question_type: uiQuestion.question_type,
        options: JSON.stringify(uiQuestion.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          is_correct: opt.is_correct
        }))),
        correct_answer: uiQuestion.correct_answer,
        explanation: uiQuestion.explanation || null,
        order_index: uiQuestion.order_index,
      }));
    } catch (error) {
      throw new DataTransformationError('QuizQuestions', 'toDatabase', error as Error);
    }
  }
};

// ============================================================================
// ENROLLMENT TRANSFORMERS
// ============================================================================

export const EnrollmentTransformer = {
  /**
   * Transform database enrollment to UI format
   * Handles: field renaming + computed totals
   */
  toUI: (dbEnrollment: DatabaseEnrollment, courseTitle?: string, totals?: { totalModules?: number; totalLessons?: number }): UIEnrollment => {
    try {
      // Validate enrollment status
      if (!isValidEnrollmentStatus(dbEnrollment.status)) {
        console.warn(`Invalid enrollment status: ${dbEnrollment.status}`);
      }

      return {
        id: dbEnrollment.id,
        user_id: dbEnrollment.user_id,
        course_id: dbEnrollment.course_id,
        course_title: courseTitle || 'Unknown Course',
        progress_percentage: dbEnrollment.progress_percentage,
        status: dbEnrollment.status,
        completed_modules: dbEnrollment.completed_modules,
        completed_lessons: dbEnrollment.completed_lessons,
        total_modules: totals?.totalModules || 0,
        total_lessons: totals?.totalLessons || 0,
        completed_at: dbEnrollment.completed_at || undefined,
        final_quiz_score: dbEnrollment.final_quiz_score || undefined,
        certificate_url: dbEnrollment.certificate_url || undefined,
        enrollment_date: dbEnrollment.created_at,
        last_accessed: dbEnrollment.updated_at,
      };
    } catch (error) {
      throw new DataTransformationError('Enrollment', 'toUI', error as Error);
    }
  },

  /**
   * Transform UI enrollment to database format
   * Handles: field validation
   */
  toDatabase: (uiEnrollment: Partial<UIEnrollment>): Partial<DatabaseEnrollment> => {
    try {
      const result: Partial<DatabaseEnrollment> = {
        progress_percentage: uiEnrollment.progress_percentage,
        completed_modules: uiEnrollment.completed_modules,
        completed_lessons: uiEnrollment.completed_lessons,
        completed_at: uiEnrollment.completed_at || null,
        final_quiz_score: uiEnrollment.final_quiz_score || null,
        certificate_url: uiEnrollment.certificate_url || null,
        updated_at: new Date().toISOString(),
      };

      // Handle status validation
      if (uiEnrollment.status) {
        if (!isValidEnrollmentStatus(uiEnrollment.status)) {
          throw new Error(`Invalid enrollment status: ${uiEnrollment.status}`);
        }
        result.status = uiEnrollment.status;
      }

      return result;
    } catch (error) {
      throw new DataTransformationError('Enrollment', 'toDatabase', error as Error);
    }
  }
};

// ============================================================================
// BATCH TRANSFORMERS (For efficiency)
// ============================================================================

export const BatchTransformers = {
  /**
   * Transform multiple courses with stats lookup
   */
  coursesToUI: async (dbCourses: DatabaseCourse[], statsLookup?: Record<string, any>): Promise<UICourse[]> => {
    return dbCourses.map(course => 
      CourseTransformer.toUI(course, statsLookup?.[course.id])
    );
  },

  /**
   * Transform multiple videos
   */
  videosToUI: (dbVideos: DatabaseVideo[]): UIVideo[] => {
    return dbVideos.map(video => VideoTransformer.toUI(video));
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Validate transformation results
 */
export function validateTransformation<T>(
  result: T, 
  validator: (obj: any) => obj is T,
  entityName: string
): T {
  if (!validator(result)) {
    throw new DataTransformationError(entityName, 'toUI', new Error('Validation failed'));
  }
  return result;
}