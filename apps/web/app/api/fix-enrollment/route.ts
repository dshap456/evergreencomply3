import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST() {
  const adminClient = getSupabaseServerAdminClient();
  
  // Get the invitation details
  const { data: invitation } = await adminClient
    .from('course_invitations')
    .select('*')
    .eq('email', 'shappy18@yahoo.com')
    .eq('invite_token', '0725da15-68fc-4a0c-b07b-7eeb5aa4fc97')
    .single();
  
  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' });
  }
  
  // Update the enrollment to have the correct invited_by field
  const { data: updated, error } = await adminClient
    .from('course_enrollments')
    .update({
      invited_by: invitation.invited_by,
    })
    .eq('invitation_id', invitation.id)
    .select();
  
  if (error) {
    return NextResponse.json({ error: 'Failed to update', details: error });
  }
  
  // Also ensure the invitation is marked as accepted
  await adminClient
    .from('course_invitations')
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: '07496e33-274a-4034-9082-499d90599822' // shappy18's user ID
    })
    .eq('id', invitation.id);
  
  return NextResponse.json({
    success: true,
    updated,
    invitation
  });
}