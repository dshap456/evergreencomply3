import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const courseId = searchParams.get('courseId');
  const language = (searchParams.get('language') || 'en') as 'en' | 'es';

  if (!courseId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Course ID is required' 
    }, { status: 400 });
  }

  try {
    const client = getSupabaseServerClient();
    
    // Get current user from Supabase auth
    const { data: { user }, error: userError } = await client.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not authenticated' 
      }, { status: 401 });
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
      return NextResponse.json({ 
        success: false, 
        error: 'Course not found or user not enrolled' 
      }, { status: 404 });
    }

    // Check if course is published
    if (enrollment.courses.status !== 'published') {
      return NextResponse.json({ 
        success: false, 
        error: 'Course is not published' 
      }, { status: 403 });
    }

    // Get course modules (language specific if translations exist)
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
      console.error('Modules error:', modulesError);
      throw modulesError;
    }

    // Get all lessons for this course (language specific if translations exist)
    const { data: lessons, error: lessonsError } = await client
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
      .in('module_id', (modules || []).map(m => m.id))
      .order('order_index');

    if (lessonsError) {
      console.error('Lessons error:', lessonsError);
      throw lessonsError;
    }

    // Get lesson progress for the current user and language
    const { data: lessonProgress, error: progressError } = await client
      .from('lesson_progress')
      .select(`
        lesson_id, 
        status, 
        time_spent, 
        progress_percentage,
        quiz_score,
        language
      `)
      .eq('user_id', user.id)
      .eq('language', language)
      .in('lesson_id', (lessons || []).map(l => l.id));

    if (progressError) {
      console.error('Progress error:', progressError);
      // Don't throw here, just log - progress is optional
    }

    // Create progress map
    const progressMap = new Map<string, { 
      completed: boolean; 
      time_spent: number;
      video_progress?: number;
      quiz_score?: number;
    }>();
    
    lessonProgress?.forEach(progress => {
      progressMap.set(progress.lesson_id, {
        completed: progress.status === 'completed',
        time_spent: progress.time_spent || 0,
        video_progress: progress.progress_percentage,
        quiz_score: progress.quiz_score
      });
    });

    // Group lessons by module
    const lessonsByModule = new Map<string, any[]>();
    (lessons || []).forEach(lesson => {
      if (!lessonsByModule.has(lesson.module_id)) {
        lessonsByModule.set(lesson.module_id, []);
      }
      lessonsByModule.get(lesson.module_id)!.push(lesson);
    });

    // Format modules with lessons and progress
    const formattedModules = (modules || []).map(module => ({
      id: module.id,
      title: module.title,
      description: module.description || '',
      order_index: module.order_index,
      lessons: (lessonsByModule.get(module.id) || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map(lesson => {
          const progress = progressMap.get(lesson.id) || { 
            completed: false, 
            time_spent: 0 
          };
          return {
            id: lesson.id,
            title: lesson.title,
            description: lesson.description || '',
            content_type: lesson.content_type as 'video' | 'text' | 'quiz' | 'asset',
            order_index: lesson.order_index,
            video_url: lesson.video_url,
            content: lesson.content,
            asset_url: lesson.asset_url,
            is_final_quiz: lesson.is_final_quiz,
            completed: progress.completed,
            time_spent: progress.time_spent,
            video_progress: progress.video_progress,
            quiz_score: progress.quiz_score
          };
        })
    }));

    // Build the course data structure expected by the client
    const courseData = {
      id: enrollment.courses.id,
      title: enrollment.courses.title,
      description: enrollment.courses.description || '',
      enrollment_id: enrollment.id,
      progress_percentage: enrollment.progress_percentage || 0,
      enrolled_at: enrollment.enrolled_at,
      completed_at: enrollment.completed_at,
      final_score: enrollment.final_score,
      modules: formattedModules,
      current_language: language
    };

    return NextResponse.json({ 
      success: true, 
      course: courseData 
    });

  } catch (error) {
    console.error('Error loading course:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to load course data' 
    }, { status: 500 });
  }
}