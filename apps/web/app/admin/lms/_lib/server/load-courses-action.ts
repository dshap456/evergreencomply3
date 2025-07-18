'use server';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export const loadCoursesAction = enhanceAction(
  async function () {
    const client = getSupabaseServerAdminClient();

    // Load all courses with basic stats
    const { data: courses, error: coursesError } = await client
      .from('courses')
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        updated_at,
        version
      `)
      .order('created_at', { ascending: false });

    if (coursesError) {
      throw new Error(`Failed to load courses: ${coursesError.message}`);
    }

    // Get lesson counts for each course
    const { data: lessonCounts, error: lessonCountsError } = await client
      .from('lessons')
      .select('course_id')
      .then(async ({ data, error }) => {
        if (error) throw error;
        
        // Count lessons per course
        const counts = data?.reduce((acc, lesson) => {
          acc[lesson.course_id] = (acc[lesson.course_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
        
        return { data: counts, error: null };
      });

    if (lessonCountsError) {
      throw new Error(`Failed to load lesson counts: ${lessonCountsError.message}`);
    }

    // Get enrollment counts for each course (placeholder for now)
    const { data: enrollmentCounts } = await client
      .from('course_enrollments')
      .select('course_id')
      .then(async ({ data, error }) => {
        if (error) {
          // Enrollment table might not exist yet, so just return empty counts
          return { data: {}, error: null };
        }
        
        const counts = data?.reduce((acc, enrollment) => {
          acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
        
        return { data: counts, error: null };
      });

    // Format the courses data
    const formattedCourses = courses?.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description || '',
      status: course.status as 'draft' | 'published' | 'archived',
      lessons_count: lessonCounts?.[course.id] || 0,
      enrollments_count: enrollmentCounts?.[course.id] || 0,
      created_at: course.created_at,
      updated_at: course.updated_at,
      version: course.version || '1.0'
    })) || [];

    return formattedCourses;
  },
  {
    auth: true,
  }
);