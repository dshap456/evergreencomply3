import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const language = searchParams.get('language') || 'en';
    const courseId = params.courseId;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get enrollment info with course data
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
          status
        )
      `)
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      console.error('Enrollment error:', enrollmentError);
      return NextResponse.json(
        { success: false, error: 'Course not found or user not enrolled' },
        { status: 404 }
      );
    }

    // Check if course is published
    if (enrollment.courses.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Course is not published' },
        { status: 403 }
      );
    }

    // Get course modules for the specified language
    const { data: modules, error: modulesError } = await client
      .from('course_modules')
      .select(`
        id,
        title,
        description,
        order_index
      `)
      .eq('course_id', courseId)
      .eq('language', language)
      .order('order_index');

    if (modulesError) {
      console.error('Modules error:', modulesError);
      return NextResponse.json(
        { success: false, error: 'Failed to load course modules' },
        { status: 500 }
      );
    }

    // If no modules found, return empty course structure
    if (!modules || modules.length === 0) {
      return NextResponse.json({
        success: true,
        course: {
          id: enrollment.courses.id,
          title: enrollment.courses.title,
          description: enrollment.courses.description || '',
          enrollment_id: enrollment.id,
          progress_percentage: enrollment.progress_percentage || 0,
          enrolled_at: enrollment.enrolled_at,
          completed_at: enrollment.completed_at,
          final_score: enrollment.final_score,
          modules: [],
          current_language: language
        }
      });
    }

    // Get lessons for all modules with progress
    const moduleIds = modules.map(m => m.id);
    const { data: lessons, error: lessonsError } = await client
      .from('course_lessons')
      .select(`
        id,
        module_id,
        title,
        description,
        content_type,
        content,
        video_url,
        order_index,
        duration_minutes,
        course_lesson_progress!left (
          completed,
          completed_at,
          time_spent_seconds
        )
      `)
      .in('module_id', moduleIds)
      .eq('course_lesson_progress.user_id', user.id)
      .eq('language', language)
      .order('order_index');

    if (lessonsError) {
      console.error('Lessons error:', lessonsError);
      return NextResponse.json(
        { success: false, error: 'Failed to load course lessons' },
        { status: 500 }
      );
    }

    // Get quiz questions for lessons that have them
    const lessonIds = lessons?.map(l => l.id) || [];
    const { data: quizQuestions, error: quizError } = await client
      .from('quiz_questions')
      .select('*')
      .in('lesson_id', lessonIds)
      .eq('language', language)
      .order('order_index');

    if (quizError) {
      console.error('Quiz error:', quizError);
    }

    // Organize data into hierarchical structure
    const courseLessons = lessons || [];
    const courseQuizQuestions = quizQuestions || [];

    const modulesWithLessons = modules.map(module => {
      const moduleLessons = courseLessons
        .filter(lesson => lesson.module_id === module.id)
        .map(lesson => {
          const progress = lesson.course_lesson_progress?.[0];
          const lessonQuizQuestions = courseQuizQuestions
            .filter(q => q.lesson_id === lesson.id);

          return {
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            content_type: lesson.content_type,
            content: lesson.content,
            video_url: lesson.video_url,
            order_index: lesson.order_index,
            duration_minutes: lesson.duration_minutes,
            completed: progress?.completed || false,
            completed_at: progress?.completed_at || null,
            time_spent_seconds: progress?.time_spent_seconds || 0,
            quiz_questions: lessonQuizQuestions.map(q => ({
              id: q.id,
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options,
              correct_answer: q.correct_answer,
              explanation: q.explanation,
              points: q.points,
              order_index: q.order_index
            }))
          };
        })
        .sort((a, b) => a.order_index - b.order_index);

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        order_index: module.order_index,
        lessons: moduleLessons
      };
    });

    return NextResponse.json({
      success: true,
      course: {
        id: enrollment.courses.id,
        title: enrollment.courses.title,
        description: enrollment.courses.description || '',
        enrollment_id: enrollment.id,
        progress_percentage: enrollment.progress_percentage || 0,
        enrolled_at: enrollment.enrolled_at,
        completed_at: enrollment.completed_at,
        final_score: enrollment.final_score,
        modules: modulesWithLessons,
        current_language: language
      }
    });

  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}