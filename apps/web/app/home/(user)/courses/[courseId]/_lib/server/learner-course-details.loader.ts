import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export interface LearnerCourseDetails {
  id: string;
  title: string;
  description: string;
  // Enrollment info
  enrollment_id: string;
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
  final_score: number | null;
  // Course structure
  modules: CourseModule[];
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  title: string;
  description: string;
  content_type: 'video' | 'text' | 'quiz' | 'asset';
  order_index: number;
  video_url: string | null;
  content: string | null;
  asset_url: string | null;
  is_final_quiz: boolean;
  // Progress
  completed: boolean;
  time_spent: number;
}

export async function loadLearnerCourseDetails(courseId: string): Promise<LearnerCourseDetails> {
  const client = getSupabaseServerClient();
  
  // Get current user from Supabase auth
  const { data: { user }, error: userError } = await client.auth.getUser();

  if (!user || userError) {
    throw new Error('User not authenticated');
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
        is_published
      )
    `)
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single();

  if (enrollmentError || !enrollment) {
    throw new Error('Course not found or user not enrolled');
  }

  // Get course modules
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
    throw modulesError;
  }

  // Get all lessons for this course
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
    throw lessonsError;
  }

  // Get lesson progress
  const { data: lessonProgress, error: progressError } = await client
    .from('lesson_progress')
    .select('lesson_id, status, time_spent')
    .eq('user_id', user.id);

  if (progressError) {
    throw progressError;
  }

  // Create progress map
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
  const formattedModules: CourseModule[] = (modules || []).map(module => ({
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
          content_type: lesson.content_type as 'video' | 'text' | 'quiz' | 'asset',
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

  return {
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
}