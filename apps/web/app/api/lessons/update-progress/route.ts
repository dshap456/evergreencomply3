import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lessonId, courseId, language = 'en', updateLastAccessed = false } = body;

    if (!lessonId || !courseId) {
      return NextResponse.json({ success: false, error: 'Lesson ID and Course ID required' }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is enrolled in the course
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ success: false, error: 'User not enrolled in this course' }, { status: 403 });
    }

    // Update lesson progress with last_accessed timestamp
    const updateData: any = {
      user_id: user.id,
      lesson_id: lessonId,
      language,
      updated_at: new Date().toISOString()
    };

    // Always update last_accessed when this endpoint is called
    if (updateLastAccessed) {
      updateData.last_accessed = new Date().toISOString();
    }

    const { error: progressError } = await client
      .from('lesson_progress')
      .upsert(updateData, {
        onConflict: 'user_id,lesson_id,language'
      });

    if (progressError) {
      console.error('Error updating lesson progress:', progressError);
      return NextResponse.json({ success: false, error: 'Failed to update progress' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in update-progress route:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}