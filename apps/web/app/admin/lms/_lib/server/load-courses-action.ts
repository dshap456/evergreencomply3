'use server';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Helper function to format courses with lesson and enrollment counts
async function formatCourses(courses: any[], client: any) {
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
      console.warn('⚠️ formatCourses: Lessons table may not exist:', lessonCountsError.message);
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
    console.warn('⚠️ formatCourses: Error loading lesson counts, continuing without them:', error);
  }

  // Get enrollment counts for each course - make this safe too
  let enrollmentCounts: Record<string, number> = {};
  try {
    const { data: enrollmentData, error: enrollmentCountsError } = await client
      .from('course_enrollments')
      .select('course_id');

    if (enrollmentCountsError) {
      console.warn('⚠️ formatCourses: Enrollment table may not exist:', enrollmentCountsError.message);
      // Don't throw error, just use empty counts
    } else if (enrollmentData) {
      // Count enrollments per course
      enrollmentCounts = enrollmentData.reduce((acc, enrollment) => {
        acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  } catch (error) {
    console.warn('⚠️ formatCourses: Error loading enrollment counts, continuing without them:', error);
  }

  // Format the courses data with better type safety and logging
  const formattedCourses = courses?.map(course => {
    // Log each course to debug potential issues
    console.log('🔍 formatCourses: Processing course:', {
      id: course.id,
      title: course.title,
      status: course.status,
      hasDescription: !!course.description,
      descriptionLength: course.description?.length || 0
    });
    
    return {
      id: course.id,
      title: course.title,
      description: course.description || '',
      status: course.status as 'draft' | 'published' | 'archived',
      lessons_count: lessonCounts[course.id] || 0,
      enrollments_count: enrollmentCounts[course.id] || 0,
      created_at: course.created_at,
      updated_at: course.updated_at,
      version: '1.0' // Default version since column doesn't exist yet
    };
  }) || [];

  console.log('✅ formatCourses: Returning formatted courses:', {
    count: formattedCourses.length,
    courses: formattedCourses.map(c => ({ id: c.id, title: c.title, status: c.status }))
  });

  return formattedCourses;
}

export const loadCoursesAction = enhanceAction(
  async function (_, user) {
    console.log('🚀 LoadCoursesAction: Action called');
    console.log('👤 LoadCoursesAction: Called by user:', user?.id);
    
    // Since this is in the admin panel, we know the user is authenticated and a super admin
    // We'll use the regular client which will have the user context, allowing RLS policies
    // that check for super admin status to work properly
    const client = getSupabaseServerClient();
    console.log('✅ LoadCoursesAction: Using authenticated client for super admin access');

    console.log('🔍 LoadCoursesAction: Starting to load courses from database...');

    // First, let's check if user has super admin access
    try {
      const { data: isSuperAdmin, error: adminCheckError } = await client
        .rpc('is_super_admin');
      
      console.log('🔐 LoadCoursesAction: Super admin check result:', isSuperAdmin);
      
      if (adminCheckError) {
        console.warn('⚠️ LoadCoursesAction: Could not check super admin status:', adminCheckError);
      }
    } catch (adminError) {
      console.warn('⚠️ LoadCoursesAction: Super admin check failed:', adminError);
    }

    // Test database connection first
    try {
      const { count, error: countError } = await client
        .from('courses')
        .select('*', { count: 'exact', head: true });
      
      console.log('📊 LoadCoursesAction: Database test - courses count:', count);
      
      if (countError) {
        console.error('❌ LoadCoursesAction: Database connection test failed:', countError);
        console.error('❌ Full error details:', JSON.stringify(countError, null, 2));
        // Don't throw here, continue to the actual query
      }
    } catch (testError) {
      console.error('❌ LoadCoursesAction: Failed to connect to database:', testError);
      // Don't throw here either, let's try the main query
    }

    // Load all courses with basic stats - include account_id for debugging
    // Using authenticated client with super admin context
    console.log('🔍 LoadCoursesAction: Loading courses with authenticated client...');
    
    const { data: courses, error: coursesError } = await client
      .from('courses')
      .select('id, title, description, status, created_at, updated_at, account_id')
      .order('created_at', { ascending: false });

    if (coursesError) {
      console.error('❌ LoadCoursesAction: Error loading courses:', coursesError);
      console.error('❌ Full error details:', JSON.stringify(coursesError, null, 2));
      console.error('❌ Error code:', coursesError.code);
      console.error('❌ Error details:', coursesError.details);
      console.error('❌ Error hint:', coursesError.hint);
      throw new Error(`Failed to load courses: ${coursesError.message} (Code: ${coursesError.code})`);
    }

    console.log('📊 LoadCoursesAction: Raw courses from database:', {
      count: courses?.length || 0,
      courses: courses?.map(c => ({ id: c.id, title: c.title, account_id: c.account_id })) || [],
      rawData: courses // Log the entire raw data for debugging
    });

    // Check if courses is null vs empty array
    if (courses === null) {
      console.warn('⚠️ LoadCoursesAction: Received null from database query');
      return [];
    }

    const formatted = await formatCourses(courses, client);
    console.log('🎯 LoadCoursesAction: Final formatted result:', {
      type: typeof formatted,
      isArray: Array.isArray(formatted),
      length: Array.isArray(formatted) ? formatted.length : 'N/A',
      sample: formatted?.[0] || null
    });
    
    return formatted;
  },
  {
    auth: true,
  }
);