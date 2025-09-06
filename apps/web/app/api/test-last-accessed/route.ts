import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const courseId = searchParams.get('courseId') || '4d326c56-63ad-4396-9470-c73bdf8d780c';
  const userId = searchParams.get('userId') || 'b5b01ffc-3c23-495e-81a0-8610be2c331f';
  const language = searchParams.get('language') || 'en';

  const client = getSupabaseServerClient();

  // Get the last accessed lesson using the EXACT same logic as the API
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

  // Get lesson progress
  const { data: lessonProgress } = await client
    .from('lesson_progress')
    .select('lesson_id, last_accessed, updated_at, status')
    .eq('user_id', userId)
    .eq('language', language)
    .in('lesson_id', lessonIds)
    .order('last_accessed', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  // Also get ALL progress to see the full picture
  const { data: allProgress } = await client
    .from('lesson_progress')
    .select(`
      lesson_id,
      status,
      last_accessed,
      updated_at,
      lessons!inner (
        title,
        course_modules!inner (
          title,
          order_index
        )
      )
    `)
    .eq('user_id', userId)
    .eq('language', language)
    .in('lesson_id', lessonIds)
    .order('last_accessed', { ascending: false, nullsFirst: false });

  return NextResponse.json({
    courseId,
    userId,
    language,
    last_accessed_lesson: lessonProgress,
    all_progress: allProgress?.map(p => ({
      lesson_id: p.lesson_id,
      title: p.lessons.title,
      module: p.lessons.course_modules.title,
      status: p.status,
      last_accessed: p.last_accessed,
      updated_at: p.updated_at
    })),
    total_lessons: lessonIds.length,
    lessons_with_progress: allProgress?.length || 0
  });
}