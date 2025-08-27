import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const adminClient = getSupabaseServerAdminClient();
    
    console.log('=== DEBUGGING NEW INVITATION FLOW ===');
    console.log('Email:', email);
    
    // 1. Check if user exists
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const user = authUsers?.users?.find(u => u.email === email);
    
    // 2. Get the invitation
    const { data: invitation } = await adminClient
      .from('course_invitations')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    // 3. Check pending tokens
    const { data: pendingTokens } = await adminClient
      .from('pending_invitation_tokens')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });
    
    // 4. Check if token matches
    const tokenMatch = pendingTokens?.find(pt => pt.invitation_token === invitation?.invite_token);
    
    // 5. Check enrollments if user exists
    let enrollments = null;
    if (user) {
      const { data } = await adminClient
        .from('course_enrollments')
        .select(`
          *,
          courses (title, slug)
        `)
        .eq('user_id', user.id);
      enrollments = data;
    }
    
    // 6. Try to process if user exists but not enrolled
    let processingAttempt = null;
    if (user && invitation && !enrollments?.length) {
      console.log('Attempting to process invitation...');
      
      // Try email-based processing
      const { data: result1, error: error1 } = await adminClient.rpc('process_pending_course_invitation', {
        p_user_email: email
      });
      
      // Try token-based processing if email-based fails
      let result2 = null;
      let error2 = null;
      if (!result1?.success && invitation.invite_token) {
        const response = await adminClient.rpc('process_pending_course_invitation_by_token', {
          p_user_id: user.id,
          p_invitation_token: invitation.invite_token
        });
        result2 = response.data;
        error2 = response.error;
      }
      
      processingAttempt = {
        emailBased: { result: result1, error: error1 },
        tokenBased: { result: result2, error: error2 }
      };
    }
    
    // 7. Check auth callback logs
    const callbackIssues = [];
    
    // Check if user signed up with different email
    if (user && user.email !== email) {
      callbackIssues.push(`User signed up with different email: ${user.email} instead of ${email}`);
    }
    
    // Check if invitation email matches
    if (invitation && invitation.email !== email) {
      callbackIssues.push(`Invitation email mismatch: ${invitation.email} vs ${email}`);
    }
    
    // Check token storage
    if (invitation && !tokenMatch) {
      callbackIssues.push('Token not found in pending_invitation_tokens - callback might not have stored it');
    }
    
    return NextResponse.json({
      debugInfo: {
        userExists: !!user,
        userId: user?.id,
        userEmail: user?.email,
        userCreatedAt: user?.created_at,
        lastSignIn: user?.last_sign_in_at
      },
      invitation: {
        exists: !!invitation,
        id: invitation?.id,
        email: invitation?.email,
        inviteToken: invitation?.invite_token,
        accepted: invitation?.accepted_at !== null,
        courseId: invitation?.course_id
      },
      pendingTokens: {
        count: pendingTokens?.length || 0,
        hasMatchingToken: !!tokenMatch,
        tokens: pendingTokens?.map(pt => ({
          token: pt.invitation_token,
          matches: pt.invitation_token === invitation?.invite_token,
          processedAt: pt.processed_at
        }))
      },
      enrollments: {
        count: enrollments?.length || 0,
        courses: enrollments?.map(e => e.courses?.title)
      },
      processingAttempt,
      callbackIssues,
      diagnosis: getDiagnosis(user, invitation, tokenMatch, enrollments)
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

function getDiagnosis(user: any, invitation: any, tokenMatch: any, enrollments: any) {
  if (!user) {
    return '❌ User has not signed up yet';
  }
  
  if (!invitation) {
    return '❌ No invitation found for this email';
  }
  
  if (invitation.accepted_at) {
    return '✅ Invitation was already accepted';
  }
  
  if (!tokenMatch) {
    return '❌ CRITICAL: Token not stored in pending_invitation_tokens - callback route issue';
  }
  
  if (enrollments?.length > 0) {
    return '✅ User is enrolled';
  }
  
  return '❌ User exists, invitation exists, token exists, but enrollment was not created - RPC function issue';
}

export async function GET() {
  return NextResponse.json({
    message: 'Debug new invitation flow',
    usage: 'POST with { "email": "invited-user@example.com" }'
  });
}