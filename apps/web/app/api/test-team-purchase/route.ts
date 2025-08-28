// Direct test of team purchase logic
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: NextRequest) {
  const adminClient = getSupabaseServerAdminClient();
  const userId = 'b6c5a2cb-d4d7-4ac4-9296-85a5ea0b55bd';
  const teamAccountId = 'e13e2bef-1e19-45f1-95f8-53447322f0b4';
  
  console.error('🧪 TESTING DIRECT TEAM PURCHASE');
  
  try {
    // 1. Verify the team account exists and user has access
    const { data: teamCheck } = await adminClient
      .from('accounts_memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('account_id', teamAccountId)
      .single();
    
    console.error('Team membership check:', teamCheck);
    
    if (!teamCheck) {
      return NextResponse.json({
        error: 'User does not have access to team account',
        userId,
        teamAccountId
      });
    }
    
    // 2. Process a test purchase directly to the team account
    const paymentId = 'test_team_purchase_' + Date.now();
    
    const { data: purchaseResult, error: purchaseError } = await adminClient.rpc('process_course_purchase_by_slug', {
      p_course_slug: 'advanced-hazmat',
      p_account_id: teamAccountId, // Use the TEAM account ID directly
      p_payment_id: paymentId,
      p_quantity: 5, // Multi-seat purchase
      p_customer_name: 'Team Purchase Test',
    });
    
    if (purchaseError) {
      console.error('Purchase error:', purchaseError);
      return NextResponse.json({
        error: 'Failed to process purchase',
        details: purchaseError
      });
    }
    
    console.error('Purchase successful:', purchaseResult);
    
    // 3. Verify the purchase was recorded
    const { data: verification } = await adminClient
      .from('course_seats')
      .select(\`
        *,
        accounts(name, is_personal_account)
      \`)
      .eq('payment_id', paymentId)
      .single();
    
    return NextResponse.json({
      success: true,
      test_summary: {
        user_id: userId,
        team_account_id: teamAccountId,
        payment_id: paymentId,
        purchase_result: purchaseResult,
        verification: verification,
        seats_went_to_team: verification?.account_id === teamAccountId,
      }
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : error
    });
  }
}
