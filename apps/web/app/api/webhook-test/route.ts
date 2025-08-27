import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Test endpoint to verify webhook signature validation
export async function POST(request: NextRequest) {
  console.log('[TEST-WEBHOOK] Received request');
  
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    // Log basic info
    const logData = {
      timestamp: new Date().toISOString(),
      hasBody: !!body,
      bodyLength: body?.length || 0,
      hasSignature: !!signature,
      signaturePrefix: signature?.substring(0, 20) || 'none',
      webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10) || 'none',
    };
    
    console.log('[TEST-WEBHOOK] Request details:', logData);
    
    // Try to parse as JSON to see if it's a Stripe event
    let eventData;
    try {
      eventData = JSON.parse(body);
      logData.eventType = eventData.type;
      logData.eventId = eventData.id;
      logData.isTestMode = eventData.livemode === false;
    } catch (e) {
      logData.jsonParseError = true;
    }
    
    // If we have a signature, try to validate it
    if (signature && process.env.STRIPE_WEBHOOK_SECRET) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-06-30.basil',
      });
      
      try {
        const event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        logData.signatureValid = true;
        logData.verifiedEventType = event.type;
        logData.verifiedEventId = event.id;
        
        // Check if it's a checkout.session.completed event
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as Stripe.Checkout.Session;
          logData.checkoutSession = {
            id: session.id,
            client_reference_id: session.client_reference_id,
            customer_email: session.customer_email,
            metadata: session.metadata,
            payment_status: session.payment_status,
            amount_total: session.amount_total,
          };
        }
      } catch (err: any) {
        logData.signatureValid = false;
        logData.signatureError = err.message;
      }
    }
    
    // Store in a temporary location for debugging
    const debugInfo = {
      ...logData,
      headers: Object.fromEntries(request.headers.entries()),
    };
    
    console.log('[TEST-WEBHOOK] Full debug info:', JSON.stringify(debugInfo, null, 2));
    
    return NextResponse.json({
      success: true,
      debug: debugInfo,
      message: 'Test webhook received. Check Vercel logs for details.',
    });
    
  } catch (error: any) {
    console.error('[TEST-WEBHOOK] Error:', error);
    return NextResponse.json(
      { 
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}