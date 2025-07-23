import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const client = getSupabaseServerClient();
    const body = await request.json();

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update or create lesson progress
    const { data: progress, error: progressError } = await client
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        status: 'completed',
        completed_at: new Date().toISOString(),
        time_spent: body.time_spent || 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id'
      })
      .select()
      .single();

    if (progressError) {
      console.error('Error updating lesson progress:', progressError);
      return NextResponse.json({ error: progressError.message }, { status: 500 });
    }

    // Update course enrollment progress
    const { error: enrollmentError } = await client.rpc('update_course_progress', {
      p_user_id: user.id,
      p_lesson_id: lessonId
    });

    if (enrollmentError) {
      console.error('Error updating course progress:', enrollmentError);
      // Don't fail the request if this fails, as the lesson is still marked complete
    }

    // Get updated course progress to return fresh data
    const { data: courseProgress, error: courseProgressError } = await client
      .from('course_enrollments')
      .select('progress_percentage, completed_at')
      .eq('user_id', user.id)
      .eq('course_id', (
        await client
          .from('lessons')
          .select('course_modules!inner(course_id)')
          .eq('id', lessonId)
          .single()
      ).data?.course_modules?.course_id)
      .single();

    return NextResponse.json({ 
      success: true, 
      progress,
      courseProgress: courseProgress || null,
      message: 'Lesson completed successfully'
    });

  } catch (error) {
    console.error('Error in lesson completion API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}