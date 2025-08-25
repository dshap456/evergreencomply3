import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET(request: NextRequest) {
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();
  
  // Try to get user from regular client first
  const { data: { user }, error: userError } = await client.auth.getUser();
  
  // Also accept email as query param for debugging
  const searchParams = request.nextUrl.searchParams;
  const debugEmail = searchParams.get('email');
  
  if (!user && !debugEmail) {
    return NextResponse.json({ 
      error: 'Not authenticated', 
      note: 'You can also pass ?email=user@example.com to debug a specific user'
    });
  }
  
  const userEmail = user?.email || debugEmail;
  const userId = user?.id;
  
  // Check course invitations using admin client
  const { data: invitations } = await adminClient
    .from('course_invitations')
    .select('*')
    .eq('email', userEmail);
  
  // Check pending invitation tokens
  const { data: pendingTokens } = await adminClient
    .from('pending_invitation_tokens')
    .select('*')
    .eq('email', userEmail);
  
  // Check course enrollments
  let enrollments = null;
  if (userId) {
    const { data } = await adminClient
      .from('course_enrollments')
      .select(`
        *,
        courses (
          title,
          slug
        )
      `)
      .eq('user_id', userId);
    enrollments = data;
  }
  
  // If we have a user ID, also look up by user ID
  if (!enrollments && userEmail) {
    // Try to find user by email
    const { data: userData } = await adminClient
      .from('accounts')
      .select('id')
      .eq('email', userEmail)
      .single();
    
    if (userData) {
      const { data } = await adminClient
        .from('course_enrollments')
        .select(`
          *,
          courses (
            title,
            slug
          )
        `)
        .eq('user_id', userData.id);
      enrollments = data;
    }
  }
  
  // Check course seats for any teams
  let accounts = null;
  if (userId) {
    const { data } = await adminClient
      .from('accounts')
      .select('*')
      .eq('primary_owner_user_id', userId);
    accounts = data;
  }
  
  let teamSeats = null;
  if (accounts && accounts.length > 0) {
    const { data: seats } = await adminClient
      .from('course_seats')
      .select(`
        *,
        courses (
          title,
          slug
        )
      `)
      .in('account_id', accounts.map(a => a.id));
    
    teamSeats = seats;
  }
  
  return NextResponse.json({
    user: {
      id: userId || 'not found',
      email: userEmail,
    },
    invitations,
    pendingTokens,
    enrollments,
    accounts,
    teamSeats,
    debug: {
      authenticated: !!user,
      usingEmail: debugEmail || user?.email,
    }
  }, { status: 200 });
}