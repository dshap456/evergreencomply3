import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseSlug, accountId, quantity = 1 } = body;
    
    if (!courseSlug || !accountId) {
      return NextResponse.json({ 
        error: 'Missing required fields: courseSlug, accountId' 
      }, { status: 400 });
    }
    
    const adminClient = getSupabaseServerAdminClient();
    
    // Test the function directly
    const { data, error } = await adminClient.rpc('process_course_purchase_by_slug', {
      p_course_slug: courseSlug,
      p_account_id: accountId,
      p_payment_id: `test-${Date.now()}`,
      p_quantity: quantity,
    });
    
    if (error) {
      console.error('Function error:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error
      }, { status: 500 });
    }
    
    // Also check what's in the database
    const { data: courseSeats } = await adminClient
      .from('course_seats')
      .select('*')
      .eq('account_id', accountId);
    
    const { data: enrollments } = await adminClient
      .from('course_enrollments')
      .select('*')
      .eq('user_id', accountId);
    
    return NextResponse.json({
      functionResult: data,
      courseSeats,
      enrollments,
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}