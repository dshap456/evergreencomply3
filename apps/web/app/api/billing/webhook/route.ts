// VERSION 2.0 - Clean webhook without orders table
// Last updated: 2025-08-09 19:48 UTC
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import Stripe from 'stripe';

// Course purchase webhook - NO orders table dependency
const COURSE_PRODUCT_MAPPING = {
  'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat',
  'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',
  'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',
} as const;

export async function POST(request: NextRequest) {
  console.log('[Course Webhook] Starting fresh webhook handler...');
  
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
    
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
      console.error('[Course Webhook] Signature failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    console.log('[Course Webhook] Event type:', event.type);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('[Course Webhook] Session details:', {
        id: session.id,
        client_reference_id: session.client_reference_id,
        metadata: session.metadata,
        customer_email: session.customer_email,
      });
      
      // Check if training purchase
      if (session.metadata?.type !== 'training-purchase') {
        console.log('[Course Webhook] Not a training purchase, ignoring');
        return NextResponse.json({ received: true });
      }
      
      console.log('[Course Webhook] Processing training purchase...');
      
      // Get line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      
      for (const item of lineItems.data) {
        const priceId = item.price?.id;
        if (!priceId) continue;
        
        const courseSlug = COURSE_PRODUCT_MAPPING[priceId as keyof typeof COURSE_PRODUCT_MAPPING];
        if (!courseSlug) {
          console.log('[Course Webhook] Unknown price:', priceId);
          continue;
        }
        
        const accountId = session.client_reference_id;
        if (!accountId) {
          console.error('[Course Webhook] NO CLIENT_REFERENCE_ID!');
          continue;
        }
        
        console.log('[Course Webhook] Creating enrollment for:', {
          courseSlug,
          accountId,
          quantity: item.quantity,
        });
        
        const adminClient = getSupabaseServerAdminClient();
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
        
        console.log('[Course Webhook] Enrollment created:', data);
      }
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('[Course Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook failed', details: error }, 
      { status: 500 }
    );
  }
}