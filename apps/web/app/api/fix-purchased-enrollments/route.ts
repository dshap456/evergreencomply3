import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    console.log('[Fix Enrollments] Processing for user:', user.email);
    
    const results = {
      user: user.email,
      enrollmentsCreated: [] as any[],
      errors: [] as any[],
      timestamp: new Date().toISOString()
    };
    
    // Get all published courses
    const { data: courses, error: coursesError } = await adminClient
      .from('courses')
      .select('*')
      .eq('status', 'published');
      
    if (coursesError) {
      throw coursesError;
    }
    
    // Check existing enrollments
    const { data: existingEnrollments, error: enrollmentsError } = await adminClient
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', user.id);
      
    if (enrollmentsError) {
      throw enrollmentsError;
    }
    
    const enrolledCourseIds = new Set(existingEnrollments?.map(e => e.course_id) || []);
    
    // For each course, check if user has access but no enrollment
    for (const course of courses || []) {
      // Skip if already enrolled
      if (enrolledCourseIds.has(course.id)) {
        console.log(`[Fix Enrollments] User already enrolled in ${course.title}`);
        continue;
      }
      
      // Check if user has access to the course
      const { data: hasAccess, error: accessError } = await adminClient
        .rpc('has_course_access', {
          p_user_id: user.id,
          p_course_id: course.id
        });
      
      if (accessError) {
        results.errors.push({
          course: course.title,
          error: `Failed to check access: ${accessError.message}`
        });
        continue;
      }
      
      if (hasAccess) {
        console.log(`[Fix Enrollments] User has access to ${course.title} but not enrolled - creating enrollment`);
        
        // Create enrollment
        const { data: newEnrollment, error: createError } = await adminClient
          .from('course_enrollments')
          .insert({
            user_id: user.id,
            course_id: course.id,
            enrolled_at: new Date().toISOString(),
            progress_percentage: 0
          })
          .select()
          .single();
        
        if (createError) {
          results.errors.push({
            course: course.title,
            error: `Failed to create enrollment: ${createError.message}`
          });
        } else {
          results.enrollmentsCreated.push({
            courseTitle: course.title,
            courseSlug: course.slug,
            courseId: course.id,
            enrollmentId: newEnrollment.id
          });
        }
      } else {
        console.log(`[Fix Enrollments] User does not have access to ${course.title}`);
      }
    }
    
    // Special handling - if user is support@evergreencomply.com, enroll in all courses
    if (user.email === 'support@evergreencomply.com') {
      console.log('[Fix Enrollments] Support user detected - enrolling in all courses');
      
      for (const course of courses || []) {
        if (!enrolledCourseIds.has(course.id) && results.enrollmentsCreated.every(e => e.courseId !== course.id)) {
          console.log(`[Fix Enrollments] Enrolling support user in ${course.title}`);
          
          const { data: forceEnrollment, error: forceError } = await adminClient
            .from('course_enrollments')
            .insert({
              user_id: user.id,
              course_id: course.id,
              enrolled_at: new Date().toISOString(),
              progress_percentage: 0
            })
            .select()
            .single();
          
          if (!forceError) {
            results.enrollmentsCreated.push({
              courseTitle: course.title,
              courseSlug: course.slug,
              courseId: course.id,
              enrollmentId: forceEnrollment.id,
              forced: true
            });
          } else {
            results.errors.push({
              course: course.title,
              error: `Failed to force enrollment: ${forceError.message}`
            });
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
      message: results.enrollmentsCreated.length > 0 
        ? `Created ${results.enrollmentsCreated.length} enrollments. Please refresh the courses page.`
        : 'No new enrollments needed.'
    });
    
  } catch (error) {
    console.error('[Fix Enrollments] Error:', error);
    return NextResponse.json({
      error: 'Failed to fix enrollments',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}