import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, courseId, accountId } = body;
    
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Check if user is account owner
    const { data: account, error: accountError } = await client
      .from('accounts')
      .select('primary_owner_user_id')
      .eq('id', accountId)
      .single();

    if (accountError) {
      return NextResponse.json({ error: 'Account error: ' + accountError.message }, { status: 400 });
    }

    if (!account || account.primary_owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not account owner' }, { status: 403 });
    }

    // Check course seats
    const { data: seatInfo, error: seatError } = await client
      .from('course_seats')
      .select('total_seats')
      .eq('account_id', accountId)
      .eq('course_id', courseId)
      .single();

    if (seatError) {
      return NextResponse.json({ error: 'Seat error: ' + seatError.message }, { status: 400 });
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await client
      .from('course_invitations')
      .insert({
        email,
        course_id: courseId,
        account_id: accountId,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      return NextResponse.json({ error: 'Invite error: ' + inviteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, invitation });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Server error: ' + (error as Error).message }, { status: 500 });
  }
}