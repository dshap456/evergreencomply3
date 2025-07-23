import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    console.log('🔍 Admin course API called');
    const { courseId } = await context.params;
    console.log('📋 Course ID:', courseId);
    
    if (!courseId) {
      console.error('❌ No courseId provided');
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    console.log('🔧 Creating admin client...');
    const client = getSupabaseServerAdminClient();
    console.log('✅ Admin client created');

    // Load course data using admin client to bypass RLS
    const { data: course, error: courseError } = await client
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) {
      return NextResponse.json({ 
        error: 'Failed to load course',
        details: courseError.message
      }, { status: 500 });
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
      .eq('course_id', courseId)
      .order('order_index');

    if (modulesError) {
      return NextResponse.json({ 
        error: 'Failed to load modules',
        details: modulesError.message
      }, { status: 500 });
    }

    // Format the data
    const formattedModules = modules.map(module => ({
      ...module,
      lessons: module.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    }));

    // Transform course data to match the expected interface
    const transformedCourse = {
      ...course,
      status: (course.is_published ? 'published' : 'draft') as 'draft' | 'published' | 'archived',
      version: '1.0', // Default version
      lessons_count: formattedModules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0),
      enrollments_count: 0, // Would need a separate query for accurate count
      completion_rate: 0 // Would need calculation
    };

    return NextResponse.json({
      success: true,
      course: transformedCourse,
      modules: formattedModules
    });

  } catch (error) {
    console.error('Error in admin course API:', error);
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}