import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      id: session.id,
      amount_total: session.amount_total ?? 0,
      currency: (session.currency || 'usd').toUpperCase(),
    });
  } catch (error) {
    console.error('[checkout/session] Failed to load Stripe session:', error);
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });
  }
}

