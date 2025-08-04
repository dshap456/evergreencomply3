import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if Stripe secret key is set
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    const keyPrefix = process.env.STRIPE_SECRET_KEY?.substring(0, 7);
    
    // Check billing provider
    const billingProvider = process.env.NEXT_PUBLIC_BILLING_PROVIDER;
    
    return NextResponse.json({
      hasStripeKey,
      keyPrefix, // Should be "sk_live" for live keys
      billingProvider,
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}