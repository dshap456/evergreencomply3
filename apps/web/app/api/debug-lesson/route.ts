import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');
    const lessonId = searchParams.get('lessonId');
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }
    
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the course data with lessons and progress
    const { data: courseData } = await client
      .from('courses')
      .select(`
        id,
        title,
        course_modules (
          id,
          title,
          order_index,
          lessons (
            id,
            title,
            order_index,
            content_type
          )
        )
      `)
      .eq('id', courseId)
      .single();

    // Get all progress records for this user and course
    const { data: progressRecords } = await client
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id);

    // Get enrollment
    const { data: enrollment } = await client
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    // Map lessons with their progress status
    const lessonsWithProgress = courseData?.course_modules?.flatMap(module =>
      module.lessons.map(lesson => {
        const progress = progressRecords?.find(p => p.lesson_id === lesson.id);
        return {
          id: lesson.id,
          title: `${module.title} - ${lesson.title}`,
          hasProgress: !!progress,
          status: progress?.status || 'not_started',
          completed: progress?.status === 'completed',
          completedAt: progress?.completed_at,
          updatedAt: progress?.updated_at
        };
      })
    );

    // Find first incomplete lesson
    const firstIncomplete = lessonsWithProgress?.find(l => !l.completed);

    return NextResponse.json({
      courseId,
      courseTitle: courseData?.title,
      enrollment: {
        progressPercentage: enrollment?.progress_percentage,
        currentLessonId: enrollment?.current_lesson_id,
        enrolledAt: enrollment?.enrolled_at
      },
      totalLessons: lessonsWithProgress?.length || 0,
      completedLessons: lessonsWithProgress?.filter(l => l.completed).length || 0,
      firstIncompleteLesson: firstIncomplete,
      requestedLessonId: lessonId,
      requestedLessonData: lessonId ? lessonsWithProgress?.find(l => l.id === lessonId) : null,
      allLessons: lessonsWithProgress
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}