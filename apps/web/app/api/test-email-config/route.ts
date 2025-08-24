import { NextRequest, NextResponse } from 'next/server';
import { getMailer } from '@kit/mailers';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }
    
    console.log('=== Email Configuration Test ===');
    console.log('Environment variables:');
    console.log('- MAILER_PROVIDER:', process.env.MAILER_PROVIDER || 'not set (defaults to nodemailer)');
    console.log('- EMAIL_SENDER:', process.env.EMAIL_SENDER || 'not set');
    console.log('- RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'configured' : 'NOT configured');
    console.log('- SMTP_HOST:', process.env.SMTP_HOST || 'not set');
    console.log('- SMTP_PORT:', process.env.SMTP_PORT || 'not set');
    console.log('- SMTP_USER:', process.env.SMTP_USER || 'not set');
    console.log('- SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? 'configured' : 'NOT configured');
    console.log('- NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL || 'not set');
    
    try {
      const mailer = await getMailer();
      console.log('Mailer loaded successfully:', mailer.constructor.name);
      
      const emailSender = process.env.EMAIL_SENDER || 'Test <test@example.com>';
      
      const testEmail = {
        from: emailSender,
        to: email,
        subject: 'Test Email from Course Invitation System',
        html: `
          <h1>Test Email</h1>
          <p>This is a test email to verify the email configuration is working.</p>
          <p>If you received this, the email system is configured correctly!</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `,
        text: `Test Email\n\nThis is a test email to verify the email configuration is working.\n\nTimestamp: ${new Date().toISOString()}`,
      };
      
      console.log('Attempting to send test email to:', email);
      console.log('Email payload:', {
        from: testEmail.from,
        to: testEmail.to,
        subject: testEmail.subject,
      });
      
      const result = await mailer.sendEmail(testEmail);
      
      console.log('✅ Email sent successfully!');
      console.log('Result:', result);
      
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        config: {
          mailerProvider: process.env.MAILER_PROVIDER || 'nodemailer (default)',
          emailSender: emailSender,
          recipient: email,
        },
        result,
      });
      
    } catch (mailerError) {
      console.error('❌ Mailer error:', mailerError);
      
      const errorDetails = {
        message: mailerError instanceof Error ? mailerError.message : 'Unknown error',
        stack: mailerError instanceof Error ? mailerError.stack : undefined,
        name: mailerError instanceof Error ? mailerError.constructor.name : undefined,
      };
      
      // Check for common issues
      let hint = 'Unknown error';
      if (errorDetails.message?.includes('RESEND_API_KEY')) {
        hint = 'RESEND_API_KEY is not configured. Add it to your .env.local file.';
      } else if (errorDetails.message?.includes('SMTP')) {
        hint = 'SMTP configuration issue. Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD.';
      } else if (errorDetails.message?.includes('ECONNREFUSED')) {
        hint = 'Connection refused. Check if your mail server is running.';
      } else if (errorDetails.message?.includes('Invalid login')) {
        hint = 'SMTP authentication failed. Check SMTP_USER and SMTP_PASSWORD.';
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to send test email',
        errorDetails,
        hint,
        config: {
          mailerProvider: process.env.MAILER_PROVIDER || 'nodemailer (default)',
          emailSender: process.env.EMAIL_SENDER || 'not set',
          resendConfigured: !!process.env.RESEND_API_KEY,
          smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_PORT),
        },
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}