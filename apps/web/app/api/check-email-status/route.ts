import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    
    const adminClient = getSupabaseServerAdminClient();
    
    // Check recent invitations for this email
    const { data: invitations } = await adminClient
      .from('course_invitations')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Check if there are pending tokens
    const { data: tokens } = await adminClient
      .from('pending_invitation_tokens')
      .select('*')
      .eq('email', email);
    
    // Try to send a test email using Resend API directly
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    let resendTest = null;
    let resendError = null;
    
    if (RESEND_API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Evergreen Comply <onboarding@resend.dev>',
            to: email,
            subject: 'Test Email - Checking Deliverability',
            html: `
              <h2>Test Email</h2>
              <p>This is a test email to check if emails are reaching your inbox.</p>
              <p>If you're seeing this, email delivery is working!</p>
              <p>Sent at: ${new Date().toISOString()}</p>
              <hr>
              <p><small>This is a test from the Evergreen Comply invitation system.</small></p>
            `,
          }),
        });
        
        if (response.ok) {
          resendTest = await response.json();
        } else {
          const errorText = await response.text();
          resendError = `${response.status}: ${errorText}`;
        }
      } catch (error) {
        resendError = error instanceof Error ? error.message : 'Unknown error';
      }
    }
    
    return NextResponse.json({
      email,
      invitations: {
        count: invitations?.length || 0,
        recent: invitations?.map(inv => ({
          id: inv.id,
          created_at: inv.created_at,
          accepted_at: inv.accepted_at,
          expires_at: inv.expires_at,
        })),
      },
      pendingTokens: {
        count: tokens?.length || 0,
        tokens: tokens?.map(t => ({
          created_at: t.created_at,
          invitation_type: t.invitation_type,
        })),
      },
      emailTest: {
        sent: !!resendTest,
        messageId: resendTest?.id,
        error: resendError,
      },
      configuration: {
        resendConfigured: !!RESEND_API_KEY,
        emailSender: process.env.EMAIL_SENDER || 'not set',
        mailerProvider: process.env.MAILER_PROVIDER || 'nodemailer (default)',
      },
      deliverabilityTips: [
        'Check spam/junk folder',
        'Whitelist onboarding@resend.dev',
        'For Gmail: Check Promotions tab',
        'For corporate email: Check with IT about email filtering',
      ],
    });
    
  } catch (error) {
    console.error('Check email status error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}