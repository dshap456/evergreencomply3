import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  const { email, inviteToken } = await request.json();
  
  if (!email || !inviteToken) {
    return NextResponse.json({ error: 'Email and inviteToken required' });
  }
  
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();
  
  console.log('Processing invitation manually for:', email, 'with token:', inviteToken);
  
  // First verify the invitation exists
  const { data: invitation, error: inviteError } = await adminClient
    .from('course_invitations')
    .select('*')
    .eq('email', email)
    .eq('invite_token', inviteToken)
    .single();
  
  if (!invitation || inviteError) {
    return NextResponse.json({ 
      error: 'Invitation not found',
      details: inviteError 
    });
  }
  
  console.log('Found invitation:', invitation);
  
  // Get the user by email using Supabase Admin API
  const { data: { users }, error: userError } = await adminClient.auth.admin.listUsers();
  const userData = users?.find(u => u.email === email);
  
  if (!userData) {
    return NextResponse.json({ 
      error: 'User not found. User needs to sign up first.',
      details: userError,
      searchedEmail: email
    });
  }
  
  console.log('Found user:', userData.id);
  
  // Check if already enrolled
  const { data: existingEnrollment } = await adminClient
    .from('course_enrollments')
    .select('*')
    .eq('user_id', userData.id)
    .eq('course_id', invitation.course_id)
    .single();
  
  if (existingEnrollment) {
    return NextResponse.json({ 
      error: 'User already enrolled in this course',
      enrollment: existingEnrollment 
    });
  }
  
  // Create the enrollment with invited_by field
  const { data: enrollment, error: enrollError } = await adminClient
    .from('course_enrollments')
    .insert({
      user_id: userData.id,
      course_id: invitation.course_id,
      account_id: invitation.account_id,
      invitation_id: invitation.id,
      invited_by: invitation.invited_by,  // Important for team view
      enrolled_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (enrollError) {
    return NextResponse.json({ 
      error: 'Failed to create enrollment',
      details: enrollError 
    });
  }
  
  console.log('Created enrollment:', enrollment);
  
  // Update invitation as accepted
  const { error: updateError } = await adminClient
    .from('course_invitations')
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: userData.id
    })
    .eq('id', invitation.id);
  
  if (updateError) {
    console.error('Failed to update invitation:', updateError);
  }
  
  // Also update the user's name if provided
  if (invitation.invitee_name) {
    const { data: account } = await adminClient
      .from('accounts')
      .select('*')
      .eq('id', userData.id)
      .eq('is_personal_account', true)
      .single();
    
    if (account && (!account.name || account.name === '' || account.name === email.split('@')[0])) {
      await adminClient
        .from('accounts')
        .update({ name: invitation.invitee_name })
        .eq('id', userData.id)
        .eq('is_personal_account', true);
    }
  }
  
  return NextResponse.json({
    success: true,
    enrollment,
    invitation: {
      ...invitation,
      accepted_at: new Date().toISOString()
    }
  });
}