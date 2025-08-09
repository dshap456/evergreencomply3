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
    const fromEmail = process.env.EMAIL_SENDER || 'support@evergreencomply.com';
    results.steps.push({
      step: 'Attempting to send email',
      to: process.env.CONTACT_EMAIL,
      from: fromEmail,
    });

    await sendEmail({
      to: process.env.CONTACT_EMAIL,
      from: fromEmail,
      subject: 'Debug Test Email',
      html: '<p>This is a debug test email from the contact form debugging endpoint.</p>',
    });

    results.steps.push({
      step: 'Email sent successfully',
      success: true,
    });

    results.success = true;

  } catch (error) {
    let errorDetails = {
      message: 'Unknown error',
      type: 'unknown',
      fullError: null as any,
    };

    if (error instanceof Error) {
      errorDetails = {
        message: error.message,
        type: error.constructor.name,
        fullError: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      };
    } else if (typeof error === 'object' && error !== null) {
      errorDetails = {
        message: JSON.stringify(error),
        type: 'object',
        fullError: error,
      };
    } else {
      errorDetails = {
        message: String(error),
        type: typeof error,
        fullError: error,
      };
    }

    results.error = errorDetails.message;
    results.steps.push({
      step: 'Error occurred',
      error: errorDetails,
    });
  }

  return NextResponse.json(results, { status: results.success ? 200 : 500 });
}