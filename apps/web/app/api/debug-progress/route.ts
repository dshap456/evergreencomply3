import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const courseId = searchParams.get('courseId');
  const language = searchParams.get('language') || 'en';
  
  const client = getSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' });
  }

  // Debug: Log what courseId we're actually getting
  console.log('DEBUG ENDPOINT:', {
    courseId,
    language,
    userId: user.id,
    url: request.url
  });

  // 1. Check enrollment
  const { data: enrollment } = await client
    .from('course_enrollments')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single();

  // 2. Get all lesson progress for this user and course
  const { data: allProgress } = await client
    .from('lesson_progress')
    .select(`
      *,
      lessons!inner (
        id,
        title,
        course_modules!inner (
          course_id,
          language,
          title
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('lessons.course_modules.course_id', courseId)
    .order('updated_at', { ascending: false });

  // 3. Get lessons for this course and language
  const { data: courseLessons } = await client
    .from('lessons')
    .select(`
      id,
      title,
      course_modules!inner (
        id,
        course_id,
        language,
        title
      )
    `)
    .eq('course_modules.course_id', courseId)
    .eq('course_modules.language', language);

  // 4. Get the most recent RPC call result (if we can)
  const { data: rpcTest, error: rpcError } = await client.rpc('update_course_progress', {
    p_user_id: user.id,
    p_lesson_id: courseLessons?.[0]?.id || null,
    p_language: language
  });

  // Get ALL enrollments for this user to help debug
  const { data: allEnrollments } = await client
    .from('course_enrollments')
    .select('course_id, courses!inner(title)')
    .eq('user_id', user.id);

  return NextResponse.json({
    debug_info: {
      courseId_requested: courseId,
      user_id: user.id,
      all_user_enrollments: allEnrollments?.map(e => ({
        course_id: e.course_id,
        title: e.courses?.title
      }))
    },
    enrollment: {
      exists: !!enrollment,
      progress_percentage: enrollment?.progress_percentage,
      completed_at: enrollment?.completed_at,
      completed_language: enrollment?.completed_language
    },
    lesson_progress: {
      total_records: allProgress?.length || 0,
      by_language: {
        en: allProgress?.filter(p => p.lessons.course_modules.language === 'en').length || 0,
        es: allProgress?.filter(p => p.lessons.course_modules.language === 'es').length || 0
      },
      recent: allProgress?.slice(0, 5).map(p => ({
        lesson: p.lessons.title,
        module: p.lessons.course_modules.title,
        language: p.lessons.course_modules.language,
        status: p.status,
        updated: p.updated_at,
        last_accessed: p.last_accessed
      }))
    },
    course_structure: {
      total_lessons: courseLessons?.length || 0,
      language: language,
      lessons: courseLessons?.map(l => l.title)
    },
    rpc_function: {
      error: rpcError?.message || null,
      works: !rpcError
    }
  });
}