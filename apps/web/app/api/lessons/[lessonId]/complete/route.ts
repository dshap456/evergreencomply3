import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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

    // Debug: Check progress before update
    const { data: beforeProgress } = await client
      .from('course_enrollments')
      .select('progress_percentage')
      .eq('user_id', user.id)
      .eq('course_id', (
        await client
          .from('lessons')
          .select('course_modules!inner(course_id)')
          .eq('id', lessonId)
          .single()
      ).data?.course_modules?.course_id)
      .single();

    console.log('🔍 Debug - Progress BEFORE update:', {
      lessonId,
      userId: user.id,
      beforeProgress: beforeProgress?.progress_percentage
    });

    // Update course enrollment progress
    const { error: enrollmentError } = await client.rpc('update_course_progress', {
      p_user_id: user.id,
      p_lesson_id: lessonId
    });

    if (enrollmentError) {
      console.error('❌ Error updating course progress:', enrollmentError);
      // Don't fail the request if this fails, as the lesson is still marked complete
    } else {
      console.log('✅ Course progress update RPC called successfully');
    }

    // Get updated course progress to return fresh data
    const lessonData = await client
      .from('lessons')
      .select('course_modules!inner(course_id)')
      .eq('id', lessonId)
      .single();

    const courseId = lessonData.data?.course_modules?.course_id;

    const { data: courseProgress, error: courseProgressError } = await client
      .from('course_enrollments')
      .select('progress_percentage, completed_at')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    console.log('🔍 Debug - Progress AFTER update:', {
      lessonId,
      userId: user.id,
      courseId,
      afterProgress: courseProgress?.progress_percentage,
      completed_at: courseProgress?.completed_at,
      changed: beforeProgress?.progress_percentage !== courseProgress?.progress_percentage
    });

    // Revalidate relevant pages to show updated progress
    if (courseId) {
      console.log('🔄 Revalidating paths:', [`/home/courses/${courseId}`, '/home/courses']);
      revalidatePath(`/home/courses/${courseId}`);
      revalidatePath('/home/courses');
    }

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