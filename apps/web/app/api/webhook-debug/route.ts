// Debug endpoint to understand why webhook returns early
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  console.error('🔴🔴🔴 WEBHOOK DEBUG CALLED 🔴🔴🔴');
  
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    console.error('Body length:', body.length);
    console.error('Signature:', signature);
    console.error('Webhook secret from env:', process.env.STRIPE_WEBHOOK_SECRET);
    console.error('Webhook secret valid?:', process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'));
    
    // Try to parse body as JSON
    let parsed: any;
    try {
      parsed = JSON.parse(body);
      console.error('Body parsed successfully');
      console.error('Event type:', parsed.type);
      console.error('Event ID:', parsed.id);
      console.error('Session metadata:', parsed.data?.object?.metadata);
    } catch (e) {
      console.error('Failed to parse body as JSON');
    }
    
    // Try to verify signature
    if (signature && process.env.STRIPE_WEBHOOK_SECRET) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2025-06-30.basil',
        });
        
        const event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        
        console.error('✅ Signature verified successfully!');
        console.error('Event:', event.type, event.id);
        
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as Stripe.Checkout.Session;
          console.error('Session data:');
          console.error('- ID:', session.id);
          console.error('- Client ref ID:', session.client_reference_id);
          console.error('- Metadata type:', session.metadata?.type);
          console.error('- Full metadata:', JSON.stringify(session.metadata));
          
          // Check what would cause early return
          const isCoursePurchase = session.metadata?.type === 'training-purchase' || 
                                  session.metadata?.type === 'course_purchase';
          console.error('Is course purchase?:', isCoursePurchase);
          
          if (!session.client_reference_id) {
            console.error('⚠️ WARNING: No client_reference_id!');
          }
        }
        
      } catch (err: any) {
        console.error('❌ Signature verification failed:', err.message);
        console.error('Error type:', err.type);
        console.error('Full error:', err);
      }
    } else {
      console.error('Missing signature or webhook secret');
    }
    
    return NextResponse.json({ 
      received: true,
      debug: true,
      hasSignature: !!signature,
      hasSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      bodyLength: body.length
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      received: true, 
      error: true,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// GET endpoint to test configuration
export async function GET() {
  return NextResponse.json({
    webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    webhook_secret_valid: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'),
    stripe_key_configured: !!process.env.STRIPE_SECRET_KEY,
    stripe_mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST' : 'LIVE'
  });
}