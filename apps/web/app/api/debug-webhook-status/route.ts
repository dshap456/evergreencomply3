import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET(request: NextRequest) {
  try {
    const adminClient = getSupabaseServerAdminClient();
    
    // Check recent purchases
    const { data: recentPurchases } = await adminClient
      .from('course_seats')
      .select(`
        id,
        course_id,
        account_id,
        seats_purchased,
        payment_id,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Check for any Stripe session IDs in metadata
    const { data: recentSessions } = await adminClient
      .from('course_seats')
      .select('payment_id, created_at')
      .not('payment_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Check webhook configuration
    const webhookConfig = {
      secretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      secretNotPlaceholder: process.env.STRIPE_WEBHOOK_SECRET !== 'whsec_YOUR_WEBHOOK_SECRET_HERE',
      secretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 15),
      expectedEndpoint: 'https://www.evergreencomply.com/api/course-purchase-webhook'
    };
    
    // Check if Stripe can be initialized
    let stripeStatus = 'not-checked';
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-06-30.basil',
      });
      
      // Try to list recent events
      const events = await stripe.events.list({
        limit: 5,
        types: ['checkout.session.completed']
      });
      
      stripeStatus = {
        working: true,
        recentEvents: events.data.map(e => ({
          id: e.id,
          created: new Date(e.created * 1000).toISOString(),
          livemode: e.livemode
        }))
      };
    } catch (error) {
      stripeStatus = {
        working: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    return NextResponse.json({
      status: 'debug',
      webhook: webhookConfig,
      database: {
        recentPurchases: recentPurchases || [],
        totalPurchases: recentPurchases?.length || 0,
        lastPurchase: recentPurchases?.[0]?.created_at || 'none',
        recentPaymentIds: recentSessions?.map(s => s.payment_id) || []
      },
      stripe: stripeStatus,
      endpoints: {
        webhook: '/api/course-purchase-webhook',
        checkout: '/api/checkout/training',
        disabled: [
          '/api/billing/webhook (disabled)',
          '/api/stripe-course-webhook (disabled)'
        ]
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}