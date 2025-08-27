import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import Stripe from 'stripe';

// Manual endpoint to process the last purchase
export async function GET(request: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    // Get the most recent checkout session
    const sessions = await stripe.checkout.sessions.list({
      limit: 1,
    });
    
    if (sessions.data.length === 0) {
      return NextResponse.json({ error: 'No recent sessions found' });
    }
    
    const session = sessions.data[0];
    
    // Check if it's a training purchase
    if (session.metadata?.type !== 'training-purchase') {
      return NextResponse.json({ 
        error: 'Most recent session is not a training purchase',
        sessionType: session.metadata?.type || 'unknown'
      });
    }
    
    // Get line items
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    
    // Process manually
    const adminClient = getSupabaseServerAdminClient();
    const results = [];
    
    const COURSE_PRODUCT_MAPPING = {
      'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat-general',
      'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',
      'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',
    } as const;
    
    for (const item of lineItems.data) {
      const priceId = item.price?.id;
      if (!priceId) continue;
      
      const courseSlug = COURSE_PRODUCT_MAPPING[priceId as keyof typeof COURSE_PRODUCT_MAPPING];
      if (!courseSlug) {
        results.push({
          error: 'Unknown price ID',
          priceId,
          description: item.description
        });
        continue;
      }
      
      const accountId = session.client_reference_id;
      if (!accountId) {
        results.push({
          error: 'No client_reference_id',
          courseSlug
        });
        continue;
      }
      
      // Try to process the purchase
      const { data, error } = await adminClient.rpc('process_course_purchase_by_slug', {
        p_course_slug: courseSlug,
        p_account_id: accountId,
        p_payment_id: session.id,
        p_quantity: item.quantity || 1,
        p_customer_name: session.metadata?.customerName || null,
      });
      
      results.push({
        courseSlug,
        accountId,
        quantity: item.quantity,
        success: !error,
        data,
        error
      });
    }
    
    return NextResponse.json({
      session: {
        id: session.id,
        created: new Date(session.created * 1000).toISOString(),
        customer_email: session.customer_email,
        client_reference_id: session.client_reference_id,
        metadata: session.metadata,
        payment_status: session.payment_status,
        status: session.status
      },
      lineItems: lineItems.data.map(item => ({
        description: item.description,
        quantity: item.quantity,
        price_id: item.price?.id
      })),
      processingResults: results
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to process',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}