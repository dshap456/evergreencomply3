import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const adminClient = getSupabaseServerAdminClient();
  
  // Get the latest course invitation
  const { data: latestInvitation } = await adminClient
    .from('course_invitations')
    .select('*')
    .eq('email', 'evergreentester1@gmail.com')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  // Get all pending tokens for this email
  const { data: pendingTokens } = await adminClient
    .from('pending_invitation_tokens')
    .select('*')
    .eq('email', 'evergreentester1@gmail.com')
    .order('created_at', { ascending: false });
  
  // Check if ANY of the pending tokens match the invitation token
  const matchingToken = pendingTokens?.find(
    pt => pt.invitation_token === latestInvitation?.invite_token
  );
  
  // Try to manually insert the correct token
  let insertResult = null;
  if (latestInvitation && !matchingToken) {
    const { data, error } = await adminClient
      .from('pending_invitation_tokens')
      .insert({
        email: 'evergreentester1@gmail.com',
        invitation_token: latestInvitation.invite_token,
        invitation_type: 'course'
      })
      .select()
      .single();
    
    insertResult = { data, error };
  }
  
  return NextResponse.json({
    latestInvitation: {
      id: latestInvitation?.id,
      email: latestInvitation?.email,
      invite_token: latestInvitation?.invite_token,
      invite_token_type: typeof latestInvitation?.invite_token,
      created_at: latestInvitation?.created_at
    },
    pendingTokens: pendingTokens?.map(pt => ({
      id: pt.id,
      invitation_token: pt.invitation_token,
      token_type: typeof pt.invitation_token,
      created_at: pt.created_at
    })),
    tokenMatch: {
      hasMatch: !!matchingToken,
      matchingToken
    },
    insertAttempt: insertResult,
    analysis: {
      problem: 'The invitation_token column in pending_invitation_tokens is UUID type but invite_token in course_invitations is VARCHAR',
      consequence: 'Type mismatch may cause tokens to be stored incorrectly or not match during lookup'
    }
  });
}