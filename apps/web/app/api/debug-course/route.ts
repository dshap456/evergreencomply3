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

    try {
      // Test the exact same data processing logic from loadLearnerCourseDetails
      const progressMap = new Map<string, { completed: boolean; time_spent: number }>();
      lessonProgress?.forEach(progress => {
        progressMap.set(progress.lesson_id, {
          completed: progress.status === 'completed',
          time_spent: progress.time_spent || 0
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
            const progress = progressMap.get(lesson.id) || { completed: false, time_spent: 0 };
            return {
              id: lesson.id,
              title: lesson.title,
              description: lesson.description || '',
              content_type: lesson.content_type,
              order_index: lesson.order_index,
              video_url: lesson.video_url,
              content: lesson.content,
              asset_url: lesson.asset_url,
              is_final_quiz: lesson.is_final_quiz,
              completed: progress.completed,
              time_spent: progress.time_spent
            };
          })
      }));

      // Check if course is published
      if (!enrollment.courses.is_published) {
        throw new Error('Course is not published');
      }

      const finalResult = {
        id: enrollment.courses.id,
        title: enrollment.courses.title,
        description: enrollment.courses.description || '',
        enrollment_id: enrollment.id,
        progress_percentage: enrollment.progress_percentage || 0,
        enrolled_at: enrollment.enrolled_at,
        completed_at: enrollment.completed_at,
        final_score: enrollment.final_score,
        modules: formattedModules
      };

      return NextResponse.json({ 
        success: true,
        message: "All processing completed successfully!",
        data: {
          modules_count: modules?.length || 0,
          lessons_count: lessons?.length || 0,
          progress_records: lessonProgress?.length || 0,
          formatted_modules_count: formattedModules.length
        },
        sample_result: {
          course_id: finalResult.id,
          course_title: finalResult.title,
          first_module: formattedModules[0] || null
        }
      });

    } catch (processingError) {
      return NextResponse.json({ 
        error: 'Data processing failed',
        details: processingError instanceof Error ? processingError.message : 'Unknown processing error',
        stack: processingError instanceof Error ? processingError.stack : undefined,
        phase: 'data processing after queries'
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}