import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import Stripe from 'stripe';

// Completely standalone webhook for course purchases only
// This doesn't use any of the kit's billing infrastructure

// Map Stripe price IDs to actual course slugs in the database
const COURSE_PRODUCT_MAPPING = {
  'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat-general',  // DOT HAZMAT General
  'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',      // DOT HAZMAT Advanced  
  'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',            // EPA RCRA
} as const;

export async function POST(request: NextRequest) {
  console.log('[Course Webhook] Starting...');
  
  try {
    // Get raw body and signature
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('[Course Webhook] No signature');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
    
    // Verify with Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('[Course Webhook] Invalid signature:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    console.log('[Course Webhook] Event:', event.type);
    
    // Only handle checkout completed
    if (event.type !== 'checkout.session.completed') {
      console.log('[Course Webhook] Ignoring non-checkout event');
      return NextResponse.json({ received: true });
    }
    
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Only handle training purchases
    if (session.metadata?.type !== 'training-purchase') {
      console.log('[Course Webhook] Not a training purchase');
      return NextResponse.json({ received: true });
    }
    
    console.log('[Course Webhook] Processing training purchase');
    console.log('[Course Webhook] Session ID:', session.id);
    console.log('[Course Webhook] Client Reference ID:', session.client_reference_id);
    console.log('[Course Webhook] Customer Email:', session.customer_email);
    console.log('[Course Webhook] Customer Name:', session.metadata?.customerName);
    console.log('[Course Webhook] Metadata:', session.metadata);
    
    // Process the purchase
    const adminClient = getSupabaseServerAdminClient();
    
    try {
      // Get line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      console.log('[Course Webhook] Line items:', lineItems.data.length);
      
      // Calculate total quantity across all items
      let totalQuantity = 0;
      
      for (const item of lineItems.data) {
        const priceId = item.price?.id;
        if (!priceId) continue;
        
        const courseSlug = COURSE_PRODUCT_MAPPING[priceId as keyof typeof COURSE_PRODUCT_MAPPING];
        if (!courseSlug) {
          console.log('[Course Webhook] Unknown price:', priceId);
          continue;
        }
        
        console.log('[Course Webhook] Processing course:', courseSlug);
        
        // Get the user account ID
        const accountId = session.client_reference_id;
        if (!accountId) {
          console.error('[Course Webhook] No client_reference_id!');
          continue;
        }
        
        const quantity = item.quantity || 1;
        totalQuantity += quantity;
        
        // Get the customer name from metadata (will be empty for multi-seat team purchases)
        const customerName = session.metadata?.customerName && session.metadata.customerName.trim() 
          ? session.metadata.customerName 
          : null;
        console.log('[Course Webhook] Using customer name:', customerName);
        
        // Process the purchase using the by_slug function which expects slug not billing_product_id
        const { data, error } = await adminClient.rpc('process_course_purchase_by_slug', {
          p_course_slug: courseSlug,
          p_account_id: accountId,
          p_payment_id: session.id,
          p_quantity: quantity,
          p_customer_name: customerName,  // Pass the customer name
        });
        
        if (error) {
          console.error('[Course Webhook] Database error:', error);
          throw error;
        }
        
        console.log('[Course Webhook] Success:', data);
      }
      
      // If total quantity > 1, upgrade user to team_manager role
      if (totalQuantity > 1 && session.client_reference_id) {
        console.log('[Course Webhook] Multi-seat purchase detected, upgrading to team_manager');
        
        // First check if user already has a team account
        const { data: existingAccounts } = await adminClient
          .from('accounts_memberships')
          .select('account_id, account_role')
          .eq('user_id', session.client_reference_id)
          .eq('account_role', 'team_manager');  // Use correct role name
        
        if (!existingAccounts || existingAccounts.length === 0) {
          // Create a team account and make user team_manager
          const { data: teamAccount, error: teamError } = await adminClient
            .from('accounts')
            .insert({
              primary_owner_user_id: session.client_reference_id,
              name: `${session.customer_email?.split('@')[0] || 'Team'}'s Team`,
              is_personal_account: false,
              email: session.customer_email || null,
            })
            .select()
            .single();
          
          if (teamError) {
            console.error('[Course Webhook] Failed to create team account:', teamError);
          } else if (teamAccount) {
            // Add user as team_manager of the new team account
            const { error: membershipError } = await adminClient
              .from('accounts_memberships')
              .insert({
                user_id: session.client_reference_id,
                account_id: teamAccount.id,
                account_role: 'team_manager',  // Use correct role name from roles table
              });
            
            if (membershipError) {
              console.error('[Course Webhook] Failed to add team membership:', membershipError);
            } else {
              console.log('[Course Webhook] Created team account and upgraded user to team_manager');
            }
          }
        } else {
          console.log('[Course Webhook] User already has team_manager role');
        }
      }
      
      return NextResponse.json({ received: true });
      
    } catch (dbError) {
      console.error('[Course Webhook] Processing failed:', dbError);
      // Return 500 so Stripe will retry
      return NextResponse.json(
        { error: 'Processing failed', details: dbError }, 
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('[Course Webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Webhook failed', details: error }, 
      { status: 500 }
    );
  }
}