import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  try {
    // Check if Stripe is configured
    const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
    const hasPublishableKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    // Try to initialize Stripe
    let stripeWorks = false;
    let stripeMode = 'unknown';
    let canListPrices = false;
    let priceCheck = {};
    
    if (hasSecretKey) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2025-06-30.basil',
        });
        
        stripeMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'TEST' : 'LIVE';
        stripeWorks = true;
        
        // Try to list prices to verify API key works
        const prices = await stripe.prices.list({ limit: 3 });
        canListPrices = true;
        
        // Check specific price IDs
        const priceIds = [
          'price_1RsDQh97cNCBYOcXZBML0Cwf',
          'price_1RsDev97cNCBYOcX008NiFR8',
          'price_1RsDf697cNCBYOcXkMlo2mPt'
        ];
        
        for (const priceId of priceIds) {
          try {
            const price = await stripe.prices.retrieve(priceId);
            priceCheck[priceId] = {
              exists: true,
              active: price.active,
              product: price.product,
              unit_amount: price.unit_amount
            };
          } catch (e) {
            priceCheck[priceId] = {
              exists: false,
              error: e instanceof Error ? e.message : 'Unknown error'
            };
          }
        }
      } catch (error) {
        stripeWorks = false;
        console.error('Stripe initialization error:', error);
      }
    }
    
    return NextResponse.json({
      status: 'ok',
      stripe: {
        configured: hasSecretKey,
        works: stripeWorks,
        mode: stripeMode,
        canListPrices,
        priceCheck
      },
      environment: {
        hasSecretKey,
        secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 15),
        hasWebhookSecret,
        webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 15),
        hasPublishableKey,
        publishableKeyPrefix: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 15),
      },
      checkout: {
        endpoint: '/api/checkout/training',
        requiresAuth: true,
        supportedCourses: ['dot-hazmat', 'advanced-hazmat', 'epa-rcra']
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}