import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    steps: []
  };

  try {
    // Step 1: Get request body
    const body = await request.json();
    debugInfo.steps.push({
      step: 'Request body received',
      data: body
    });

    // Step 2: Check authentication
    const authClient = getSupabaseServerClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    debugInfo.steps.push({
      step: 'Authentication check',
      userId: user?.id,
      error: authError?.message
    });

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated', debugInfo }, { status: 401 });
    }

    // Step 3: Create admin client
    const adminClient = getSupabaseServerAdminClient();
    debugInfo.steps.push({ step: 'Admin client created' });

    // Step 4: Test direct database access
    const { data: testData, error: testError } = await adminClient
      .from('courses')
      .select('id, title')
      .limit(1);
    
    debugInfo.steps.push({
      step: 'Database connection test',
      success: !testError,
      error: testError?.message,
      sample: testData?.[0]
    });

    // Step 5: Skip schema check (run_sql not available)
    debugInfo.steps.push({
      step: 'Schema check',
      note: 'Skipped - run_sql RPC not available'
    });

    // Step 6: Skip RLS policy check
    debugInfo.steps.push({
      step: 'RLS policies check',
      note: 'Skipped - run_sql RPC not available'
    });

    // Step 7: Try to fetch the specific course
    if (body.courseId) {
      const { data: course, error: fetchError } = await adminClient
        .from('courses')
        .select('*')
        .eq('id', body.courseId)
        .single();

      debugInfo.steps.push({
        step: 'Fetch course',
        courseId: body.courseId,
        found: !!course,
        error: fetchError?.message,
        courseData: course
      });

      // Step 8: Try to update the course
      if (course) {
        const updateData = {
          title: body.title || course.title,
          description: body.description !== undefined ? body.description : course.description,
          status: body.status || course.status,
          updated_at: new Date().toISOString()
        };

        debugInfo.steps.push({
          step: 'Update data prepared',
          updateData
        });

        const { data: updated, error: updateError } = await adminClient
          .from('courses')
          .update(updateData)
          .eq('id', body.courseId)
          .select()
          .single();

        debugInfo.steps.push({
          step: 'Update attempt',
          success: !updateError,
          error: updateError,
          errorCode: updateError?.code,
          errorDetails: updateError?.details,
          errorHint: updateError?.hint,
          updatedData: updated
        });

        // Step 9: Verify the update
        if (!updateError) {
          const { data: verification, error: verifyError } = await adminClient
            .from('courses')
            .select('*')
            .eq('id', body.courseId)
            .single();

          debugInfo.steps.push({
            step: 'Verification',
            success: !verifyError,
            data: verification,
            statusMatches: verification?.status === body.status
          });
        }
      }
    }

    // Step 10: Check user permissions
    let isSuperAdmin = false;
    try {
      const { data } = await adminClient.rpc('is_super_admin');
      isSuperAdmin = data || false;
    } catch (e) {
      // Function might not exist
    }
    
    const { data: userRoles } = await adminClient
      .from('accounts_memberships')
      .select('account_id, account_role')
      .eq('user_id', user.id);

    debugInfo.steps.push({
      step: 'User permissions',
      isSuperAdmin,
      userRoles
    });

    return NextResponse.json({
      success: true,
      debugInfo
    });

  } catch (error) {
    debugInfo.steps.push({
      step: 'Unexpected error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      error: 'Debug process failed',
      debugInfo
    }, { status: 500 });
  }
}