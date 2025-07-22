import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated', details: userError }, { status: 401 });
    }

    // Test enrollment query with the syntax we're using
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select(`
        id,
        progress_percentage,
        enrolled_at,
        completed_at,
        final_score,
        courses!inner (
          id,
          title,
          description,
          is_published
        )
      `)
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError) {
      return NextResponse.json({ 
        error: 'Enrollment query failed',
        details: enrollmentError,
        query: 'course_enrollments with courses join'
      }, { status: 500 });
    }

    // Test if we can access the courses data
    try {
      const courseData = {
        enrollment_id: enrollment.id,
        progress: enrollment.progress_percentage,
        course_id: enrollment.courses.id,
        course_title: enrollment.courses.title,
        is_published: enrollment.courses.is_published
      };
      
      return NextResponse.json({ 
        success: true,
        data: courseData,
        raw_enrollment: enrollment
      });
    } catch (accessError) {
      return NextResponse.json({ 
        error: 'Error accessing enrollment data',
        details: accessError instanceof Error ? accessError.message : 'Unknown error',
        enrollment_data: enrollment
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}