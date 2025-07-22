import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated', details: userError }, { status: 401 });
    }

    // Test enrollment query with the syntax we're using
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select(`
        id,
        progress_percentage,
        enrolled_at,
        completed_at,
        final_score,
        courses!inner (
          id,
          title,
          description,
          is_published
        )
      `)
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError) {
      return NextResponse.json({ 
        error: 'Enrollment query failed',
        details: enrollmentError,
        query: 'course_enrollments with courses join'
      }, { status: 500 });
    }

    // Test modules query
    const { data: modules, error: modulesError } = await client
      .from('course_modules')
      .select(`
        id,
        title,
        description,
        order_index
      `)
      .eq('course_id', courseId)
      .order('order_index');

    if (modulesError) {
      return NextResponse.json({ 
        error: 'Modules query failed',
        details: modulesError,
        query: 'course_modules'
      }, { status: 500 });
    }

    // Test lessons query if we have modules
    let lessons = null;
    let lessonsError = null;
    
    if (modules && modules.length > 0) {
      const { data: lessonsData, error: lessonsErr } = await client
        .from('lessons')
        .select(`
          id,
          module_id,
          title,
          description,
          content_type,
          order_index,
          video_url,
          content,
          asset_url,
          is_final_quiz
        `)
        .in('module_id', modules.map(m => m.id))
        .order('order_index');

      lessons = lessonsData;
      lessonsError = lessonsErr;
    }

    if (lessonsError) {
      return NextResponse.json({ 
        error: 'Lessons query failed',
        details: lessonsError,
        query: 'lessons',
        modules_count: modules?.length || 0,
        module_ids: modules?.map(m => m.id) || []
      }, { status: 500 });
    }

    // Test lesson progress query
    const { data: lessonProgress, error: progressError } = await client
      .from('lesson_progress')
      .select('lesson_id, status, time_spent')
      .eq('user_id', user.id);

    if (progressError) {
      return NextResponse.json({ 
        error: 'Lesson progress query failed',
        details: progressError,
        query: 'lesson_progress'
      }, { status: 500 });
    }

    // All queries successful
    const result = {
      enrollment_id: enrollment.id,
      progress: enrollment.progress_percentage,
      course_id: enrollment.courses.id,
      course_title: enrollment.courses.title,
      is_published: enrollment.courses.is_published,
      modules_count: modules?.length || 0,
      lessons_count: lessons?.length || 0,
      progress_records: lessonProgress?.length || 0
    };
    
    return NextResponse.json({ 
      success: true,
      data: result,
      details: {
        enrollment,
        modules,
        lessons: lessons?.slice(0, 3), // First 3 lessons only
        progress: lessonProgress?.slice(0, 5) // First 5 progress records
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}