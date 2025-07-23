import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
  try {
    const { courseId, progressPercentage } = await request.json();
    
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated', details: userError }, { status: 401 });
    }

    // Update course enrollment progress
    const { data: updateResult, error: updateError } = await client
      .from('course_enrollments')
      .update({ 
        progress_percentage: progressPercentage || 50,
        // Reset completed_at to null if progress is less than 100
        ...(progressPercentage < 100 && { completed_at: null })
      })
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .select();

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update enrollment',
        details: updateError
      }, { status: 500 });
    }

    // Fetch the updated enrollment to verify
    const { data: enrollment, error: fetchError } = await client
      .from('course_enrollments')
      .select(`
        id,
        progress_percentage,
        completed_at,
        course:courses!inner (
          id,
          title
        )
      `)
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch updated enrollment',
        details: fetchError
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Enrollment updated successfully',
      enrollment: {
        courseId: enrollment.course.id,
        title: enrollment.course.title,
        progress_percentage: enrollment.progress_percentage,
        completed_at: enrollment.completed_at,
        hasStarted: enrollment.progress_percentage > 0,
        isCompleted: !!enrollment.completed_at
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

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

    // Get current enrollment status
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select(`
        id,
        progress_percentage,
        completed_at,
        enrolled_at,
        course:courses!inner (
          id,
          title
        )
      `)
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError) {
      return NextResponse.json({ 
        error: 'Failed to fetch enrollment',
        details: enrollmentError
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      enrollment: {
        courseId: enrollment.course.id,
        title: enrollment.course.title,
        progress_percentage: enrollment.progress_percentage,
        completed_at: enrollment.completed_at,
        enrolled_at: enrollment.enrolled_at,
        hasStarted: enrollment.progress_percentage > 0,
        isCompleted: !!enrollment.completed_at,
        buttonText: !!enrollment.completed_at ? 'review' : 
                   enrollment.progress_percentage > 0 ? 'continue' : 'start'
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}