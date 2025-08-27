import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

// Final verification that the fix worked
export async function GET(request: NextRequest) {
  const adminClient = getSupabaseServerAdminClient();
  
  const verification: any = {
    timestamp: new Date().toISOString(),
    columnsFixed: false,
    functionWorks: false,
    testPurchaseWorks: false,
    recommendations: [],
  };
  
  try {
    // 1. Verify columns exist
    const { data: columns } = await adminClient
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'course_seats')
      .in('column_name', ['seats_purchased', 'seats_used', 'purchase_type', 'payment_id']);
    
    verification.columnsFixed = columns && columns.length === 4;
    verification.columnsFound = columns?.map(c => c.column_name) || [];
    
    // 2. Test the function
    const { data: functionTest, error: functionError } = await adminClient.rpc(
      'process_course_purchase_by_slug',
      {
        p_course_slug: 'dot-hazmat-general',
        p_account_id: 'b6c5a2cb-d4d7-4ac4-9296-85a5ea0b55bd', // Test with personal account
        p_payment_id: 'test_verify_' + Date.now(),
        p_quantity: 1,
        p_customer_name: 'Test User'
      }
    );
    
    verification.functionWorks = !functionError && functionTest?.success;
    verification.functionResult = functionTest;
    verification.functionError = functionError;
    
    // 3. Check recent course_seats
    const { data: recentSeats } = await adminClient
      .from('course_seats')
      .select('*, accounts(name, is_personal_account)')
      .order('created_at', { ascending: false })
      .limit(5);
    
    verification.recentSeats = recentSeats?.map(s => ({
      account: s.accounts?.name,
      seats_purchased: s.seats_purchased,
      total_seats: s.total_seats,
      created: s.created_at
    }));
    
    // 4. Status summary
    if (verification.columnsFixed && verification.functionWorks) {
      verification.status = '✅ FIXED - The system should now work for multi-seat purchases!';
      verification.recommendations.push('Try a multi-seat purchase now - it should work!');
    } else {
      verification.status = '⚠️ PARTIALLY FIXED - Some issues remain';
      if (!verification.columnsFixed) {
        verification.recommendations.push('Run the SQL to add missing columns to course_seats table');
      }
      if (!verification.functionWorks) {
        verification.recommendations.push('Check the database function - it may need to be updated');
      }
    }
    
  } catch (error: any) {
    verification.error = error.message;
  }
  
  return NextResponse.json(verification, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}