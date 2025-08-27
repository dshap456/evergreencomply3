import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const adminClient = getSupabaseServerAdminClient();
    
    // Get the user
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const user = authUsers?.users?.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found. They need to sign up first.' });
    }
    
    // Get their invitation (remove accepted_at filter to debug)
    const { data: invitation } = await adminClient
      .from('course_invitations')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!invitation) {
      return NextResponse.json({ error: 'No invitation found at all' });
    }
    
    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json({ 
        message: 'Invitation was already accepted',
        invitation 
      });
    }
    
    // Check if already enrolled
    const { data: existingEnrollment } = await adminClient
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', invitation.course_id)
      .single();
    
    if (existingEnrollment) {
      return NextResponse.json({ 
        message: 'User is already enrolled',
        enrollment: existingEnrollment 
      });
    }
    
    // Manually create the enrollment
    const { data: enrollment, error: enrollError } = await adminClient
      .from('course_enrollments')
      .insert({
        user_id: user.id,
        course_id: invitation.course_id,
        account_id: invitation.account_id,
        invitation_id: invitation.id,
        invited_by: invitation.invited_by,
        enrolled_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (enrollError) {
      return NextResponse.json({ 
        error: 'Failed to create enrollment',
        details: enrollError 
      });
    }
    
    // Mark invitation as accepted
    await adminClient
      .from('course_invitations')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: user.id
      })
      .eq('id', invitation.id);
    
    // Mark tokens as processed
    await adminClient
      .from('pending_invitation_tokens')
      .update({
        processed_at: new Date().toISOString()
      })
      .eq('email', email)
      .eq('invitation_token', invitation.invite_token);
    
    // Get course details
    const { data: course } = await adminClient
      .from('courses')
      .select('title, slug')
      .eq('id', invitation.course_id)
      .single();
    
    return NextResponse.json({
      success: true,
      message: 'Invitation processed successfully',
      enrollment,
      course,
      user: {
        id: user.id,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Manual process error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with { "email": "user@example.com" } to manually process their invitation'
  });
}