import { NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';

const CheckoutSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string().nullable(),
      price: z.number().positive(),
      quantity: z.number().int().positive(),
      name: z.string(),
      description: z.string(),
    })
  ).min(1),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    
    if (!auth.data) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { items, success_url, cancel_url } = CheckoutSchema.parse(body);
    
    // Create line items for Stripe checkout
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: success_url + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url,
      // CRITICAL: Set user ID so webhook knows who purchased
      client_reference_id: auth.data.id,
      customer_email: auth.data.email,
      metadata: {
        type: 'training-purchase', // Changed to match webhook expectation
        userId: auth.data.id,
        items: JSON.stringify(items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        }))),
      },
    });
    
    return NextResponse.json({
      sessionId: session.id,
      sessionUrl: session.url,
    });
    
  } catch (error) {
    console.error('Checkout error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}