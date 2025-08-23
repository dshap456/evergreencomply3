import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Debug webhook to log everything Stripe sends
export async function POST(request: NextRequest) {
  console.log('[DEBUG Webhook] ========== START ==========');
  
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    console.log('[DEBUG Webhook] Signature present:', !!signature);
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature!,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('[DEBUG Webhook] Signature validation failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    console.log('[DEBUG Webhook] Event type:', event.type);
    console.log('[DEBUG Webhook] Event ID:', event.id);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('[DEBUG Webhook] Session details:');
      console.log('  - ID:', session.id);
      console.log('  - Client Reference ID:', session.client_reference_id);
      console.log('  - Customer Email:', session.customer_email);
      console.log('  - Metadata:', JSON.stringify(session.metadata, null, 2));
      console.log('  - Mode:', session.mode);
      console.log('  - Payment Status:', session.payment_status);
      
      // Get line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      
      console.log('[DEBUG Webhook] Line items:');
      for (const item of lineItems.data) {
        console.log('  - Product:', item.description);
        console.log('    Price ID:', item.price?.id);
        console.log('    Quantity:', item.quantity);
        console.log('    Amount:', item.amount_total);
      }
      
      // Log what the webhook WOULD do
      const COURSE_PRODUCT_MAPPING = {
        'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat',
        'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',
        'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',
      } as const;
      
      console.log('[DEBUG Webhook] Course mapping check:');
      for (const item of lineItems.data) {
        const priceId = item.price?.id;
        const courseSlug = priceId ? COURSE_PRODUCT_MAPPING[priceId as keyof typeof COURSE_PRODUCT_MAPPING] : null;
        console.log(`  - ${priceId} -> ${courseSlug || 'NOT FOUND IN MAPPING'}`);
      }
    }
    
    console.log('[DEBUG Webhook] ========== END ==========');
    
    return NextResponse.json({ 
      received: true,
      event_type: event.type,
      event_id: event.id
    });
    
  } catch (error) {
    console.error('[DEBUG Webhook] Unexpected error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}