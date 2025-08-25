import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }
  
  try {
    // Get domains from Resend API
    const domainsResponse = await fetch('https://api.resend.com/domains', {
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
    });
    
    const domains = await domainsResponse.json();
    
    // Test different sender addresses
    const testSenders = [
      'support@evergreencomply.com',
      'support@www.evergreencomply.com',
      'no-reply@evergreencomply.com',
      'no-reply@www.evergreencomply.com',
      'onboarding@resend.dev',
    ];
    
    const senderTests = [];
    
    for (const sender of testSenders) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `Evergreen Comply <${sender}>`,
            to: 'david.alan.shapiro@gmail.com', // Your email for testing
            subject: `Test from ${sender}`,
            html: `<p>Testing sender: ${sender}</p>`,
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          senderTests.push({
            sender,
            success: true,
            messageId: result.id,
          });
        } else {
          const error = await response.text();
          senderTests.push({
            sender,
            success: false,
            error: error.substring(0, 200),
          });
        }
      } catch (error) {
        senderTests.push({
          sender,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return NextResponse.json({
      domains,
      senderTests,
      configuration: {
        EMAIL_SENDER: process.env.EMAIL_SENDER || 'not set',
        MAILER_PROVIDER: process.env.MAILER_PROVIDER || 'not set',
      },
      recommendation: 'Use the sender that shows success: true',
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}