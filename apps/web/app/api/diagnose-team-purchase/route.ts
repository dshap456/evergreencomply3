import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    const adminClient = getSupabaseServerAdminClient();
    
    // Get recent Stripe sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });
    
    // Filter for team purchases
    const teamPurchases = [];
    
    for (const session of sessions.data) {
      if (session.metadata?.type === 'training-purchase' && 
          session.metadata?.accountType === 'team' &&
          session.status === 'complete') {
        
        // Get line items
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        
        // Check if this payment exists in database
        const { data: dbRecord } = await adminClient
          .from('course_seats')
          .select('*')
          .eq('payment_id', session.id)
          .single();
        
        teamPurchases.push({
          session_id: session.id,
          created: new Date(session.created * 1000).toISOString(),
          client_reference_id: session.client_reference_id,
          customer_email: session.customer_email,
          metadata: session.metadata,
          payment_status: session.payment_status,
          line_items: lineItems.data.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price_id: item.price?.id
          })),
          in_database: !!dbRecord,
          database_record: dbRecord
        });
      }
    }
    
    // Check webhook endpoint configuration
    const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    
    // Check recent webhook events
    const webhookEvents = await stripe.events.list({
      limit: 20,
      types: ['checkout.session.completed']
    });
    
    return NextResponse.json({
      stripe_mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST' : 'LIVE',
      team_purchases_found: teamPurchases.length,
      team_purchases: teamPurchases,
      webhook_endpoints: webhookEndpoints.data.map(ep => ({
        id: ep.id,
        url: ep.url,
        enabled_events: ep.enabled_events,
        status: ep.status,
        created: new Date(ep.created * 1000).toISOString()
      })),
      recent_checkout_events: webhookEvents.data.map(e => ({
        id: e.id,
        created: new Date(e.created * 1000).toISOString(),
        session_id: (e.data.object as any).id,
        processed: (e.data.object as any).metadata?.type === 'training-purchase'
      })),
      diagnostic: {
        webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
        webhook_secret_starts_with: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10)
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}