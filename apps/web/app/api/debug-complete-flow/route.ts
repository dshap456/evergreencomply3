import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const adminClient = getSupabaseServerAdminClient();
  const email = 'evergreentester1@gmail.com';
  
  // 1. Check if user exists
  const { data: authUser } = await adminClient
    .auth.admin.listUsers();
  
  const user = authUser?.users?.find(u => u.email === email);
  
  // 2. Get the invitation
  const { data: invitation } = await adminClient
    .from('course_invitations')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  // 3. Check enrollments
  let enrollments = null;
  if (user) {
    const { data } = await adminClient
      .from('course_enrollments')
      .select(`
        *,
        courses (
          id,
          title,
          slug
        )
      `)
      .eq('user_id', user.id);
    enrollments = data;
  }
  
  // 4. Check if the invitation is accepted
  const invitationStatus = {
    exists: !!invitation,
    accepted: invitation?.accepted_at !== null,
    acceptedBy: invitation?.accepted_by,
    inviteToken: invitation?.invite_token
  };
  
  // 5. Check pending tokens
  const { data: pendingTokens } = await adminClient
    .from('pending_invitation_tokens')
    .select('*')
    .eq('email', email)
    .eq('processed_at', null);
  
  // 6. If user exists but no enrollment, try to process
  let processingAttempt = null;
  if (user && invitation && !invitation.accepted_at && invitation.invite_token) {
    const { data: result, error } = await adminClient.rpc('process_pending_course_invitation', {
      p_user_email: email
    });
    processingAttempt = { result, error };
  }
  
  return NextResponse.json({
    user: user ? {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at
    } : 'USER DOES NOT EXIST',
    invitation: invitationStatus,
    enrollments: enrollments || 'No enrollments (user might not exist)',
    pendingTokens: pendingTokens?.length || 0,
    processingAttempt,
    analysis: {
      userExists: !!user,
      hasInvitation: !!invitation,
      invitationAccepted: invitation?.accepted_at !== null,
      hasEnrollments: enrollments && enrollments.length > 0,
      problem: !user ? 'User needs to sign up first' : 
               !enrollments || enrollments.length === 0 ? 'User exists but not enrolled' :
               'User is enrolled'
    }
  });
}