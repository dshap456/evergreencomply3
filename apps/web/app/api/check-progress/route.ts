import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get ALL lesson progress for this user
    const { data: progress, error: progressError } = await client
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    // Get ALL enrollments for this user
    const { data: enrollments, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id);

    // Get sample of lessons to see structure
    const { data: lessons, error: lessonsError } = await client
      .from('lessons')
      .select('id, title, course_modules!inner(course_id)')
      .limit(5);

    return NextResponse.json({
      success: true,
      userId: user.id,
      lessonProgress: {
        totalRecords: progress?.length || 0,
        records: progress || [],
        error: progressError?.message,
        columns: progress?.[0] ? Object.keys(progress[0]) : [],
        latestRecord: progress?.[0]
      },
      enrollments: {
        totalRecords: enrollments?.length || 0,
        records: enrollments || [],
        error: enrollmentError?.message,
        courseIds: enrollments?.map(e => e.course_id) || []
      },
      sampleLessons: lessons || [],
      debug: {
        hasLanguageInProgress: progress?.[0]?.hasOwnProperty('language'),
        hasLastAccessedInProgress: progress?.[0]?.hasOwnProperty('last_accessed'),
        progressTableColumns: progress?.[0] ? Object.keys(progress[0]) : 'No progress records found'
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