'use server';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export const loadCoursesAction = enhanceAction(
  async function () {
    const client = getSupabaseServerAdminClient();

    console.log('🔍 LoadCoursesAction: Starting to load courses from database...');

    // Test database connection first
    try {
      const { count, error: countError } = await client
        .from('courses')
        .select('*', { count: 'exact', head: true });
      
      console.log('📊 LoadCoursesAction: Database test - courses count:', count);
      
      if (countError) {
        console.error('❌ LoadCoursesAction: Database connection test failed:', countError);
        throw new Error(`Database connection failed: ${countError.message}`);
      }
    } catch (testError) {
      console.error('❌ LoadCoursesAction: Failed to connect to database:', testError);
      throw testError;
    }

    // Load all courses with basic stats
    const { data: courses, error: coursesError } = await client
      .from('courses')
      .select('id, title, description, is_published, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (coursesError) {
      console.error('❌ LoadCoursesAction: Error loading courses:', coursesError);
      throw new Error(`Failed to load courses: ${coursesError.message}`);
    }

    console.log('📊 LoadCoursesAction: Raw courses from database:', {
      count: courses?.length || 0,
      courses: courses?.map(c => ({ id: c.id, title: c.title })) || []
    });

    // If no courses exist, return empty array gracefully
    if (!courses || courses.length === 0) {
      console.log('ℹ️ LoadCoursesAction: No courses found in database, returning empty array');
      return [];
    }

    // Get lesson counts for each course - make this safe in case table doesn't exist
    let lessonCounts: Record<string, number> = {};
    try {
      const { data: lessonData, error: lessonCountsError } = await client
        .from('lessons')
        .select('module_id, course_modules!inner(course_id)');

      if (lessonCountsError) {
        console.warn('⚠️ LoadCoursesAction: Lessons table may not exist:', lessonCountsError.message);
        // Don't throw error, just use empty counts
      } else if (lessonData) {
        // Count lessons per course
        lessonCounts = lessonData.reduce((acc, lesson) => {
          const courseId = lesson.course_modules.course_id;
          acc[courseId] = (acc[courseId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    } catch (error) {
      console.warn('⚠️ LoadCoursesAction: Error loading lesson counts, continuing without them:', error);
    }

    // Get enrollment counts for each course - make this safe too
    let enrollmentCounts: Record<string, number> = {};
    try {
      const { data: enrollmentData, error: enrollmentCountsError } = await client
        .from('course_enrollments')
        .select('course_id');

      if (enrollmentCountsError) {
        console.warn('⚠️ LoadCoursesAction: Enrollment table may not exist:', enrollmentCountsError.message);
        // Don't throw error, just use empty counts
      } else if (enrollmentData) {
        // Count enrollments per course
        enrollmentCounts = enrollmentData.reduce((acc, enrollment) => {
          acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    } catch (error) {
      console.warn('⚠️ LoadCoursesAction: Error loading enrollment counts, continuing without them:', error);
    }

    // Format the courses data
    const formattedCourses = courses?.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description || '',
      status: (course.is_published ? 'published' : 'draft') as 'draft' | 'published' | 'archived',
      lessons_count: lessonCounts[course.id] || 0,
      enrollments_count: enrollmentCounts[course.id] || 0,
      created_at: course.created_at,
      updated_at: course.updated_at,
      version: '1.0' // Default version since column doesn't exist yet
    })) || [];

    console.log('✅ LoadCoursesAction: Returning formatted courses:', {
      count: formattedCourses.length,
      courses: formattedCourses.map(c => ({ id: c.id, title: c.title, status: c.status }))
    });

    return formattedCourses;
  },
  {
    auth: true,
  }
);