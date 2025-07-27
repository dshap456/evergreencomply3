import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET() {
  try {
    // Get both clients
    const adminClient = getSupabaseServerAdminClient();
    const regularClient = getSupabaseServerClient();
    
    // Check auth
    const { data: { user } } = await regularClient.auth.getUser();
    
    // Test 1: Count with admin client (bypasses RLS)
    const { count: adminCount, error: adminCountError } = await adminClient
      .from('courses')
      .select('*', { count: 'exact', head: true });
    
    // Test 2: Count with regular client (respects RLS)
    const { count: regularCount, error: regularCountError } = await regularClient
      .from('courses')
      .select('*', { count: 'exact', head: true });
    
    // Test 3: Get all courses with admin client
    const { data: adminCourses, error: adminError } = await adminClient
      .from('courses')
      .select('id, title, status, account_id, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    // Test 4: Get courses with regular client
    const { data: regularCourses, error: regularError } = await regularClient
      .from('courses')
      .select('id, title, status, account_id')
      .order('created_at', { ascending: false });
    
    // Test 5: Check if user is super admin
    const { data: isSuperAdmin } = await regularClient.rpc('is_super_admin');
    
    // Test 6: Check accounts
    const { data: accounts, error: accountsError } = await adminClient
      .from('accounts')
      .select('id, name, primary_owner_user_id')
      .limit(5);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: user ? {
        id: user.id,
        email: user.email,
        isSuperAdmin
      } : 'Not authenticated',
      
      courseCounts: {
        withAdminClient: adminCount,
        withRegularClient: regularCount,
        adminError: adminCountError?.message,
        regularError: regularCountError?.message
      },
      
      adminClientCourses: {
        count: adminCourses?.length || 0,
        courses: adminCourses,
        error: adminError?.message
      },
      
      regularClientCourses: {
        count: regularCourses?.length || 0,
        courses: regularCourses,
        error: regularError?.message
      },
      
      accounts: {
        data: accounts,
        error: accountsError?.message
      },
      
      summary: {
        totalCoursesInDB: adminCount || 0,
        visibleToCurrentUser: regularCount || 0,
        difference: (adminCount || 0) - (regularCount || 0),
        possibleIssue: adminCount !== regularCount ? 'RLS policies may be blocking access' : 'Courses exist and are visible'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 });
  }
}