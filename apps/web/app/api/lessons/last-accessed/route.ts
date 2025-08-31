import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');
    const language = searchParams.get('language') || 'en';

    if (!courseId) {
      return NextResponse.json({ success: false, error: 'Course ID required' }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the most recently accessed lesson for this course and language
    const { data: lessonProgress, error } = await client
      .from('lesson_progress')
      .select(`
        lesson_id,
        last_accessed,
        updated_at,
        status,
        lessons!inner (
          id,
          course_modules!inner (
            course_id
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('language', language)
      .eq('lessons.course_modules.course_id', courseId)
      .order('last_accessed', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching last accessed lesson:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch last accessed lesson' }, { status: 500 });
    }

    // If we found a lesson with last_accessed, return it
    if (lessonProgress?.lesson_id) {
      return NextResponse.json({ 
        success: true, 
        lessonId: lessonProgress.lesson_id,
        lastAccessed: lessonProgress.last_accessed || lessonProgress.updated_at
      });
    }

    // No last accessed lesson found
    return NextResponse.json({ success: true, lessonId: null });

  } catch (error) {
    console.error('Error in last-accessed route:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}