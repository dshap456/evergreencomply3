import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');
    const language = searchParams.get('language') || 'en';

    console.log('[LAST-ACCESSED API] ============ START ============');
    console.log('[LAST-ACCESSED API] Request:', { courseId, language });

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
      .select('current_lesson_id, current_lesson_language')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    console.log('[LAST-ACCESSED API] Enrollment lookup:', { 
      found: !enrollmentError && !!enrollment,
      current_lesson_id: enrollment?.current_lesson_id,
      current_lesson_language: enrollment?.current_lesson_language,
      requested_language: language,
      error: enrollmentError?.message,
      willReturn: !enrollmentError && enrollment?.current_lesson_id && enrollment.current_lesson_language === language
    });

    // If we have a saved lesson ID and it's the same language, return it directly
    if (!enrollmentError && enrollment?.current_lesson_id && enrollment.current_lesson_language === language) {
      console.log('[API] Found matching language lesson in enrollment:', enrollment.current_lesson_id);
      return NextResponse.json({ 
        success: true, 
        lessonId: enrollment.current_lesson_id,
        source: 'enrollment_exact',
        language: enrollment.current_lesson_language
      });
    }
    
    // If we have a saved lesson but different language, find the equivalent lesson by position
    if (!enrollmentError && enrollment?.current_lesson_id && enrollment.current_lesson_language !== language) {
      console.log('[API] Found lesson but different language, finding equivalent by position...');
      
      // Get the saved lesson's position in its language
      const { data: savedLesson } = await client
        .from('lessons')
        .select(`
          order_index,
          course_modules!inner (
            order_index,
            course_id
          )
        `)
        .eq('id', enrollment.current_lesson_id)
        .single();
      
      if (savedLesson) {
        // Find the equivalent lesson in the requested language at the same position
        const { data: equivalentLessons } = await client
          .from('lessons')
          .select(`
            id,
            order_index,
            course_modules!inner (
              order_index,
              course_id,
              language
            )
          `)
          .eq('course_modules.course_id', courseId)
          .eq('course_modules.language', language)
          .eq('course_modules.order_index', savedLesson.course_modules.order_index)
          .eq('order_index', savedLesson.order_index);
        
        if (equivalentLessons && equivalentLessons.length > 0) {
          const equivalentLesson = equivalentLessons[0];
          console.log('[API] Found equivalent lesson by position:', equivalentLesson.id);
          
          // Update the enrollment with the new language lesson
          await client
            .from('course_enrollments')
            .update({ 
              current_lesson_id: equivalentLesson.id,
              current_lesson_language: language
            })
            .eq('id', enrollment.id);
          
          return NextResponse.json({ 
            success: true, 
            lessonId: equivalentLesson.id,
            source: 'enrollment_equivalent',
            language: language
          });
        }
      }
    }

    // Fallback to the original method if no current_lesson_id is set
    // or if the language doesn't match
    
    // Get all lessons for this course IN THE SPECIFIC LANGUAGE
    const { data: courseLessons, error: lessonsError } = await client
      .from('lessons')
      .select(`
        id,
        course_modules!inner (
          course_id,
          language
        )
      `)
      .eq('course_modules.course_id', courseId)
      .eq('course_modules.language', language)
      .eq('language', language);  // Filter lessons by language too

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
    // Don't filter by language since lesson IDs are unique
    const { data: lessonProgress, error } = await client
      .from('lesson_progress')
      .select('lesson_id, last_accessed, updated_at, status')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds)
      .order('last_accessed', { ascending: false, nullsFirst: false })
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
        lastAccessed: lessonProgress.last_accessed || lessonProgress.updated_at,
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