import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');

    console.log('[API] last-accessed called with:', { courseId });

    if (!courseId) {
      return NextResponse.json({ success: false, error: 'Course ID required' }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      console.log('[API] No user authenticated');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[API] User ID:', user.id);

    // First check if we have a current_lesson_id stored in the enrollment
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('current_lesson_id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (!enrollmentError && enrollment?.current_lesson_id) {
      // If we have a saved current lesson, return it
      console.log('[API] Found current lesson in enrollment:', enrollment.current_lesson_id);
      return NextResponse.json({ 
        success: true, 
        lessonId: enrollment.current_lesson_id,
        source: 'enrollment'
      });
    }

    // Fallback to the original method if no current_lesson_id is set
    // or if the language doesn't match
    
    // Get all lessons for this course
    const { data: courseLessons, error: lessonsError } = await client
      .from('lessons')
      .select(`
        id,
        course_modules!inner (
          course_id
        )
      `)
      .eq('course_modules.course_id', courseId);

    if (lessonsError) {
      console.error('Error fetching course lessons:', lessonsError);
      return NextResponse.json({ success: false, error: 'Failed to fetch course lessons' }, { status: 500 });
    }

    const lessonIds = courseLessons?.map(l => l.id) || [];
    
    console.log('[API] Found lessons for course:', lessonIds.length);
    
    if (lessonIds.length === 0) {
      return NextResponse.json({ success: true, lessonId: null });
    }

    // Now get the most recent progress for these lessons
    const { data: lessonProgress, error } = await client
      .from('lesson_progress')
      .select('lesson_id, updated_at, status')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    console.log('[API] Lesson progress query result:', { lessonProgress, error });

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching last accessed lesson:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch last accessed lesson' }, { status: 500 });
    }

    // If we found a lesson with last_accessed, return it
    if (lessonProgress?.lesson_id) {
      console.log('Found last accessed lesson from progress:', lessonProgress);
      return NextResponse.json({ 
        success: true, 
        lessonId: lessonProgress.lesson_id,
        lastAccessed: lessonProgress.updated_at,
        source: 'progress'
      });
    }

    // No last accessed lesson found
    return NextResponse.json({ success: true, lessonId: null });

  } catch (error) {
    console.error('Error in last-accessed route:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}