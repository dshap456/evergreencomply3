import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

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
  
  // Get current user from Supabase auth
  const { data: { user }, error: userError } = await client.auth.getUser();

  if (!user || userError) {
    throw new Error('User not authenticated');
  }

  // Get enrolled courses with progress
  const { data: enrolledCoursesData, error: enrolledError } = await client
    .from('course_enrollments')
    .select(`
      enrollment_date: enrolled_at,
      progress_percentage,
      completed_at,
      final_score,
      course:courses!inner (
        id,
        title,
        description,
        is_published
      )
    `)
    .eq('user_id', user.id)
    .eq('courses.is_published', true);

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
      is_published
    `)
    .eq('is_published', true)
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
    .from('course_modules')
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
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description || '',
      thumbnail_url: null,
      duration_minutes: null,
      language: 'en',
      level: 'beginner',
      status: 'published' as const,
      enrollment_date: enrollment.enrollment_date,
      progress_percentage: enrollment.progress_percentage || 0,
      last_accessed: null,
      completed_at: enrollment.completed_at,
      final_quiz_score: enrollment.final_score,
      certificate_url: null,
      total_modules: stats.totalModules,
      completed_modules: 0, // TODO: Calculate from lesson progress
      total_lessons: stats.totalLessons,
      completed_lessons: 0, // TODO: Calculate from lesson progress
    };
  }) || [];

  // Format available courses
  const availableCourses: LearnerCourse[] = availableCoursesData?.map(course => {
    const stats = statsMap.get(course.id) || { totalModules: 0, totalLessons: 0 };
    
    return {
      id: course.id,
      title: course.title,
      description: course.description || '',
      thumbnail_url: null,
      duration_minutes: null,
      language: 'en',
      level: 'beginner',
      status: 'published' as const,
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