import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');
    const language = searchParams.get('language') || 'en';

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

    // Get all lessons for these modules
    const moduleIds = modules.map(m => m.id);
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
      .in('module_id', moduleIds)
      .order('order_index');

    if (lessonsError) {
      console.error('Lessons error:', lessonsError);
      return NextResponse.json(
        { success: false, error: 'Failed to load course lessons' },
        { status: 500 }
      );
    }

    // Get lesson progress for the user FOR THE SPECIFIC LANGUAGE
    const lessonIds = lessons?.map(l => l.id) || [];
    const { data: lessonProgress, error: progressError } = await client
      .from('lesson_progress')
      .select('lesson_id, status, time_spent, video_progress, quiz_score, updated_at')
      .eq('user_id', user.id)
      .eq('language', language)  // Filter by language to get correct progress
      .in('lesson_id', lessonIds);

    if (progressError) {
      console.error('Progress error:', progressError);
    }

    // Create progress map
    const progressMap = new Map<string, any>();
    lessonProgress?.forEach(progress => {
      progressMap.set(progress.lesson_id, {
        completed: progress.status === 'completed',
        time_spent: progress.time_spent || 0,
        video_progress: progress.video_progress || 0,
        quiz_score: progress.quiz_score || null,
        last_accessed: progress.updated_at
      });
    });

    // Group lessons by module and add progress
    const lessonsByModule = new Map<string, any[]>();
    (lessons || []).forEach(lesson => {
      if (!lessonsByModule.has(lesson.module_id)) {
        lessonsByModule.set(lesson.module_id, []);
      }
      
      const progress = progressMap.get(lesson.id) || {
        completed: false,
        time_spent: 0,
        video_progress: 0,
        quiz_score: null,
        last_accessed: null
      };

      lessonsByModule.get(lesson.module_id)!.push({
        ...lesson,
        completed: progress.completed,
        time_spent: progress.time_spent,
        video_progress: progress.video_progress,
        quiz_score: progress.quiz_score
      });
    });

    // Format modules with lessons
    const formattedModules = modules.map(module => ({
      id: module.id,
      title: module.title,
      description: module.description || '',
      order_index: module.order_index,
      lessons: (lessonsByModule.get(module.id) || [])
        .sort((a, b) => a.order_index - b.order_index)
    }));

    // Calculate overall progress
    const totalLessons = lessons?.length || 0;
    const completedLessons = Array.from(progressMap.values()).filter(p => p.completed).length;
    const calculatedProgress = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      course: {
        id: enrollment.courses.id,
        title: enrollment.courses.title,
        description: enrollment.courses.description || '',
        enrollment_id: enrollment.id,
        progress_percentage: calculatedProgress,
        enrolled_at: enrollment.enrolled_at,
        completed_at: enrollment.completed_at,
        final_score: enrollment.final_score,
        modules: formattedModules,
        current_language: language
      }
    });

  } catch (error) {
    console.error('Error in debug-course API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}