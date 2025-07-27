import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export interface AvailableCourse {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  language: string;
  level: string;
  total_modules: number;
  total_lessons: number;
}

export async function loadAvailableCourses(): Promise<AvailableCourse[]> {
  try {
    const client = getSupabaseServerClient();
    
    // Get current user from Supabase auth
    const { data: { user }, error: userError } = await client.auth.getUser();

    if (!user || userError) {
      console.error('User auth error:', userError);
      return [];
    }

  // Get enrolled course IDs to exclude
  const { data: enrollments, error: enrollmentError } = await client
    .from('course_enrollments')
    .select('course_id')
    .eq('user_id', user.id);

  if (enrollmentError) {
    throw enrollmentError;
  }

  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];

  // Get available courses (published but not enrolled)
  let availableCoursesQuery = client
    .from('courses')
    .select(`
      id,
      title,
      description,
      price
    `)
    .eq('status', 'published');

  // Only add the NOT IN clause if there are enrolled courses
  if (enrolledCourseIds.length > 0) {
    availableCoursesQuery = availableCoursesQuery.not('id', 'in', `(${enrolledCourseIds.join(',')})`);
  }

  const { data: availableCoursesData, error: availableError } = await availableCoursesQuery;

  if (availableError) {
    throw availableError;
  }

  // Get course statistics (modules and lessons count)
  const courseIds = availableCoursesData?.map(course => course.id) || [];
  
  let courseStats = null;
  if (courseIds.length > 0) {
    const { data: stats, error: statsError } = await client
      .from('course_modules')
      .select(`
        course_id,
        lessons (id)
      `)
      .in('course_id', courseIds);
    
    if (statsError) {
      console.error('Error fetching course stats:', statsError);
      // Don't throw, just continue without stats
    }
    
    courseStats = stats;
  }

  // Process course statistics
  const statsMap = new Map<string, { totalModules: number; totalLessons: number }>();
  
  courseStats?.forEach(module => {
    const current = statsMap.get(module.course_id) || { totalModules: 0, totalLessons: 0 };
    current.totalModules += 1;
    current.totalLessons += module.lessons.length;
    statsMap.set(module.course_id, current);
  });

  // Format available courses
  const availableCourses: AvailableCourse[] = availableCoursesData?.map(course => {
    const stats = statsMap.get(course.id) || { totalModules: 0, totalLessons: 0 };
    
    return {
      id: course.id,
      title: course.title,
      description: course.description || '',
      price: Number(course.price) || 0,
      thumbnail_url: null,
      duration_minutes: null,
      language: 'en',
      level: 'beginner',
      total_modules: stats.totalModules,
      total_lessons: stats.totalLessons,
    };
  }) || [];

  return availableCourses;
  } catch (error) {
    console.error('Error in loadAvailableCourses:', error);
    return [];
  }
}