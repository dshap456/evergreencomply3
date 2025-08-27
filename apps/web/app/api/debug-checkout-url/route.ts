import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Debug what checkout URL would be created
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, quantity = 2 } = body;
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    // Create a test checkout session
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com';
    const successPath = `/home/purchase-success?session_id={CHECKOUT_SESSION_ID}`;
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price: priceId || 'price_1RsDQh97cNCBYOcXZBML0Cwf',
        quantity: quantity,
      }],
      success_url: `${baseUrl}${successPath}&test=true`,
      cancel_url: `${baseUrl}/cart`,
      metadata: {
        type: 'training-purchase',
        test: 'true',
      },
      // Don't set client_reference_id for this test
    });
    
    return NextResponse.json({
      sessionId: session.id,
      sessionUrl: session.url,
      configuredSuccessUrl: session.success_url,
      actualSuccessUrl: `${baseUrl}${successPath}`,
      message: 'Check configuredSuccessUrl - this is where Stripe will redirect',
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}