import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Debug endpoint to check Stripe session details
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });

    // Get session details
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Get line items
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);

    return NextResponse.json({
      session: {
        id: session.id,
        client_reference_id: session.client_reference_id,
        customer_email: session.customer_email,
        metadata: session.metadata,
        payment_status: session.payment_status,
        status: session.status,
      },
      lineItems: lineItems.data.map(item => ({
        priceId: item.price?.id,
        quantity: item.quantity,
        description: item.description,
      })),
      debug: {
        hasClientReferenceId: !!session.client_reference_id,
        hasTrainingPurchaseMetadata: session.metadata?.type === 'training-purchase',
        priceIds: lineItems.data.map(item => item.price?.id),
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to retrieve session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}