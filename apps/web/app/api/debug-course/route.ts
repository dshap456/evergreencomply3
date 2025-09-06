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
    
    console.log('[DEBUG-COURSE] ============ ENROLLMENT DATA ============');
    console.log('[DEBUG-COURSE] Enrollment:', JSON.stringify(enrollment, null, 2));
    console.log('[DEBUG-COURSE] User ID:', user.id);
    console.log('[DEBUG-COURSE] Course ID:', courseId);
    console.log('[DEBUG-COURSE] Progress from DB:', enrollment.progress_percentage);
    console.log('[DEBUG-COURSE] =========================================');

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
    // REMOVED language filter - lessons should already be filtered by module
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
      // Note: Not filtering by language since modules already filter
      .order('order_index');
    
    console.log('[DEBUG-COURSE] Lessons found:', {
      count: lessons?.length || 0,
      firstFew: lessons?.slice(0, 3).map(l => ({ id: l.id, title: l.title }))
    });

    if (lessonsError) {
      console.error('Lessons error:', lessonsError);
      return NextResponse.json(
        { success: false, error: 'Failed to load course lessons' },
        { status: 500 }
      );
    }

    // Get lesson progress for the user
    const lessonIds = lessons?.map(l => l.id) || [];
    
    // CRITICAL DEBUG: Log exact lesson IDs we're looking for
    console.log('[DEBUG-COURSE] ============ PROGRESS CHECK ============');
    console.log('[DEBUG-COURSE] User:', user.id);
    console.log('[DEBUG-COURSE] Language requested:', language);
    console.log('[DEBUG-COURSE] Lesson IDs to check:', lessonIds);
    console.log('[DEBUG-COURSE] First 3 lessons detail:', lessons?.slice(0, 3).map(l => ({
      id: l.id,
      title: l.title,
      module_id: l.module_id
    })));
    
    // SIMPLIFIED: Just look up by lesson ID since they're unique
    // Don't filter by language in the progress lookup
    const { data: lessonProgress, error: progressError } = await client
      .from('lesson_progress')
      .select('lesson_id, status, time_spent, updated_at')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds);
    
    console.log('[DEBUG-COURSE] Progress found (no language filter):', {
      count: lessonProgress?.length || 0,
      records: lessonProgress?.slice(0, 5).map(p => ({ 
        lesson_id: p.lesson_id.substring(0, 8),
        status: p.status
      }))
    });
    
    if (progressError) {
      console.error('Progress error:', progressError);
    }

    // Create progress map
    const progressMap = new Map<string, any>();
    lessonProgress?.forEach(progress => {
      progressMap.set(progress.lesson_id, {
        completed: progress.status === 'completed',
        time_spent: progress.time_spent || 0,
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
        last_accessed: null
      };

      lessonsByModule.get(lesson.module_id)!.push({
        ...lesson,
        completed: progress.completed,
        time_spent: progress.time_spent
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

    // Use enrollment progress directly - don't recalculate
    const enrollmentProgress = enrollment.progress_percentage || 0;
    
    console.log('[DEBUG-COURSE] Using enrollment progress directly:', {
      enrollmentProgress,
      totalLessons: lessons?.length || 0,
      message: 'Using stored progress from enrollment, not recalculating'
    });

    const responseData = {
      success: true,
      course: {
        id: enrollment.courses.id,
        title: enrollment.courses.title,
        description: enrollment.courses.description || '',
        enrollment_id: enrollment.id,
        progress_percentage: enrollmentProgress,  // Use enrollment progress directly
        enrolled_at: enrollment.enrolled_at,
        completed_at: enrollment.completed_at,
        final_score: enrollment.final_score,
        modules: formattedModules,
        current_language: language
      }
    };
    
    console.log('[DEBUG-COURSE] ============ FINAL RESPONSE ============');
    console.log('[DEBUG-COURSE] Returning progress:', calculatedProgress + '%');
    console.log('[DEBUG-COURSE] Total modules:', formattedModules.length);
    console.log('[DEBUG-COURSE] Total lessons:', totalLessons);
    console.log('[DEBUG-COURSE] Completed lessons:', completedLessons);
    console.log('[DEBUG-COURSE] =========================================');
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in debug-course API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}