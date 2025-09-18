import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const WORKING_FROM = process.env.EMAIL_SENDER || 'Evergreen Comply <onboarding@resend.dev>';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = WORKING_FROM,
}: SendEmailParams): Promise<{ id: string }> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  try {
    const payload = {
      from,
      to,
      subject,
      html,
      text,
    };

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error('Resend API error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from Resend API');
    }
    return data;
  } catch (error) {
    console.error('=== Resend Error Details ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : error);
    console.error('Full error object:', error);
    console.error('=== End Resend Error ===');
    throw error;
  }
}

// Specific function for course invitations
export async function sendCourseInvitationEmail({
  to,
  inviteeName,
  courseName,
  teamName,
  inviteUrl,
}: {
  to: string;
  inviteeName?: string;
  courseName: string;
  teamName: string;
  inviteUrl: string;
}) {
  const subject = `You're invited to join "${courseName}" by ${teamName}`;

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
          <p style="font-size: 16px; margin: 0 0 16px 0;">Hi ${inviteeName || 'there'},</p>

          <p style="font-size: 16px; margin: 0 0 16px 0;">
            <strong>${teamName}</strong> has invited you to enroll in the course:
          </p>

          <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin: 0 0 24px 0;">
            <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0;">${courseName}</h2>
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
          <p style="font-size: 14px; color: #6b7280; margin: 0;">
            This invitation will expire in 30 days.
          </p>
          <p style="font-size: 14px; color: #6b7280; margin: 8px 0 0 0;">
            If you don't have an account yet, you'll be prompted to create one.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `${teamName} has invited you to join the course "${courseName}".

Accept your invitation here: ${inviteUrl}

This invitation will expire in 30 days.`;

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}

export async function sendCourseEnrollmentEmail({
  to,
  courseName,
  courseUrl,
  signInUrl,
}: {
  to: string;
  courseName: string;
  courseUrl: string;
  signInUrl: string;
}) {
  const subject = `You're enrolled in "${courseName}"`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Course Enrollment</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 32px; margin-bottom: 24px;">
          <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">You're enrolled!</h1>
          <p style="color: #6b7280; font-size: 16px; margin: 0;">Access your course any time</p>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <p style="font-size: 16px; margin: 0 0 16px 0;">Hi there,</p>

          <p style="font-size: 16px; margin: 0 0 16px 0;">
            You've been enrolled in <strong>${courseName}</strong>. Click the button below to go straight to your course dashboard.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${courseUrl}" style="display: inline-block; background-color: #047857; color: white; font-size: 16px; font-weight: 500; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
              Access Course
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0;">
            You'll be asked to sign in if you're not already. Use the link below to sign in directly:
          </p>
          <p style="font-size: 14px; color: #3b82f6; word-break: break-all; margin: 8px 0 0 0;">
            ${signInUrl}
          </p>
        </div>

        <div style="text-align: center; padding: 24px 0;">
          <p style="font-size: 14px; color: #6b7280; margin: 0;">
            Need help? Reply to this email and our team will assist you.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `You've been enrolled in "${courseName}".

Access your course: ${courseUrl}
Sign in if prompted: ${signInUrl}`;

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}
