// VERSION 2.0 - Clean webhook without orders table
// Last updated: 2025-08-09 19:48 UTC
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import Stripe from 'stripe';

// Course purchase webhook - NO orders table dependency
// Map Stripe price IDs to course slugs in database
const COURSE_PRODUCT_MAPPING = {
  'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat-general',  // DOT HAZMAT - General Awareness
  'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',      // DOT HAZMAT - Advanced Awareness  
  'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',            // EPA RCRA
} as const;

export async function POST(request: NextRequest) {
  console.log('[Course Webhook] Starting fresh webhook handler...');
  console.log('[Course Webhook] Webhook hit at:', new Date().toISOString());
  
  // Log immediately to see if webhook is being called at all
  console.log('[Course Webhook] REQUEST RECEIVED - Headers:', {
    'stripe-signature': request.headers.get('stripe-signature')?.substring(0, 20) + '...',
    'content-type': request.headers.get('content-type'),
    'user-agent': request.headers.get('user-agent'),
  });
  
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    console.log('[Course Webhook] Body length:', body.length);
    console.log('[Course Webhook] Has signature:', !!signature);
    console.log('[Course Webhook] Webhook secret configured:', !!process.env.STRIPE_WEBHOOK_SECRET);
    console.log('[Course Webhook] Webhook secret prefix:', process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10));
    
    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
    
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
      console.log('[Course Webhook] ✅ Signature verified successfully!');
    } catch (err: any) {
      console.error('[Course Webhook] ❌ Signature verification failed:', {
        error: err.message,
        type: err.type,
        signatureHeader: signature?.substring(0, 50),
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 15),
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    console.log('[Course Webhook] Event type:', event.type);
    console.log('[Course Webhook] Event ID:', event.id);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('[Course Webhook] Session details:', {
        id: session.id,
        client_reference_id: session.client_reference_id,
        metadata: session.metadata,
        customer_email: session.customer_email,
      });
      
      // Check if training purchase
      if (session.metadata?.type !== 'training-purchase') {
        console.log('[Course Webhook] Not a training purchase, ignoring');
        return NextResponse.json({ received: true });
      }
      
      console.log('[Course Webhook] Processing training purchase...');
      
      // Get line items and calculate total quantity FIRST
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      let totalQuantity = 0;
      for (const item of lineItems.data) {
        totalQuantity += item.quantity || 1;
      }
      
      // Determine the account to use for purchase processing
      let purchaseAccountId = session.client_reference_id;
      
      // If this is a multi-seat purchase, create team account FIRST
      if (totalQuantity > 1 && session.client_reference_id) {
        console.log('[Course Webhook] Multi-seat purchase detected, creating team account first');
        
        const adminClient = getSupabaseServerAdminClient();
        
        // First check if user already has a team account
        const { data: existingAccounts } = await adminClient
          .from('accounts_memberships')
          .select('account_id, account_role')
          .eq('user_id', session.client_reference_id)
          .eq('account_role', 'team_manager');  // Use correct role name
        
        if (!existingAccounts || existingAccounts.length === 0) {
          // Create a team account and make user team_manager
          // NOTE: Don't use the user's email for team account - it conflicts with personal account
          const { data: teamAccount, error: teamError } = await adminClient
            .from('accounts')
            .insert({
              primary_owner_user_id: session.client_reference_id,
              name: `${session.customer_email?.split('@')[0] || 'Team'}'s Team`,
              is_personal_account: false,
              email: null,  // Team accounts don't need an email - the owner has their own email
              created_at: new Date().toISOString(), // Explicitly set created_at
              updated_at: new Date().toISOString(), // Explicitly set updated_at
            })
            .select()
            .single();
          
          if (teamError) {
            console.error('[Course Webhook] Failed to create team account:', teamError);
          } else if (teamAccount) {
            console.log('[Course Webhook] Team account created:', teamAccount.id);
            
            // Add user as team_manager of the new team account
            const { data: membership, error: membershipError } = await adminClient
              .from('accounts_memberships')
              .insert({
                user_id: session.client_reference_id,
                account_id: teamAccount.id,
                account_role: 'team_manager',  // Use correct role name from roles table
                created_at: new Date().toISOString(), // Explicitly set created_at
              })
              .select()
              .single();
            
            if (membershipError) {
              console.error('[Course Webhook] ❌ Failed to add team membership:', {
                error: membershipError,
                errorCode: membershipError.code,
                errorMessage: membershipError.message,
                errorDetails: membershipError.details,
                userId: session.client_reference_id,
                accountId: teamAccount.id,
              });
              
              // Try to diagnose why membership creation failed
              const { data: existingMembership } = await adminClient
                .from('accounts_memberships')
                .select('*')
                .eq('user_id', session.client_reference_id)
                .eq('account_id', teamAccount.id);
              
              console.log('[Course Webhook] Existing membership check:', existingMembership);
              
              // Don't use team account if membership failed
            } else {
              console.log('[Course Webhook] ✅ Team membership created:', membership);
              
              // Verify the membership was actually created
              const { data: verifyMembership } = await adminClient
                .from('accounts_memberships')
                .select('*')
                .eq('user_id', session.client_reference_id)
                .eq('account_id', teamAccount.id)
                .single();
              
              console.log('[Course Webhook] Membership verification:', verifyMembership);
              
              if (verifyMembership) {
                // Use the team account for purchase processing
                purchaseAccountId = teamAccount.id;
                console.log('[Course Webhook] ✅ Using team account for purchase:', purchaseAccountId);
              } else {
                console.error('[Course Webhook] ❌ Membership not found after creation!');
              }
            }
          }
        } else {
          // Use existing team account
          purchaseAccountId = existingAccounts[0].account_id;
          console.log('[Course Webhook] Using existing team account:', purchaseAccountId);
        }
      }
      
      // Now process each line item with the correct account (team or personal)
      for (const item of lineItems.data) {
        const priceId = item.price?.id;
        if (!priceId) continue;
        
        const courseSlug = COURSE_PRODUCT_MAPPING[priceId as keyof typeof COURSE_PRODUCT_MAPPING];
        if (!courseSlug) {
          console.error('[Course Webhook] Unknown price ID:', priceId);
          console.error('[Course Webhook] Available mappings:', COURSE_PRODUCT_MAPPING);
          continue;
        }
        
        if (!purchaseAccountId) {
          console.error('[Course Webhook] NO ACCOUNT ID!');
          continue;
        }
        
        console.log('[Course Webhook] Processing purchase for:', {
          courseSlug,
          accountId: purchaseAccountId,
          quantity: item.quantity,
          isTeamPurchase: totalQuantity > 1,
        });
        
        // Get the customer name from metadata (will be empty for multi-seat team purchases)
        const customerName = session.metadata?.customerName && session.metadata.customerName.trim() 
          ? session.metadata.customerName 
          : null;
        console.log('[Course Webhook] Using customer name:', customerName);
        
        const adminClient = getSupabaseServerAdminClient();
        
        console.log('[Course Webhook] Calling process_course_purchase_by_slug with:', {
          p_course_slug: courseSlug,
          p_account_id: purchaseAccountId,
          p_payment_id: session.id,
          p_quantity: item.quantity || 1,
          p_customer_name: customerName,
        });
        
        const { data, error } = await adminClient.rpc('process_course_purchase_by_slug', {
          p_course_slug: courseSlug,
          p_account_id: purchaseAccountId,  // Use the determined account (team or personal)
          p_payment_id: session.id,
          p_quantity: item.quantity || 1,
          p_customer_name: customerName,  // Pass the customer name
        });
        
        if (error) {
          console.error('[Course Webhook] Database error:', error);
          throw error;
        }
        
        console.log('[Course Webhook] Purchase processed:', data);
      }
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('[Course Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook failed', details: error }, 
      { status: 500 }
    );
  }
}