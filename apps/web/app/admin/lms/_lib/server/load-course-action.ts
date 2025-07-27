'use server';

import { z } from 'zod';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const LoadCourseSchema = z.object({
  courseId: z.string().uuid(),
});

export const loadCourseAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    // Load course data using admin client to bypass RLS
    const { data: course, error: courseError } = await client
      .from('courses')
      .select('*')
      .eq('id', data.courseId)
      .single() as any;

    if (courseError) {
      throw new Error(`Failed to load course: ${courseError.message}`);
    }

    // Load modules with lessons using admin client
    const { data: modules, error: modulesError } = await client
      .from('course_modules')
      .select(`
        *,
        lessons (
          *
        )
      `)
      .eq('course_id', data.courseId)
      .order('order_index');

    if (modulesError) {
      throw new Error(`Failed to load modules: ${modulesError.message}`);
    }

    // Format the data
    const formattedModules = modules.map(module => ({
      ...module,
      lessons: module.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    }));

    // Transform course data to match the expected interface
    const transformedCourse = {
      ...course,
      status: course.status as 'draft' | 'published' | 'archived',
      version: '1.0', // Default version
      lessons_count: formattedModules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0),
      enrollments_count: 0, // Would need a separate query for accurate count
      completion_rate: 0 // Would need calculation
    };

    return {
      course: transformedCourse,
      modules: formattedModules
    };
  },
  {
    auth: true,
    schema: LoadCourseSchema,
  }
);