import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received invitation request:', body);
    
    const { email, courseId, accountId } = body;
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Not authenticated', details: userError }, { status: 401 });
    }

    // Check if user is account owner
    const { data: account, error: accountError } = await client
      .from('accounts')
      .select('primary_owner_user_id')
      .eq('id', accountId)
      .single();

    console.log('Account check:', { account, accountError });

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found', details: accountError });
    }

    if (account.primary_owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not account owner', userId: user.id, ownerId: account.primary_owner_user_id });
    }

    // Try direct insert
    const { data, error } = await client
      .from('course_invitations')
      .insert({
        email,
        course_id: courseId,
        account_id: accountId,
        invited_by: user.id,
      })
      .select()
      .single();

    console.log('Insert result:', { data, error });

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to create invitation',
        details: error,
        errorCode: error.code,
        errorMessage: error.message
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      invitation: data 
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}