import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
  try {
    const { invitationId, accountId } = await request.json();
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is account owner or has permission
    const { data: account, error: accountError } = await client
      .from('accounts')
      .select('primary_owner_user_id')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.primary_owner_user_id !== user.id) {
      // Check if user has admin role
      const { data: membership } = await client
        .from('accounts_memberships')
        .select('account_role')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .single();

      if (!membership || membership.account_role !== 'owner') {
        return NextResponse.json({ error: 'Only team owners can cancel invitations' }, { status: 403 });
      }
    }

    // First get the invitation to extract the token
    const { data: invitation, error: fetchError } = await client
      .from('course_invitations')
      .select('email, invite_token')
      .eq('id', invitationId)
      .eq('account_id', accountId)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Delete the invitation
    const { error: deleteError } = await client
      .from('course_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('account_id', accountId); // Extra safety check

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError);
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
    }

    // Also remove from pending_invitation_tokens if exists
    if (invitation.invite_token) {
      await client
        .from('pending_invitation_tokens')
        .delete()
        .eq('invitation_token', invitation.invite_token);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}