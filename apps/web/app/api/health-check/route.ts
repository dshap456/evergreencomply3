import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Simple health check that also verifies Stripe is importable
  let stripeAvailable = false;
  let stripeConfigured = false;
  
  try {
    // Try to import Stripe
    const Stripe = await import('stripe');
    stripeAvailable = true;
    
    // Check if configured
    stripeConfigured = !!(
      process.env.STRIPE_SECRET_KEY && 
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    );
  } catch (e) {
    stripeAvailable = false;
  }
  
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    stripe: {
      available: stripeAvailable,
      configured: stripeConfigured,
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET && 
                        !process.env.STRIPE_WEBHOOK_SECRET.includes('YOUR_WEBHOOK_SECRET_HERE')
    }
  });
}