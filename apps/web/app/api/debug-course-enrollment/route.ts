import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET() {
  const client = getSupabaseServerClient();
  
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' });
  }
  
  // Check course invitations
  const { data: invitations } = await client
    .from('course_invitations')
    .select('*')
    .eq('email', user.email);
  
  // Check pending invitation tokens
  const { data: pendingTokens } = await client
    .from('pending_invitation_tokens')
    .select('*')
    .eq('email', user.email);
  
  // Check course enrollments
  const { data: enrollments } = await client
    .from('course_enrollments')
    .select(`
      *,
      courses (
        title,
        slug
      )
    `)
    .eq('user_id', user.id);
  
  // Check course seats for any teams
  const { data: accounts } = await client
    .from('accounts')
    .select('*')
    .eq('primary_owner_user_id', user.id);
  
  let teamSeats = null;
  if (accounts && accounts.length > 0) {
    const { data: seats } = await client
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
      id: user.id,
      email: user.email,
    },
    invitations,
    pendingTokens,
    enrollments,
    accounts,
    teamSeats,
  }, { status: 200 });
}