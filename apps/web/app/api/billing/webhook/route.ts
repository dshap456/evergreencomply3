import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import Stripe from 'stripe';

const COURSE_PRODUCT_MAPPING = {
  'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat',
  'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',
  'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',
} as const;

export async function POST(request: NextRequest) {
  console.log('[Webhook] Received webhook request');
  
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('[Webhook] Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    console.log('[Webhook] Event type:', event.type);
    
    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('[Webhook] Session metadata:', session.metadata);
      console.log('[Webhook] Client reference ID:', session.client_reference_id);
      
      // Check if this is a training purchase
      if (session.metadata?.type === 'training-purchase') {
        console.log('[Webhook] Processing training purchase...');
        await handleCoursePurchase(session);
      } else {
        console.log('[Webhook] Not a training purchase, skipping course processing');
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}

async function handleCoursePurchase(session: Stripe.Checkout.Session) {
  console.log('[Course Purchase] Starting processing...');
  const adminClient = getSupabaseServerAdminClient();
  
  console.log('[Course Purchase] Session details:', {
    sessionId: session.id,
    accountId: session.client_reference_id,
    metadata: session.metadata,
    amountTotal: session.amount_total,
    currency: session.currency,
    paymentStatus: session.payment_status,
  });

  try {
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    // Get line items
    console.log('[Course Purchase] Fetching line items...');
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    console.log('[Course Purchase] Line items count:', lineItems.data.length);

    for (const item of lineItems.data) {
      const priceId = item.price?.id;
      console.log('[Course Purchase] Processing line item:', {
        priceId,
        quantity: item.quantity,
        description: item.description,
      });
      
      if (!priceId) {
        console.warn('[Course Purchase] No price ID for line item');
        continue;
      }

      // Get the course product ID from the price mapping
      const productId = COURSE_PRODUCT_MAPPING[priceId as keyof typeof COURSE_PRODUCT_MAPPING];
      if (!productId) {
        console.log('[Course Purchase] Price ID not in course mapping:', priceId);
        continue;
      }

      const quantity = item.quantity || 1;
      const accountId = session.client_reference_id;
      
      if (!accountId) {
        console.error('[Course Purchase] No client_reference_id in session - cannot process!');
        continue;
      }

      console.log('[Course Purchase] Calling process_course_purchase with:', {
        productId,
        accountId,
        quantity,
        sessionId: session.id,
      });

      // Call the database function to process the purchase
      const { data, error } = await adminClient.rpc('process_course_purchase', {
        p_product_id: productId,
        p_account_id: accountId,
        p_payment_id: session.id,
        p_quantity: quantity,
      });

      if (error) {
        console.error('[Course Purchase] Database error:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else {
        console.log('[Course Purchase] Success! Result:', data);
      }
    }
  } catch (error) {
    console.error('[Course Purchase] Unexpected error:', error);
    throw error; // Re-throw to ensure webhook returns error status
  }
}