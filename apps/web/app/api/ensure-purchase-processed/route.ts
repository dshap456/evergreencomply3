import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import Stripe from 'stripe';

// Failsafe endpoint - ensures a purchase is processed
// Can be called from the success page if webhook hasn't processed within 10 seconds
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No session ID' }, { status: 400 });
    }
    
    const adminClient = getSupabaseServerAdminClient();
    
    // Check if already processed CORRECTLY (team account for multi-seat)
    const { data: existing } = await adminClient
      .from('course_seats')
      .select('id, account_id, seats_purchased')
      .eq('payment_id', sessionId)
      .single();
    
    // Get the session to check quantity
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    const totalQuantity = lineItems.data.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    if (existing) {
      // Check if it was processed to the RIGHT account
      const { data: existingAccount } = await adminClient
        .from('accounts')
        .select('is_personal_account')
        .eq('id', existing.account_id)
        .single();
      
      // If multi-seat purchase is in personal account, that's wrong - reprocess
      if (totalQuantity >= 2 && existingAccount?.is_personal_account) {
        console.error('[ENSURE-PROCESSED] ❌ Multi-seat purchase in personal account! Needs reprocessing');
        // Continue to reprocess below
      } else {
        console.log('[ENSURE-PROCESSED] Already processed correctly:', sessionId);
        return NextResponse.json({ 
          status: 'already_processed',
          message: 'Purchase was already recorded correctly',
          accountType: existingAccount?.is_personal_account ? 'personal' : 'team'
        });
      }
    }
    
    // Not processed correctly - process it now
    console.error('⚠️ PROCESSING for session:', sessionId, 'Total quantity:', totalQuantity);
    
    // Determine account to use
    let purchaseAccountId = session.client_reference_id;
    
    // For multi-seat purchases, create or find team account
    if (totalQuantity >= 2 && purchaseAccountId) {
      const { data: existingTeam } = await adminClient
        .from('accounts_memberships')
        .select('account_id')
        .eq('user_id', purchaseAccountId)
        .eq('account_role', 'team_manager')
        .limit(1)
        .single();
      
      if (existingTeam) {
        purchaseAccountId = existingTeam.account_id;
      } else {
        // Create team account
        const emailPrefix = session.customer_email?.split('@')[0] || 'team';
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        
        const { data: newTeam } = await adminClient
          .from('accounts')
          .insert({
            primary_owner_user_id: purchaseAccountId,
            name: `${emailPrefix}'s Team`,
            slug: `${emailPrefix}-team-${randomSuffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            is_personal_account: false,
          })
          .select()
          .single();
        
        if (newTeam) {
          await adminClient
            .from('accounts_memberships')
            .insert({
              user_id: session.client_reference_id!,
              account_id: newTeam.id,
              account_role: 'team_manager',
            });
          
          purchaseAccountId = newTeam.id;
        }
      }
    }
    
    // Process each line item
    const results = [];
    const COURSE_MAPPING = {
      'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat-general',
      'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',
      'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',
    } as const;
    
    for (const item of lineItems.data) {
      const priceId = item.price?.id;
      if (!priceId) continue;
      
      const courseSlug = COURSE_MAPPING[priceId as keyof typeof COURSE_MAPPING];
      if (!courseSlug) continue;
      
      const { data, error } = await adminClient.rpc('process_course_purchase_by_slug', {
        p_course_slug: courseSlug,
        p_account_id: purchaseAccountId!,
        p_payment_id: sessionId,
        p_quantity: item.quantity || 1,
        p_customer_name: session.customer_details?.name || session.customer_email || null,
      });
      
      results.push({
        courseSlug,
        success: !error,
        data,
        error
      });
    }
    
    return NextResponse.json({
      status: 'processed',
      message: 'Purchase processed successfully',
      accountId: purchaseAccountId,
      isTeamPurchase: totalQuantity >= 2,
      results
    });
    
  } catch (error) {
    console.error('[ENSURE-PROCESSED] Error:', error);
    return NextResponse.json({
      error: 'Failed to ensure processing',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}