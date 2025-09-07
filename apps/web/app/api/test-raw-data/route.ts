import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const courseId = searchParams.get('courseId');
  
  const client = getSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get raw lesson_progress data
  const { data: allProgress, error: progressError } = await client
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id);

  // Get specific course lessons if courseId provided
  let courseLessons = null;
  if (courseId) {
    const { data: lessons } = await client
      .from('lessons')
      .select(`
        id,
        title,
        course_modules!inner(
          course_id,
          title
        )
      `)
      .eq('course_modules.course_id', courseId);
    
    courseLessons = lessons;
  }

  // Get enrollments
  const { data: enrollments } = await client
    .from('course_enrollments')
    .select('*')
    .eq('user_id', user.id);

  return NextResponse.json({
    userId: user.id,
    rawLessonProgress: allProgress,
    progressError: progressError?.message,
    courseLessons,
    enrollments,
    
    // Analysis
    analysis: {
      totalProgressRecords: allProgress?.length || 0,
      completedLessons: allProgress?.filter(p => p.status === 'completed').length || 0,
      uniqueLessonIds: [...new Set(allProgress?.map(p => p.lesson_id) || [])],
      languagesInData: [...new Set(allProgress?.map(p => p.language) || [])],
      
      // If courseId provided, check which course lessons have progress
      courseLessonCompletion: courseLessons?.map(lesson => {
        const progress = allProgress?.find(p => p.lesson_id === lesson.id);
        return {
          lessonId: lesson.id,
          title: lesson.title,
          module: lesson.course_modules.title,
          hasProgress: !!progress,
          status: progress?.status || 'not_started',
          language: progress?.language,
          updatedAt: progress?.updated_at
        };
      })
    }
  });
}