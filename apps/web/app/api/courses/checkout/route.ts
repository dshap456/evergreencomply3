import { NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

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
  email: z.string().email().optional(), // Email for unauthenticated users
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, email, success_url, cancel_url } = CheckoutSchema.parse(body);
    
    // Try to get authenticated user (optional)
    const client = getSupabaseServerClient();
    let userId: string | undefined;
    let userEmail: string | undefined;
    
    try {
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        userId = user.id;
        userEmail = user.email;
      }
    } catch {
      // User not authenticated, that's ok
    }
    
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
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: success_url + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url,
      allow_promotion_codes: true,
      // Set user ID if authenticated, otherwise webhook will create account
      client_reference_id: userId || null,
      metadata: {
        type: 'training-purchase',
        userId: userId || '', // Empty string if not authenticated
        items: JSON.stringify(items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        }))),
      },
    };

    // Handle email based on authentication status
    if (userId && userEmail) {
      // Authenticated user - use their email
      sessionConfig.customer_email = userEmail;
    } else if (email) {
      // Unauthenticated with provided email
      sessionConfig.customer_email = email;
    } else {
      // No email at all - let Stripe collect it
      // This requires enabling email collection in Stripe checkout
      sessionConfig.billing_address_collection = 'required';
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    
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
