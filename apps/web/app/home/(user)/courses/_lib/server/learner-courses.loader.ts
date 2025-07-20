import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getCurrentUser } from '@kit/supabase/get-current-user';

export interface LearnerCourse {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  language: string;
  level: string;
  status: 'draft' | 'published' | 'archived';
  // Progress tracking
  enrollment_date: string;
  progress_percentage: number;
  last_accessed: string | null;
  completed_at: string | null;
  final_quiz_score: number | null;
  certificate_url: string | null;
  // Course structure
  total_modules: number;
  completed_modules: number;
  total_lessons: number;
  completed_lessons: number;
}

export interface LearnerCoursesData {
  enrolledCourses: LearnerCourse[];
  availableCourses: LearnerCourse[];
  completedCount: number;
  inProgressCount: number;
  totalEnrollments: number;
}

export async function loadLearnerCoursesData(): Promise<LearnerCoursesData> {
  const client = getSupabaseServerClient();
  const user = await getCurrentUser(client);

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get enrolled courses with progress
  const { data: enrolledCoursesData, error: enrolledError } = await client
    .from('course_progress')
    .select(`
      enrollment_date: created_at,
      progress_percentage,
      last_accessed,
      completed_at,
      final_quiz_score,
      certificate_url,
      completed_modules,
      completed_lessons,
      course:courses!inner (
        id,
        title,
        description,
        thumbnail_url,
        duration_minutes,
        language,
        level,
        status
      )
    `)
    .eq('user_id', user.id)
    .eq('courses.status', 'published');

  if (enrolledError) {
    throw enrolledError;
  }

  // Get available courses (published but not enrolled)
  const enrolledCourseIds = enrolledCoursesData?.map(enrollment => enrollment.course.id) || [];
  
  const { data: availableCoursesData, error: availableError } = await client
    .from('courses')
    .select(`
      id,
      title,
      description,
      thumbnail_url,
      duration_minutes,
      language,
      level,
      status
    `)
    .eq('status', 'published')
    .not('id', 'in', `(${enrolledCourseIds.join(',') || 'null'})`);

  if (availableError) {
    throw availableError;
  }

  // Get course statistics (modules and lessons count)
  const allCourseIds = [
    ...enrolledCourseIds,
    ...(availableCoursesData?.map(course => course.id) || [])
  ];

  const { data: courseStats, error: statsError } = await client
    .from('modules')
    .select(`
      course_id,
      lessons!inner (id)
    `)
    .in('course_id', allCourseIds);

  if (statsError) {
    throw statsError;
  }

  // Process course statistics
  const statsMap = new Map<string, { totalModules: number; totalLessons: number }>();
  
  courseStats?.forEach(module => {
    const current = statsMap.get(module.course_id) || { totalModules: 0, totalLessons: 0 };
    current.totalModules += 1;
    current.totalLessons += module.lessons.length;
    statsMap.set(module.course_id, current);
  });

  // Format enrolled courses
  const enrolledCourses: LearnerCourse[] = enrolledCoursesData?.map(enrollment => {
    const stats = statsMap.get(enrollment.course.id) || { totalModules: 0, totalLessons: 0 };
    
    return {
      ...enrollment.course,
      enrollment_date: enrollment.enrollment_date,
      progress_percentage: enrollment.progress_percentage || 0,
      last_accessed: enrollment.last_accessed,
      completed_at: enrollment.completed_at,
      final_quiz_score: enrollment.final_quiz_score,
      certificate_url: enrollment.certificate_url,
      total_modules: stats.totalModules,
      completed_modules: enrollment.completed_modules || 0,
      total_lessons: stats.totalLessons,
      completed_lessons: enrollment.completed_lessons || 0,
    };
  }) || [];

  // Format available courses
  const availableCourses: LearnerCourse[] = availableCoursesData?.map(course => {
    const stats = statsMap.get(course.id) || { totalModules: 0, totalLessons: 0 };
    
    return {
      ...course,
      enrollment_date: '',
      progress_percentage: 0,
      last_accessed: null,
      completed_at: null,
      final_quiz_score: null,
      certificate_url: null,
      total_modules: stats.totalModules,
      completed_modules: 0,
      total_lessons: stats.totalLessons,
      completed_lessons: 0,
    };
  }) || [];

  // Calculate summary statistics
  const completedCount = enrolledCourses.filter(course => course.completed_at).length;
  const inProgressCount = enrolledCourses.filter(course => !course.completed_at && course.progress_percentage > 0).length;
  const totalEnrollments = enrolledCourses.length;

  return {
    enrolledCourses,
    availableCourses,
    completedCount,
    inProgressCount,
    totalEnrollments,
  };
}