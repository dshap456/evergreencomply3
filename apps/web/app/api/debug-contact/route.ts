import { NextResponse } from 'next/server';
import { sendEmail } from '~/lib/email/resend';

export async function GET() {
  const debug = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      CONTACT_EMAIL: process.env.CONTACT_EMAIL,
      EMAIL_SENDER: process.env.EMAIL_SENDER,
      MAILER_PROVIDER: process.env.MAILER_PROVIDER,
      RESEND_API_KEY: process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 10)}...` : 'NOT SET',
    },
    checks: {
      hasContactEmail: !!process.env.CONTACT_EMAIL,
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyFormat: process.env.RESEND_API_KEY?.startsWith('re_') ? 'Valid format' : 'Invalid format',
    },
    resendLibrary: {
      sendEmailExists: typeof sendEmail === 'function',
    }
  };

  return NextResponse.json(debug, { status: 200 });
}

export async function POST() {
  const results = {
    steps: [] as any[],
    success: false,
    error: null as string | null,
  };

  try {
    // Step 1: Check environment variables
    results.steps.push({
      step: 'Check CONTACT_EMAIL',
      value: process.env.CONTACT_EMAIL,
      success: !!process.env.CONTACT_EMAIL,
    });

    if (!process.env.CONTACT_EMAIL) {
      throw new Error('CONTACT_EMAIL not set');
    }

    results.steps.push({
      step: 'Check RESEND_API_KEY',
      exists: !!process.env.RESEND_API_KEY,
      format: process.env.RESEND_API_KEY?.startsWith('re_') ? 'valid' : 'invalid',
      success: !!process.env.RESEND_API_KEY,
    });

    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not set');
    }

    // Step 2: Try to import sendEmail
    results.steps.push({
      step: 'Import sendEmail',
      success: typeof sendEmail === 'function',
    });

    // Step 3: Try to send a simple test email
    results.steps.push({
      step: 'Attempting to send email',
      to: process.env.CONTACT_EMAIL,
      from: 'Evergreen Comply <onboarding@resend.dev>',
    });

    await sendEmail({
      to: process.env.CONTACT_EMAIL,
      subject: 'Debug Test Email',
      html: '<p>This is a debug test email from the contact form debugging endpoint.</p>',
    });

    results.steps.push({
      step: 'Email sent successfully',
      success: true,
    });

    results.success = true;

  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    results.steps.push({
      step: 'Error occurred',
      error: results.error,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  return NextResponse.json(results, { status: results.success ? 200 : 500 });
}