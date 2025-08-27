import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Check Stripe webhook configuration
export async function GET(request: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    // List webhook endpoints
    const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    
    // Get recent events
    const recentEvents = await stripe.events.list({
      limit: 5,
      types: ['checkout.session.completed']
    });
    
    // Check each webhook endpoint
    const endpointDetails = await Promise.all(
      webhookEndpoints.data.map(async (endpoint) => {
        // Get recent attempts for this endpoint (if possible)
        let recentAttempt = null;
        
        return {
          id: endpoint.id,
          url: endpoint.url,
          status: endpoint.status,
          enabled_events: endpoint.enabled_events,
          api_version: endpoint.api_version,
          created: new Date(endpoint.created * 1000).toISOString(),
          description: endpoint.description,
          metadata: endpoint.metadata,
        };
      })
    );
    
    // Check our specific endpoint
    const ourEndpoint = endpointDetails.find(e => 
      e.url?.includes('evergreencomply.com') && 
      e.url?.includes('course-purchase-webhook')
    );
    
    return NextResponse.json({
      webhook_endpoints: endpointDetails,
      our_endpoint: ourEndpoint || null,
      recent_checkout_events: recentEvents.data.map(e => ({
        id: e.id,
        created: new Date(e.created * 1000).toISOString(),
        session_id: (e.data.object as any).id,
        livemode: e.livemode
      })),
      configuration: {
        expected_url: 'https://www.evergreencomply.com/api/course-purchase-webhook',
        webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
        webhook_secret_valid: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'),
        stripe_mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST' : 'LIVE'
      },
      recommendations: ourEndpoint ? [] : [
        'No webhook endpoint found for course-purchase-webhook',
        'Add webhook endpoint in Stripe Dashboard',
        'URL should be: https://www.evergreencomply.com/api/course-purchase-webhook',
        'Enable event: checkout.session.completed'
      ]
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check webhooks',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}