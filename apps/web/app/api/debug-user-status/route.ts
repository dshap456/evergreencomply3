import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    
    const adminClient = getSupabaseServerAdminClient();
    
    // 1. Check if user exists in auth.users table using RPC or direct SQL
    let authUser = null;
    let authError = null;
    
    try {
      // Try to query auth.users using a custom SQL query
      const { data, error } = await adminClient.rpc('get_user_by_email', { 
        target_email: email 
      });
      
      if (error && error.code !== '42883') { // 42883 = function does not exist
        authError = error;
      } else if (data) {
        authUser = Array.isArray(data) ? data[0] : data;
      }
      
      // If the function doesn't exist, try alternative approach
      if (error?.code === '42883' || !data) {
        // Use service role to directly query auth schema
        const { data: userData, error: userError } = await adminClient
          .schema('auth')
          .from('users')
          .select('id, email, email_confirmed_at, created_at, last_sign_in_at')
          .eq('email', email)
          .maybeSingle();
        
        authUser = userData;
        authError = userError;
      }
    } catch (error) {
      authError = error instanceof Error ? { message: error.message } : { message: 'Unknown error' };
    }
    
    if (authError && authError.code !== 'PGRST116') { // PGRST116 = not found
      console.warn('Auth user query error:', authError);
    }
    
    let courseEnrollments = [];
    let enrollmentError = null;
    
    // 2. Check course enrollments if user exists
    if (authUser?.id) {
      const { data: enrollments, error: enrollError } = await adminClient
        .from('course_enrollments')
        .select(`
          id,
          user_id,
          course_id,
          enrolled_at,
          completed_at,
          progress_percentage,
          final_score,
          courses (
            id,
            title,
            description,
            is_published,
            account_id
          )
        `)
        .eq('user_id', authUser.id);
      
      courseEnrollments = enrollments || [];
      enrollmentError = enrollError;
    }
    
    // 3. Check pending invitations in different tables
    
    // Team account invitations
    const { data: teamInvitations } = await adminClient
      .from('invitations')
      .select(`
        id,
        email,
        account_id,
        role,
        created_at,
        expires_at,
        invited_by,
        accounts (
          id,
          name,
          slug,
          is_personal_account
        )
      `)
      .eq('email', email);
    
    // Course invitations (if they exist)
    const { data: courseInvitations } = await adminClient
      .from('course_invitations')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });
    
    // Pending invitation tokens (if they exist)
    const { data: pendingTokens } = await adminClient
      .from('pending_invitation_tokens')
      .select('*')
      .eq('email', email);
    
    // 4. If user exists, check their account memberships
    let accountMemberships = [];
    if (authUser?.id) {
      const { data: memberships } = await adminClient
        .from('accounts_memberships')
        .select(`
          id,
          user_id,
          account_id,
          account_role,
          created_at,
          accounts (
            id,
            name,
            slug,
            is_personal_account
          )
        `)
        .eq('user_id', authUser.id);
      
      accountMemberships = memberships || [];
    }
    
    // 5. Check for personal account if user exists
    let personalAccount = null;
    if (authUser?.id) {
      const { data: personalAcc } = await adminClient
        .from('accounts')
        .select('id, name, slug, email, is_personal_account, created_at')
        .eq('primary_owner_user_id', authUser.id)
        .eq('is_personal_account', true)
        .maybeSingle();
      
      personalAccount = personalAcc;
    }
    
    return NextResponse.json({
      query: {
        email,
        timestamp: new Date().toISOString(),
      },
      authUser: {
        exists: !!authUser,
        data: authUser ? {
          id: authUser.id,
          email: authUser.email,
          emailConfirmed: !!authUser.email_confirmed_at,
          emailConfirmedAt: authUser.email_confirmed_at,
          createdAt: authUser.created_at,
          lastSignInAt: authUser.last_sign_in_at,
        } : null,
        error: authError?.message || null,
      },
      personalAccount: {
        exists: !!personalAccount,
        data: personalAccount,
      },
      accountMemberships: {
        count: accountMemberships.length,
        data: accountMemberships,
      },
      courseEnrollments: {
        count: courseEnrollments.length,
        data: courseEnrollments,
        error: enrollmentError?.message || null,
      },
      pendingInvitations: {
        teamInvitations: {
          count: teamInvitations?.length || 0,
          data: teamInvitations || [],
        },
        courseInvitations: {
          count: courseInvitations?.length || 0,
          data: courseInvitations || [],
        },
        pendingTokens: {
          count: pendingTokens?.length || 0,
          data: pendingTokens || [],
        },
      },
      summary: {
        userExists: !!authUser,
        hasPersonalAccount: !!personalAccount,
        totalEnrollments: courseEnrollments.length,
        totalMemberships: accountMemberships.length,
        totalPendingInvitations: (teamInvitations?.length || 0) + (courseInvitations?.length || 0) + (pendingTokens?.length || 0),
      },
    });
    
  } catch (error) {
    console.error('Debug user status error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // For quick testing via browser
  const url = new URL(request.url);
  const email = url.searchParams.get('email') || 'evergreentester1@gmail.com';
  
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { 'content-type': 'application/json' }
  }));
}