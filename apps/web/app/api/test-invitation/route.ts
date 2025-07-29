import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
  try {
    const { email, courseId, accountId } = await request.json();
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Not authenticated', details: userError }, { status: 401 });
    }

    // Try direct insert into course_invitations
    const { data, error } = await client
      .from('course_invitations')
      .insert({
        email: email,
        course_id: courseId,
        account_id: accountId,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      // Log detailed error info
      console.error('Invitation insert error:', error);
      
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'An invitation for this email already exists for this course',
          details: error 
        });
      }
      
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