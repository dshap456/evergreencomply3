import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function loadCourseWithModules(courseId: string) {
  const client = getSupabaseServerAdminClient();

  // Load course data
  const { data: course, error: courseError } = await client
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (courseError) {
    throw new Error(`Failed to load course: ${courseError.message}`);
  }

  // Load modules with lessons
  const { data: modules, error: modulesError } = await client
    .from('course_modules')
    .select(`
      *,
      lessons (
        *
      )
    `)
    .eq('course_id', courseId)
    .order('order_index');

  if (modulesError) {
    throw new Error(`Failed to load modules: ${modulesError.message}`);
  }

  // Format the data
  const formattedModules = modules.map(module => ({
    ...module,
    lessons: module.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []
  }));

  return {
    course,
    modules: formattedModules
  };
}