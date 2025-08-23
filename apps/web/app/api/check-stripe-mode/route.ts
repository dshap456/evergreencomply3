import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY!;
    
    const mode = secretKey.startsWith('sk_test_') ? 'TEST MODE' : 'LIVE MODE';
    const keyPrefix = secretKey.substring(0, 7);
    
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-06-30.basil',
    });
    
    // Try to list recent events
    const events = await stripe.events.list({
      limit: 5,
      types: ['checkout.session.completed']
    });
    
    // Try to list webhooks
    let webhookEndpoints;
    try {
      webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    } catch (e) {
      webhookEndpoints = { error: 'Cannot list webhooks with this API key' };
    }
    
    return NextResponse.json({
      stripe_mode: mode,
      key_prefix: keyPrefix,
      recent_checkout_events: events.data.map(e => ({
        id: e.id,
        created: new Date(e.created * 1000).toISOString(),
        livemode: e.livemode
      })),
      webhook_endpoints: webhookEndpoints.error || webhookEndpoints.data?.map(w => ({
        url: w.url,
        enabled: w.enabled_events.includes('checkout.session.completed')
      })),
      instructions: mode === 'TEST MODE' 
        ? 'You are using TEST keys but your webhook might be configured for LIVE mode!' 
        : 'You are using LIVE keys - make sure you are making real purchases, not test purchases.'
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check Stripe mode',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}