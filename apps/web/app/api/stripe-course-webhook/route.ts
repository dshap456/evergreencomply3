import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import Stripe from 'stripe';

// Completely standalone webhook for course purchases only
// This doesn't use any of the kit's billing infrastructure

const COURSE_PRODUCT_MAPPING = {
  'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat',
  'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',
  'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',
} as const;

export async function POST(request: NextRequest) {
  console.log('[Course Webhook] Starting...');
  
  try {
    // Get raw body and signature
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('[Course Webhook] No signature');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
    
    // Verify with Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('[Course Webhook] Invalid signature:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    console.log('[Course Webhook] Event:', event.type);
    
    // Only handle checkout completed
    if (event.type !== 'checkout.session.completed') {
      console.log('[Course Webhook] Ignoring non-checkout event');
      return NextResponse.json({ received: true });
    }
    
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Only handle training purchases
    if (session.metadata?.type !== 'training-purchase') {
      console.log('[Course Webhook] Not a training purchase');
      return NextResponse.json({ received: true });
    }
    
    console.log('[Course Webhook] Processing training purchase');
    console.log('[Course Webhook] Session ID:', session.id);
    console.log('[Course Webhook] Client Reference ID:', session.client_reference_id);
    console.log('[Course Webhook] Customer Email:', session.customer_email);
    
    // Process the purchase
    const adminClient = getSupabaseServerAdminClient();
    
    try {
      // Get line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      console.log('[Course Webhook] Line items:', lineItems.data.length);
      
      for (const item of lineItems.data) {
        const priceId = item.price?.id;
        if (!priceId) continue;
        
        const courseSlug = COURSE_PRODUCT_MAPPING[priceId as keyof typeof COURSE_PRODUCT_MAPPING];
        if (!courseSlug) {
          console.log('[Course Webhook] Unknown price:', priceId);
          continue;
        }
        
        console.log('[Course Webhook] Processing course:', courseSlug);
        
        // Get the user account ID
        const accountId = session.client_reference_id;
        if (!accountId) {
          console.error('[Course Webhook] No client_reference_id!');
          continue;
        }
        
        // Process the purchase
        const { data, error } = await adminClient.rpc('process_course_purchase', {
          p_product_id: courseSlug,
          p_account_id: accountId,
          p_payment_id: session.id,
          p_quantity: item.quantity || 1,
        });
        
        if (error) {
          console.error('[Course Webhook] Database error:', error);
          throw error;
        }
        
        console.log('[Course Webhook] Success:', data);
      }
      
      return NextResponse.json({ received: true });
      
    } catch (dbError) {
      console.error('[Course Webhook] Processing failed:', dbError);
      // Return 500 so Stripe will retry
      return NextResponse.json(
        { error: 'Processing failed', details: dbError }, 
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('[Course Webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Webhook failed', details: error }, 
      { status: 500 }
    );
  }
}