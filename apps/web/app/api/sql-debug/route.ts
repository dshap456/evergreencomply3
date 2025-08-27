import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: NextRequest) {
  try {
    const adminClient = getSupabaseServerAdminClient();
    const email = 'evergreentester1@gmail.com';
    
    // Execute the SQL queries using RPC or direct database queries
    const results = {
      timestamp: new Date().toISOString(),
      email: email,
    };
    
    // 1. Try to check auth.users using a direct query
    try {
      const { data: authCheck, error: authError } = await adminClient
        .schema('auth')
        .from('users')
        .select('id, email, email_confirmed_at, created_at, last_sign_in_at')
        .eq('email', email);
      
      results.authUsers = {
        count: authCheck?.length || 0,
        data: authCheck || [],
        error: authError?.message || null,
      };
    } catch (error) {
      results.authUsers = {
        count: 0,
        data: [],
        error: error instanceof Error ? error.message : 'Cannot access auth.users',
      };
    }
    
    // 2. Check course enrollments
    let enrollments = [];
    let enrollError = null;
    
    try {
      const result = await adminClient.rpc('get_user_enrollments_by_email', { target_email: email });
      enrollments = result.data || [];
      enrollError = result.error;
    } catch (error) {
      enrollError = { message: 'Function not available - user likely does not exist in auth.users' };
    }
    
    results.courseEnrollments = {
      count: Array.isArray(enrollments) ? enrollments.length : 0,
      data: enrollments || [],
      error: enrollError?.message || null,
    };
    
    // 3. Check team invitations
    const { data: teamInvites } = await adminClient
      .from('invitations')
      .select(`
        id, email, account_id, role, created_at, expires_at, invite_token,
        accounts (name, slug, is_personal_account)
      `)
      .eq('email', email);
    
    results.teamInvitations = {
      count: teamInvites?.length || 0,
      data: teamInvites || [],
    };
    
    // 4. Check course invitations
    const { data: courseInvites } = await adminClient
      .from('course_invitations')
      .select(`
        id, email, course_id, account_id, created_at, expires_at, 
        accepted_at, invitee_name, invite_token,
        courses (title, is_published)
      `)
      .eq('email', email);
    
    results.courseInvitations = {
      count: courseInvites?.length || 0,
      data: courseInvites || [],
    };
    
    // 5. Check pending tokens
    const { data: pendingTokens } = await adminClient
      .from('pending_invitation_tokens')
      .select('*')
      .eq('email', email);
    
    results.pendingTokens = {
      count: pendingTokens?.length || 0,
      data: pendingTokens || [],
    };
    
    // 6. Create summary
    results.summary = {
      userExistsInAuth: results.authUsers.count > 0,
      hasEnrollments: results.courseEnrollments.count > 0,
      hasTeamInvitations: results.teamInvitations.count > 0,
      hasCourseInvitations: results.courseInvitations.count > 0,
      hasPendingTokens: results.pendingTokens.count > 0,
      totalPendingInvitations: 
        results.teamInvitations.count + 
        results.courseInvitations.count + 
        results.pendingTokens.count,
    };
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('SQL debug error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function GET() {
  return POST(new Request('http://localhost/api/sql-debug', { method: 'POST' }));
}