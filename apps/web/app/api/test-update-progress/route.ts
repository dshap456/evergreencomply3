import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    const { lessonId } = await request.json();

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📊 Testing update_course_progress RPC function');
    console.log('User ID:', user.id);
    console.log('Lesson ID:', lessonId);

    // Get current progress before update
    const { data: beforeEnrollment } = await client
      .from('course_enrollments')
      .select('progress_percentage')
      .eq('user_id', user.id)
      .single();

    console.log('Progress BEFORE:', beforeEnrollment?.progress_percentage);

    // Call the RPC function
    const { data, error } = await client.rpc('update_course_progress', {
      p_user_id: user.id,
      p_lesson_id: lessonId
    });

    if (error) {
      console.error('❌ RPC Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ RPC Success:', data);

    // Get progress after update
    const { data: afterEnrollment } = await client
      .from('course_enrollments')
      .select('progress_percentage')
      .eq('user_id', user.id)
      .single();

    console.log('Progress AFTER:', afterEnrollment?.progress_percentage);

    return NextResponse.json({
      success: true,
      before: beforeEnrollment?.progress_percentage,
      after: afterEnrollment?.progress_percentage,
      changed: beforeEnrollment?.progress_percentage !== afterEnrollment?.progress_percentage
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with { lessonId: "uuid" } to test progress update'
  });
}