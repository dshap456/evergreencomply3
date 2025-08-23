import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    // Get the last few checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 5,
    });
    
    const sessionDetails = [];
    
    for (const session of sessions.data) {
      // Get line items for each session
      let lineItems;
      try {
        const items = await stripe.checkout.sessions.listLineItems(session.id);
        lineItems = items.data.map(item => ({
          description: item.description,
          price_id: item.price?.id,
          quantity: item.quantity,
          amount: item.amount_total
        }));
      } catch (e) {
        lineItems = 'Could not fetch';
      }
      
      sessionDetails.push({
        id: session.id,
        created: new Date(session.created * 1000).toISOString(),
        status: session.status,
        payment_status: session.payment_status,
        mode: session.mode,
        customer_email: session.customer_email,
        client_reference_id: session.client_reference_id,
        metadata: session.metadata,
        success_url: session.success_url,
        line_items: lineItems,
        livemode: session.livemode,
        amount_total: session.amount_total,
        currency: session.currency
      });
    }
    
    // Also check for checkout.session.completed events
    const events = await stripe.events.list({
      limit: 10,
      types: ['checkout.session.completed']
    });
    
    return NextResponse.json({
      mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST' : 'LIVE',
      recent_sessions: sessionDetails,
      checkout_completed_events: events.data.map(e => ({
        id: e.id,
        created: new Date(e.created * 1000).toISOString(),
        session_id: (e.data.object as any).id,
        livemode: e.livemode
      })),
      analysis: {
        sessions_found: sessions.data.length,
        events_found: events.data.length,
        latest_session_status: sessions.data[0]?.status,
        latest_session_payment: sessions.data[0]?.payment_status
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to debug checkout',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}