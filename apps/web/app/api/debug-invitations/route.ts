import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    
    // Get current user
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get all invitations (admin view)
    const { data: allInvitations, error: allError } = await adminClient
      .from('course_invitations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Get invitations for user's accounts
    const { data: userAccounts } = await client
      .from('accounts_memberships')
      .select('account_id')
      .eq('user_id', user.id);
    
    const accountIds = userAccounts?.map(a => a.account_id) || [];
    
    const { data: userInvitations } = await client
      .from('course_invitations')
      .select('*')
      .in('account_id', accountIds)
      .is('accepted_at', null);
    
    // Check pending tokens
    const { data: pendingTokens } = await adminClient
      .from('pending_invitation_tokens')
      .select('*')
      .eq('invitation_type', 'course')
      .limit(20);
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      stats: {
        totalInvitations: allInvitations?.length || 0,
        userInvitations: userInvitations?.length || 0,
        pendingTokens: pendingTokens?.length || 0,
      },
      recentInvitations: allInvitations?.slice(0, 5).map(inv => ({
        id: inv.id,
        email: inv.email,
        invitee_name: inv.invitee_name,
        course_id: inv.course_id,
        account_id: inv.account_id,
        invited_by: inv.invited_by,
        created_at: inv.created_at,
        accepted_at: inv.accepted_at,
        expires_at: inv.expires_at,
      })),
      userAccountInvitations: userInvitations,
      pendingTokens: pendingTokens?.slice(0, 5),
      error: allError?.message,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}