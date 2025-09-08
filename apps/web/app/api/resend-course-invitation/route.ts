import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getMailer } from '@kit/mailers';

export async function POST(request: Request) {
  try {
    const { invitationId, accountId } = await request.json();
    const client = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Super admin or account owner only (prefer narrow scope: team owner already checked below)
    const { data: isSuperAdmin } = await client.rpc('is_super_admin');

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
      return NextResponse.json({ error: 'Only team owners can resend invitations' });
    }

    // Get the existing invitation
    const { data: invitation, error: inviteError } = await adminClient
      .from('course_invitations')
      .select(`
        *,
        courses!inner (
          title
        )
      `)
      .eq('id', invitationId)
      .eq('account_id', accountId)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' });
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json({ error: 'This invitation has already been accepted' });
    }

    // Generate a new token and update expiration
    const newToken = crypto.randomUUID();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30); // 30 days from now

    // Update the invitation with new token and expiration
    const { data: updatedInvitation, error: updateError } = await client
      .from('course_invitations')
      .update({
        invite_token: newToken,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update invitation:', updateError);
      return NextResponse.json({ error: 'Failed to update invitation' });
    }

    // Update pending_invitation_tokens if it exists
    await client
      .from('pending_invitation_tokens')
      .delete()
      .eq('email', invitation.email)
      .eq('invitation_type', 'course');

    // Insert new pending token
    await client
      .from('pending_invitation_tokens')
      .insert({
        email: invitation.email,
        invitation_token: newToken,
        invitation_type: 'course',
      });

    // Resend the invitation email
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/auth/sign-up?invite_token=${newToken}`;
    
    console.log('=== Resending Course Invitation ===');
    console.log('Email:', invitation.email);
    console.log('New token:', newToken);
    console.log('Invite URL:', inviteUrl);
    
    try {
      const mailer = await getMailer();
      const primarySender = process.env.EMAIL_SENDER || 'Evergreen Comply <support@evergreencomply.com>';
      const fallbackSender = 'Evergreen Comply <onboarding@resend.dev>';
      
      let emailSender = primarySender;
      
      const subject = `Reminder: You're invited to join "${invitation.courses.title}" by ${account.name}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Course Invitation Reminder</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 32px; margin-bottom: 24px;">
              <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Course Invitation Reminder</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">Your invitation has been resent</p>
            </div>
            
            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <p style="font-size: 16px; margin: 0 0 16px 0;">Hi ${invitation.invitee_name || 'there'},</p>
              
              <p style="font-size: 16px; margin: 0 0 16px 0;">
                This is a reminder that <strong>${account.name}</strong> has invited you to enroll in the course:
              </p>
              
              <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin: 0 0 24px 0;">
                <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0;">${invitation.courses.title}</h2>
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
      
      // Try with configured sender first
      let emailSent = false;
      let lastError = null;
      
      try {
        await mailer.sendEmail({
          from: emailSender,
          to: invitation.email,
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
              to: invitation.email,
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
      
      console.log('✅ Invitation email resent successfully to:', invitation.email);
    } catch (emailError) {
      console.error('❌ Failed to resend invitation email:', emailError);
      // Still return success since the invitation was updated
      return NextResponse.json({ 
        success: true, 
        invitation: updatedInvitation,
        warning: 'Invitation updated but email could not be sent. Please share the invitation link manually.',
        emailError: emailError instanceof Error ? emailError.message : 'Email sending failed'
      });
    }

    return NextResponse.json({ 
      success: true, 
      invitation: updatedInvitation,
      message: 'Invitation resent successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
