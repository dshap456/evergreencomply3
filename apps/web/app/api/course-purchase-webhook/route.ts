// Clean course purchase webhook - completely isolated
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import Stripe from 'stripe';

const PRICE_TO_COURSE_MAP = {
  'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat',
  'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',
  'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',
} as const;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[COURSE-WEBHOOK] Started at:', new Date().toISOString());
  
  try {
    // 1. Verify signature
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.log('[COURSE-WEBHOOK] No signature provided');
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
      console.log('[COURSE-WEBHOOK] Signature verified');
    } catch (err) {
      console.error('[COURSE-WEBHOOK] Signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    // 2. Only process checkout.session.completed
    console.log('[COURSE-WEBHOOK] Event type:', event.type);
    
    if (event.type !== 'checkout.session.completed') {
      console.log('[COURSE-WEBHOOK] Not a checkout completion, ignoring');
      return NextResponse.json({ received: true });
    }
    
    const session = event.data.object as Stripe.Checkout.Session;
    
    // 3. Log all session data
    console.log('[COURSE-WEBHOOK] Session data:', {
      id: session.id,
      client_reference_id: session.client_reference_id,
      customer_email: session.customer_email,
      metadata: session.metadata,
      payment_status: session.payment_status,
    });
    
    // 4. Check if this is a course purchase (handle both metadata types)
    const isCoursePurchase = session.metadata?.type === 'training-purchase' || 
                            session.metadata?.type === 'course_purchase';
                            
    if (!isCoursePurchase) {
      console.log('[COURSE-WEBHOOK] Not a course purchase, metadata:', session.metadata);
      return NextResponse.json({ received: true });
    }
    
    // 5. Check client_reference_id
    if (!session.client_reference_id) {
      console.error('[COURSE-WEBHOOK] ERROR: No client_reference_id in session!');
      // Still try to process with email fallback
    }
    
    // 6. Get line items
    console.log('[COURSE-WEBHOOK] Fetching line items...');
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    console.log('[COURSE-WEBHOOK] Found', lineItems.data.length, 'line items');
    
    // 7. Process each item
    const adminClient = getSupabaseServerAdminClient();
    
    for (const item of lineItems.data) {
      const priceId = item.price?.id;
      console.log('[COURSE-WEBHOOK] Processing item:', {
        priceId,
        description: item.description,
        quantity: item.quantity,
      });
      
      if (!priceId) continue;
      
      const courseSlug = PRICE_TO_COURSE_MAP[priceId as keyof typeof PRICE_TO_COURSE_MAP];
      if (!courseSlug) {
        console.log('[COURSE-WEBHOOK] Price not mapped to course:', priceId);
        continue;
      }
      
      // Use client_reference_id or try to find user by email
      let accountId = session.client_reference_id;
      
      if (!accountId && session.customer_email) {
        console.log('[COURSE-WEBHOOK] No client_reference_id, trying email lookup:', session.customer_email);
        const { data: user } = await adminClient
          .from('accounts')
          .select('id')
          .eq('email', session.customer_email)
          .eq('is_personal_account', true)
          .single();
          
        if (user) {
          accountId = user.id;
          console.log('[COURSE-WEBHOOK] Found user by email:', accountId);
        }
      }
      
      if (!accountId) {
        console.error('[COURSE-WEBHOOK] ERROR: Cannot determine account ID!');
        continue;
      }
      
      // Process the purchase
      console.log('[COURSE-WEBHOOK] Calling process_course_purchase:', {
        courseSlug,
        accountId,
        sessionId: session.id,
      });
      
      const { data, error } = await adminClient.rpc('process_course_purchase', {
        p_product_id: courseSlug,
        p_account_id: accountId,
        p_payment_id: session.id,
        p_quantity: item.quantity || 1,
      });
      
      if (error) {
        console.error('[COURSE-WEBHOOK] Database error:', {
          error,
          code: error.code,
          message: error.message,
        });
      } else {
        console.log('[COURSE-WEBHOOK] SUCCESS! Enrollment created:', data);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log('[COURSE-WEBHOOK] Completed in', duration, 'ms');
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('[COURSE-WEBHOOK] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error }, 
      { status: 500 }
    );
  }
}