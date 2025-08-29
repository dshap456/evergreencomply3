import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getMailer } from '@kit/mailers';

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

    // Send invitation email using the app's mailer system
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    // Use course-specific parameter to avoid collision with team invites
    // The auth callback will detect 'course_token' and handle it appropriately
    const inviteUrl = `${baseUrl}/auth/sign-up?course_token=${invitation.invite_token}`;
    
    console.log('=== Course Invitation Email Debug ===');
    console.log('Attempting to send email to:', email);
    console.log('Invite URL:', inviteUrl);
    
    try {
      const mailer = await getMailer();
      // Now using the verified root domain evergreencomply.com
      const primarySender = process.env.EMAIL_SENDER || 'Evergreen Comply <support@evergreencomply.com>';
      const fallbackSender = 'Evergreen Comply <onboarding@resend.dev>';
      
      // We'll try the primary first, then fallback if it fails
      let emailSender = primarySender;
      
      console.log('=== Email Sender Configuration ===');
      console.log('EMAIL_SENDER env:', process.env.EMAIL_SENDER);
      console.log('Using sender:', emailSender);
      
      const subject = `You're invited to join "${course.title}" by ${account.name}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Course Invitation</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 32px; margin-bottom: 24px;">
              <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Course Invitation</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">You've been invited to join a course</p>
            </div>
            
            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <p style="font-size: 16px; margin: 0 0 16px 0;">Hi ${name || 'there'},</p>
              
              <p style="font-size: 16px; margin: 0 0 16px 0;">
                <strong>${account.name}</strong> has invited you to enroll in the course:
              </p>
              
              <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin: 0 0 24px 0;">
                <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0;">${course.title}</h2>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background-color: #3b82f6; color: white; font-size: 16px; font-weight: 500; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 14px; color: #3b82f6; word-break: break-all; margin: 8px 0 0 0;">
                ${inviteUrl}
              </p>
            </div>
            
            <div style="text-align: center; padding: 24px 0;">
              <p style="font-size: 14px; color: #111827; font-weight: 600; margin: 0 0 8px 0;">
                New to Evergreen Comply?
              </p>
              <p style="font-size: 14px; color: #6b7280; margin: 0 0 16px 0;">
                Click the link above to create your account and join the course.
              </p>
              <p style="font-size: 14px; color: #111827; font-weight: 600; margin: 16px 0 8px 0;">
                Already have an account?
              </p>
              <p style="font-size: 14px; color: #6b7280; margin: 0;">
                Sign in with your existing account to accept the invitation.
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin: 16px 0 0 0;">
                This invitation will expire in 30 days.
              </p>
            </div>
          </body>
        </html>
      `;
      
      const text = `${account.name} has invited you to join the course "${course.title}".

Accept your invitation here: ${inviteUrl}

This invitation will expire in 30 days.`;

      // Try with configured sender first
      let emailSent = false;
      let lastError = null;
      
      try {
        await mailer.sendEmail({
          from: emailSender,
          to: email,
          subject,
          html,
        });
        emailSent = true;
      } catch (firstError) {
        console.log('Primary sender failed:', firstError);
        lastError = firstError;
        
        // If domain not verified, try with fallback
        if (emailSender !== fallbackSender && 
            firstError instanceof Error && 
            firstError.message.includes('domain is not verified')) {
          console.log('Trying fallback sender:', fallbackSender);
          
          try {
            await mailer.sendEmail({
              from: fallbackSender,
              to: email,
              subject,
              html,
            });
            emailSent = true;
            console.log('✅ Email sent with fallback sender');
          } catch (fallbackError) {
            lastError = fallbackError;
          }
        }
      }
      
      if (!emailSent) {
        throw lastError;
      }
      
      console.log('✅ Invitation email sent successfully to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', emailError);
      console.error('Email error details:', {
        message: emailError instanceof Error ? emailError.message : 'Unknown error',
        stack: emailError instanceof Error ? emailError.stack : undefined,
      });
      // Return error to client so they know email failed
      return NextResponse.json({ 
        success: true, // Invitation was created
        invitation,
        availableSeats: availableSeats - 1,
        warning: 'Invitation created but email could not be sent. Please share the invitation link manually.',
        emailError: emailError instanceof Error ? emailError.message : 'Email sending failed'
      });
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