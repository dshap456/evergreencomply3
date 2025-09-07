import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');
    
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check lesson_progress table structure and data
    const { data: progress, error: progressError } = await client
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Check course enrollment
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id);

    // Try the exact query from last-accessed endpoint
    let lastAccessedQuery = null;
    let lastAccessedError = null;
    
    if (courseId) {
      // Get lessons for course
      const { data: courseLessons } = await client
        .from('lessons')
        .select(`
          id,
          course_modules!inner (
            course_id
          )
        `)
        .eq('course_modules.course_id', courseId);

      const lessonIds = courseLessons?.map(l => l.id) || [];
      
      if (lessonIds.length > 0) {
        // Try the exact query that's failing
        const { data, error } = await client
          .from('lesson_progress')
          .select('lesson_id, updated_at, status')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
          
        lastAccessedQuery = data;
        lastAccessedError = error;
      }
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      courseId,
      lessonProgress: {
        data: progress,
        error: progressError?.message,
        count: progress?.length || 0,
        columns: progress?.[0] ? Object.keys(progress[0]) : []
      },
      enrollments: {
        data: enrollment,
        error: enrollmentError?.message
      },
      lastAccessedQuery: {
        data: lastAccessedQuery,
        error: lastAccessedError?.message || lastAccessedError?.code
      },
      debug: {
        hasLanguageColumn: progress?.[0]?.hasOwnProperty('language'),
        hasLastAccessedColumn: progress?.[0]?.hasOwnProperty('last_accessed'),
        latestProgress: progress?.[0]
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}