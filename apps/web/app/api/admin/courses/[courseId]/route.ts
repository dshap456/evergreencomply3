import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

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

    console.log('🔧 Creating client...');
    const client = getSupabaseServerClient();
    console.log('✅ Client created');

    // Check if user is authenticated
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load course data - RLS will handle permissions
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

    // Load modules with lessons - RLS will handle permissions
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

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { courseId } = await context.params;
    const client = getSupabaseServerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();

    console.log('🔄 Updating course:', { courseId, body });

    // Prepare the update data
    const updateData: any = {
      title: body.title,
      description: body.description,
      updated_at: new Date().toISOString()
    };

    // Handle status/publish state
    if (body.status !== undefined) {
      updateData.is_published = body.status === 'published';
      console.log('📝 Setting publication status:', updateData.is_published);
    }

    const { data, error } = await client
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating course:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Course updated successfully:', data);
    return NextResponse.json({ success: true, course: data });
  } catch (error) {
    console.error('❌ Error updating course:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}