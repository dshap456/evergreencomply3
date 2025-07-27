import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    
    // Get current user
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Debug info
    const debugInfo: any = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      timestamp: new Date().toISOString(),
    };
    
    // Check if user is super admin
    try {
      const { data: isSuperAdmin } = await client.rpc('is_super_admin');
      debugInfo.isSuperAdmin = isSuperAdmin;
    } catch (error: any) {
      debugInfo.isSuperAdminError = error.message;
    }
    
    // Check user's account memberships
    try {
      const { data: memberships, error } = await client
        .from('accounts_memberships')
        .select('account_id, account_role, accounts(id, name, is_personal_account)')
        .eq('user_id', user.id);
      
      debugInfo.memberships = {
        data: memberships,
        error: error?.message,
      };
    } catch (error: any) {
      debugInfo.membershipsError = error.message;
    }
    
    // Check enrollments for this user
    try {
      const { data: enrollments, error } = await client
        .from('course_enrollments')
        .select('course_id, enrolled_at, progress_percentage')
        .eq('user_id', user.id);
      
      debugInfo.enrollments = {
        count: enrollments?.length || 0,
        data: enrollments,
        error: error?.message,
      };
    } catch (error: any) {
      debugInfo.enrollmentsError = error.message;
    }
    
    // Try to get courses as regular user
    try {
      const { data: userCourses, error } = await client
        .from('courses')
        .select('id, title, status')
        .eq('status', 'published')
        .limit(5);
      
      debugInfo.userCoursesAccess = {
        count: userCourses?.length || 0,
        data: userCourses,
        error: error?.message,
      };
    } catch (error: any) {
      debugInfo.userCoursesError = error.message;
    }
    
    // Check with admin client to see all courses
    try {
      const { data: allCourses, error } = await adminClient
        .from('courses')
        .select('id, title, status, account_id')
        .limit(10);
      
      debugInfo.allCoursesViaAdmin = {
        count: allCourses?.length || 0,
        statuses: allCourses?.reduce((acc: any, course) => {
          acc[course.status] = (acc[course.status] || 0) + 1;
          return acc;
        }, {}),
        data: allCourses,
        error: error?.message,
      };
    } catch (error: any) {
      debugInfo.allCoursesError = error.message;
    }
    
    // Check specific SQL to debug RLS
    try {
      const { data: rlsTest } = await adminClient.rpc('debug_learner_rls', {
        test_user_id: user.id,
      });
      debugInfo.rlsTest = rlsTest;
    } catch (error: any) {
      debugInfo.rlsTestInfo = 'Function not found - will provide SQL to create it';
    }
    
    // Check if courses table has RLS enabled
    try {
      const { data: rlsStatus } = await adminClient
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public')
        .eq('tablename', 'courses')
        .single();
      
      debugInfo.coursesRLSEnabled = rlsStatus?.rowsecurity;
    } catch (error: any) {
      debugInfo.rlsStatusError = error.message;
    }
    
    // SQL to create debug function
    debugInfo.createDebugFunctionSQL = `
-- Create a debug function to test RLS
CREATE OR REPLACE FUNCTION debug_learner_rls(test_user_id uuid)
RETURNS jsonb
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    result = jsonb_build_object(
        'is_super_admin', public.is_super_admin(),
        'published_courses_count', (
            SELECT COUNT(*) 
            FROM public.courses 
            WHERE status = 'published'
        ),
        'user_enrollments', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'course_id', ce.course_id,
                    'course_title', c.title,
                    'course_status', c.status
                )
            )
            FROM public.course_enrollments ce
            JOIN public.courses c ON c.id = ce.course_id
            WHERE ce.user_id = test_user_id
        ),
        'can_see_published_courses', EXISTS (
            SELECT 1 
            FROM public.courses 
            WHERE status = 'published'
            LIMIT 1
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION debug_learner_rls(uuid) TO authenticated;
`;
    
    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
    }, { status: 500 });
  }
}