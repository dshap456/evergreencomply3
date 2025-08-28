import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

// GET endpoint to test webhook signature verification with a known payload
export async function GET(request: NextRequest) {
  // Create a test payload
  const testPayload = JSON.stringify({
    id: 'evt_test',
    object: 'event',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'cs_test',
        object: 'checkout.session',
        metadata: {
          type: 'training-purchase'
        }
      }
    }
  });
  
  const timestamp = Math.floor(Date.now() / 1000);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    return NextResponse.json({
      error: 'STRIPE_WEBHOOK_SECRET not configured',
      env: {
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: false,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  }
  
  // Generate a valid signature using the webhook secret
  const crypto = require('crypto');
  const signedPayload = `${timestamp}.${testPayload}`;
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret.replace('whsec_', ''))
    .update(signedPayload)
    .digest('hex');
  
  const signature = `t=${timestamp},v1=${expectedSig}`;
  
  // Now try to verify it
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
  });
  
  try {
    const event = stripe.webhooks.constructEvent(
      testPayload,
      signature,
      webhookSecret
    );
    
    return NextResponse.json({
      success: true,
      message: 'Webhook signature verification working!',
      webhookSecret: webhookSecret.substring(0, 20) + '...',
      testEvent: event.type,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: 'Signature verification failed',
      message: err.message,
      webhookSecret: webhookSecret.substring(0, 20) + '...',
      signature: signature.substring(0, 50) + '...',
    });
  }
}

// POST endpoint to test with actual Stripe webhooks
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  const result: any = {
    timestamp: new Date().toISOString(),
    bodyLength: body.length,
    hasSignature: !!signature,
    webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
  };
  
  if (!signature) {
    return NextResponse.json({ ...result, error: 'No signature header' }, { status: 400 });
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ...result, error: 'STRIPE_WEBHOOK_SECRET not configured' }, { status: 500 });
  }
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
  });
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    result.signatureValid = true;
    result.eventType = event.type;
    result.eventId = event.id;
    result.livemode = event.livemode;
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      result.session = {
        id: session.id,
        client_reference_id: session.client_reference_id,
        metadata: session.metadata,
      };
    }
    
    return NextResponse.json(result);
  } catch (err: any) {
    result.signatureValid = false;
    result.error = err.message;
    result.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 20) + '...';
    
    // Return 400 to trigger Stripe retry
    return NextResponse.json(result, { status: 400 });
  }
}