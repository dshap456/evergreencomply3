import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { StripeWebhookHandlerService } from '@kit/stripe';
import Stripe from 'stripe';

const COURSE_PRODUCT_MAPPING = {
  'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat',
  'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',
  'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',
} as const;

export async function POST(request: NextRequest) {
  const webhookHandler = new StripeWebhookHandlerService({});

  try {
    // Verify the webhook signature
    const event = await webhookHandler.verifyWebhookSignature(request);

    // Handle the webhook event
    await webhookHandler.handleWebhookEvent(event, {
      onCheckoutSessionCompleted: async (data) => {
        console.log('Checkout session completed:', data);
        
        // Check if this is a course purchase
        const stripeEvent = event as Stripe.Event;
        if (stripeEvent.type === 'checkout.session.completed') {
          const session = stripeEvent.data.object as Stripe.Checkout.Session;
          
          // Check if this is a training purchase
          if (session.metadata?.type === 'training-purchase') {
            await handleCoursePurchase(session);
          }
        }
        
        // Continue with regular subscription/order handling
        return data;
      },
      onSubscriptionUpdated: async (data) => {
        console.log('Subscription updated:', data);
        return data;
      },
      onSubscriptionDeleted: async (subscriptionId) => {
        console.log('Subscription deleted:', subscriptionId);
        return subscriptionId;
      },
      onPaymentSucceeded: async (sessionId) => {
        console.log('Payment succeeded:', sessionId);
        return sessionId;
      },
      onPaymentFailed: async (sessionId) => {
        console.log('Payment failed:', sessionId);
        return sessionId;
      },
      onInvoicePaid: async (data) => {
        console.log('Invoice paid:', data);
        return data;
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}

async function handleCoursePurchase(session: Stripe.Checkout.Session) {
  const adminClient = getSupabaseServerAdminClient();
  
  console.log('Processing course purchase:', {
    sessionId: session.id,
    accountId: session.client_reference_id,
    metadata: session.metadata,
  });

  // Get line items with expanded data
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
  });
  
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product'],
  });

  for (const item of lineItems.data) {
    const priceId = item.price?.id;
    if (!priceId) continue;

    // Get the course product ID from the price mapping
    const productId = COURSE_PRODUCT_MAPPING[priceId as keyof typeof COURSE_PRODUCT_MAPPING];
    if (!productId) {
      console.log('Not a course product:', priceId);
      continue;
    }

    const quantity = item.quantity || 1;
    const accountId = session.client_reference_id;
    
    if (!accountId) {
      console.error('No client_reference_id in session');
      continue;
    }

    console.log('Processing course purchase:', {
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
      console.error('Error processing course purchase:', error);
    } else {
      console.log('Course purchase processed:', data);
    }
  }
}