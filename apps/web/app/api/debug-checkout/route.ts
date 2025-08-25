import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check auth status
    const client = getSupabaseServerClient();
    const { data: { session } } = await client.auth.getSession();
    
    // Check environment variables
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    const stripeKeyPrefix = process.env.STRIPE_SECRET_KEY?.substring(0, 7);
    
    // Debug info
    const debugInfo = {
      timestamp: new Date().toISOString(),
      auth: {
        isAuthenticated: !!session,
        userEmail: session?.user?.email || null,
        userId: session?.user?.id || null,
      },
      request: {
        cartItems: body.cartItems,
        accountType: body.accountType,
        accountId: body.accountId,
      },
      environment: {
        hasStripeKey,
        stripeKeyPrefix,
        nodeEnv: process.env.NODE_ENV,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      },
      validation: {
        hasCartItems: !!body.cartItems?.length,
        cartItemsValid: body.cartItems?.every((item: any) => 
          item.courseId && typeof item.quantity === 'number'
        ),
      }
    };
    
    // Try to initialize Stripe
    let stripeError = null;
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-06-30.basil',
      });
      
      // Test Stripe connection
      const prices = await stripe.prices.list({ limit: 1 });
      debugInfo.stripe = {
        connected: true,
        testMode: stripeKeyPrefix?.includes('sk_test'),
        liveMode: stripeKeyPrefix?.includes('sk_live'),
        pricesFound: prices.data.length,
      };
    } catch (error) {
      stripeError = error instanceof Error ? error.message : 'Unknown Stripe error';
      debugInfo.stripe = {
        connected: false,
        error: stripeError,
      };
    }
    
    // Check specific price IDs
    if (!stripeError) {
      const priceIds = [
        'price_1RsDQh97cNCBYOcXZBML0Cwf', // dot-hazmat
        'price_1RsDev97cNCBYOcX008NiFR8', // advanced-hazmat  
        'price_1RsDf697cNCBYOcXkMlo2mPt', // epa-rcra
      ];
      
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-06-30.basil',
      });
      
      const priceChecks = await Promise.all(
        priceIds.map(async (id) => {
          try {
            const price = await stripe.prices.retrieve(id);
            return { id, exists: true, active: price.active };
          } catch (error) {
            return { id, exists: false, error: 'Not found' };
          }
        })
      );
      
      debugInfo.priceValidation = priceChecks;
    }
    
    return NextResponse.json({
      success: true,
      debug: debugInfo,
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Debug checkout endpoint - use POST with cart data',
    expectedBody: {
      cartItems: [{ courseId: 'string', quantity: 'number' }],
      accountType: 'personal | team',
      accountId: 'uuid (optional)',
    }
  });
}