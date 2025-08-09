import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST() {
  const adminClient = getSupabaseServerAdminClient();
  
  try {
    // Fix the billing product IDs to match what Stripe is sending
    const updates = [
      {
        slug: 'dot-hazmat-general', 
        billing_product_id: 'dot-hazmat',
        title_match: 'DOT HAZMAT - General Awareness'
      },
      {
        slug: 'advanced-hazmat',
        billing_product_id: 'advanced-hazmat', 
        title_match: 'DOT HAZMAT - Advanced Awareness'
      },
      {
        slug: 'epa-rcra',
        billing_product_id: 'epa-rcra',
        title_match: 'EPA RCRA'
      }
    ];
    
    const results = [];
    
    for (const update of updates) {
      // First clear any duplicates
      await adminClient
        .from('courses')
        .update({ billing_product_id: null })
        .eq('billing_product_id', update.billing_product_id)
        .neq('title', update.title_match);
      
      // Then set the correct one
      const { data, error } = await adminClient
        .from('courses')
        .update({ billing_product_id: update.billing_product_id })
        .eq('title', update.title_match)
        .select();
        
      results.push({
        title: update.title_match,
        billing_product_id: update.billing_product_id,
        success: !error,
        error: error?.message,
        updated: data
      });
    }
    
    return NextResponse.json({ 
      message: 'Billing IDs fixed',
      results 
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fix billing IDs',
      details: error 
    }, { status: 500 });
  }
}