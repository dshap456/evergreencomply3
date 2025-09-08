import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get all enrollments for this user
    const { data: enrollments, error } = await client
      .from('course_enrollments')
      .select(`
        id,
        course_id,
        current_lesson_id,
        current_lesson_language,
        courses!inner (
          title
        ),
        lessons:current_lesson_id (
          title
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching enrollments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also check lesson_progress for comparison
    const { data: progress } = await client
      .from('lesson_progress')
      .select('lesson_id, last_accessed, language, status')
      .eq('user_id', user.id)
      .order('last_accessed', { ascending: false })
      .limit(5);

    return NextResponse.json({
      user_id: user.id,
      enrollments,
      recent_progress: progress,
      message: 'Check if current_lesson_id is being saved'
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    const { courseId, lessonId } = await request.json();
    
    if (!courseId || !lessonId) {
      return NextResponse.json({ error: 'courseId and lessonId required' }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Update enrollment directly
    const { data, error } = await client
      .from('course_enrollments')
      .update({ 
        current_lesson_id: lessonId,
        current_lesson_language: 'en'
      })
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .select();

    if (error) {
      console.error('Error updating enrollment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: data,
      message: 'Enrollment updated successfully'
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
