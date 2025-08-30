import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { moduleId, lessons, moduleData } = body;

    const adminClient = getSupabaseServerAdminClient();
    const regularClient = getSupabaseServerClient();
    
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      moduleId,
      lessonCount: lessons?.length || 0,
      errors: [],
      checks: {}
    };

    // Check 1: Verify module exists
    const { data: moduleCheck, error: moduleError } = await adminClient
      .from('course_modules')
      .select('*')
      .eq('id', moduleId)
      .single();
    
    debugInfo.checks.moduleExists = !!moduleCheck;
    debugInfo.checks.moduleData = moduleCheck;
    if (moduleError) {
      debugInfo.errors.push({ type: 'module_check', error: moduleError.message });
    }

    // Check 2: Try updating module with admin client
    if (moduleData) {
      const { error: updateError } = await adminClient
        .from('course_modules')
        .update({
          title: moduleData.title,
          description: moduleData.description,
          order_index: moduleData.order_index,
          updated_at: new Date().toISOString(),
        })
        .eq('id', moduleId);
      
      debugInfo.checks.moduleUpdateSuccess = !updateError;
      if (updateError) {
        debugInfo.errors.push({ type: 'module_update', error: updateError.message });
      }
    }

    // Check 3: Verify lessons exist and belong to module
    if (lessons && lessons.length > 0) {
      const { data: lessonsCheck, error: lessonsError } = await adminClient
        .from('lessons')
        .select('id, title, order_index, module_id')
        .eq('module_id', moduleId)
        .order('order_index');
      
      debugInfo.checks.lessonsInDb = lessonsCheck?.length || 0;
      debugInfo.checks.lessonsData = lessonsCheck;
      if (lessonsError) {
        debugInfo.errors.push({ type: 'lessons_check', error: lessonsError.message });
      }

      // Check 4: Try updating each lesson's order
      const updateResults = [];
      for (const lesson of lessons) {
        const { data, error } = await adminClient
          .from('lessons')
          .update({
            order_index: lesson.order_index,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lesson.id)
          .eq('module_id', moduleId)
          .select();
        
        updateResults.push({
          lessonId: lesson.id,
          order_index: lesson.order_index,
          success: !error,
          error: error?.message,
          updatedData: data
        });
      }
      debugInfo.checks.lessonUpdateResults = updateResults;
    }

    // Check 5: Check auth and permissions
    const { data: { user } } = await regularClient.auth.getUser();
    debugInfo.checks.authUser = {
      id: user?.id,
      email: user?.email,
      role: user?.role
    };

    // Check 6: Check if user is super admin
    const { data: adminCheck } = await adminClient
      .rpc('is_super_admin');
    debugInfo.checks.isSuperAdmin = adminCheck;

    return NextResponse.json({
      success: debugInfo.errors.length === 0,
      debugInfo
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}