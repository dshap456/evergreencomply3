import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }

    // Use admin client to bypass RLS
    const adminClient = getSupabaseServerAdminClient();

    // Fetch invitation details
    const { data: invitation, error } = await adminClient
      .from('course_invitations')
      .select(`
        id,
        course_id,
        account_id,
        email,
        invitee_name,
        expires_at,
        accepted_at,
        courses!inner (
          title
        ),
        accounts!inner (
          name
        )
      `)
      .eq('invite_token', token)
      .single();

    if (error || !invitation) {
      console.error('Invitation fetch error:', {
        token,
        error,
        query: 'course_invitations with invite_token',
      });
      
      // Try to provide more specific error message
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Invitation not found. The link may be invalid or the invitation may have been deleted.' 
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Invalid or expired invitation',
        debug: process.env.NODE_ENV === 'development' ? { token, errorCode: error?.code } : undefined
      }, { status: 404 });
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 400 });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 });
    }

    // Return invitation details
    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        course_id: invitation.course_id,
        account_id: invitation.account_id,
        email: invitation.email,
        invitee_name: invitation.invitee_name,
        course: invitation.courses,
        account: invitation.accounts
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}