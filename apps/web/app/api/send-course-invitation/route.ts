import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { sendCourseInvitationEmail } from '~/lib/email/resend';

export async function POST(request: Request) {
  try {
    const { name, email, courseId, accountId } = await request.json();
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is account owner
    const { data: account, error: accountError } = await client
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' });
    }

    if (account.primary_owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Only team owners can invite members' });
    }

    // Get course details
    const { data: course, error: courseError } = await client
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' });
    }

    // Check available seats (including pending invitations)
    const { data: seatInfo } = await client
      .from('course_seats')
      .select('total_seats')
      .eq('account_id', accountId)
      .eq('course_id', courseId)
      .single();

    if (!seatInfo) {
      return NextResponse.json({ error: 'No seats found for this course' });
    }

    // Count used seats (enrolled users)
    const { count: usedSeats } = await client
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('course_id', courseId);

    // Count pending invitations
    const { count: pendingInvites } = await client
      .from('course_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('course_id', courseId)
      .is('accepted_at', null);

    const totalUsed = (usedSeats || 0) + (pendingInvites || 0);
    const availableSeats = seatInfo.total_seats - totalUsed;
    
    if (availableSeats <= 0) {
      return NextResponse.json({ error: 'No available seats for this course' });
    }

    // Create invitation with name
    const { data: invitation, error: inviteError } = await client
      .from('course_invitations')
      .insert({
        email,
        invitee_name: name,
        course_id: courseId,
        account_id: accountId,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      if (inviteError.code === '23505') {
        return NextResponse.json({ error: 'An invitation for this email already exists' });
      }
      return NextResponse.json({ error: 'Failed to create invitation' });
    }

    // Store invitation token for magic link resilience
    await client
      .from('pending_invitation_tokens')
      .insert({
        email,
        invitation_token: invitation.invite_token,
        invitation_type: 'course',
      });

    // Send invitation email with name
    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/auth/sign-in?invitation_token=${invitation.invite_token}`;
    
    try {
      await sendCourseInvitationEmail({
        to: email,
        inviteeName: name,
        courseName: course.title,
        teamName: account.name,
        inviteUrl,
      });
      console.log('Invitation email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the invitation if email fails - invitation is still created
    }

    return NextResponse.json({ 
      success: true, 
      invitation,
      availableSeats: availableSeats - 1, // Show updated count
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}