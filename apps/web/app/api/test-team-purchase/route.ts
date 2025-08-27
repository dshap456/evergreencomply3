import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

// Test endpoint to simulate a team purchase and check what happens
export async function POST(request: NextRequest) {
  try {
    const { teamAccountId, courseSlug, quantity, paymentId } = await request.json();
    
    if (!teamAccountId || !courseSlug) {
      return NextResponse.json({ 
        error: 'Missing required fields: teamAccountId and courseSlug' 
      }, { status: 400 });
    }
    
    const adminClient = getSupabaseServerAdminClient();
    
    // First, verify the team account exists and is not personal
    const { data: account, error: accountError } = await adminClient
      .from('accounts')
      .select('id, name, slug, is_personal_account')
      .eq('id', teamAccountId)
      .single();
      
    if (accountError || !account) {
      return NextResponse.json({ 
        error: 'Account not found',
        details: accountError
      }, { status: 404 });
    }
    
    if (account.is_personal_account) {
      return NextResponse.json({ 
        error: 'This is a personal account, not a team account',
        account
      }, { status: 400 });
    }
    
    // Now try to process the purchase
    const testPaymentId = paymentId || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[TEST] Processing team purchase:', {
      teamAccountId,
      courseSlug,
      quantity: quantity || 1,
      paymentId: testPaymentId
    });
    
    const { data, error } = await adminClient.rpc('process_course_purchase_by_slug', {
      p_course_slug: courseSlug,
      p_account_id: teamAccountId,
      p_payment_id: testPaymentId,
      p_quantity: quantity || 1,
    });
    
    if (error) {
      return NextResponse.json({ 
        error: 'Failed to process purchase',
        details: error,
        hint: error.hint,
        code: error.code
      }, { status: 500 });
    }
    
    // Check what was actually created
    const { data: seats } = await adminClient
      .from('course_seats')
      .select('*')
      .eq('payment_id', testPaymentId)
      .single();
      
    return NextResponse.json({
      success: true,
      account,
      purchase_result: data,
      seats_created: seats,
      test_payment_id: testPaymentId
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}