import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { sendEmail } from '@kit/email/server';

export async function POST(request: Request) {
  try {
    const { email, courseId, accountId } = await request.json();
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
      if (inviteError.code === '23505') {
        return NextResponse.json({ error: 'An invitation for this email already exists' });
      }
      return NextResponse.json({ error: 'Failed to create invitation' });
    }

    // Send invitation email
    try {
      const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/courses/invitation?token=${invitation.invite_token}`;
      
      await sendEmail({
        to: email,
        subject: `You're invited to join "${course.title}" by ${account.name}`,
        html: `
          <h2>Course Invitation</h2>
          <p>You've been invited by ${account.name} to enroll in the course "${course.title}".</p>
          <p>Click the link below to accept your invitation:</p>
          <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
          <p>This invitation will expire in 30 days.</p>
          <p>If you don't have an account yet, you'll be prompted to create one.</p>
        `,
        text: `You've been invited by ${account.name} to enroll in the course "${course.title}". 
               Click here to accept: ${inviteUrl}
               This invitation will expire in 30 days.`,
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the whole operation if email fails
      // The invitation is still created and can be resent
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