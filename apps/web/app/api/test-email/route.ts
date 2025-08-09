import { NextResponse } from 'next/server';
import { getMailer } from '@kit/mailers';

export async function GET() {
  try {
    // Check environment variables
    const config = {
      contactEmail: process.env.CONTACT_EMAIL,
      emailSender: process.env.EMAIL_SENDER,
      mailerProvider: process.env.MAILER_PROVIDER,
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyLength: process.env.RESEND_API_KEY?.length,
    };

    // Try to get the mailer
    let mailerStatus = 'Not initialized';
    try {
      const mailer = await getMailer();
      mailerStatus = 'Successfully initialized';
    } catch (error) {
      mailerStatus = `Failed to initialize: ${error}`;
    }

    return NextResponse.json({
      success: true,
      config,
      mailerStatus,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const mailer = await getMailer();
    
    // Try to send a test email
    const fromEmail = process.env.EMAIL_SENDER || 'onboarding@resend.dev';
    await mailer.sendEmail({
      to: process.env.CONTACT_EMAIL || 'test@example.com',
      from: `Evergreen Comply <${fromEmail}>`,
      subject: 'Test Email from Contact Form',
      html: '<p>This is a test email to verify the email configuration is working.</p>',
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}