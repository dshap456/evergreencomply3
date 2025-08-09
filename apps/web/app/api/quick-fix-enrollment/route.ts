import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

// Temporary endpoint to manually process course purchase
// This simulates what the webhook should do

export async function POST(request: NextRequest) {
  try {
    const { userEmail, courseSlug } = await request.json();
    
    if (!userEmail || !courseSlug) {
      return NextResponse.json({ 
        error: 'Missing required fields: userEmail and courseSlug' 
      }, { status: 400 });
    }

    const adminClient = getSupabaseServerAdminClient();
    
    // Get user by email
    const { data: userData, error: userError } = await adminClient
      .from('accounts')
      .select('id')
      .eq('email', userEmail)
      .eq('is_personal_account', true)
      .single();
      
    if (userError || !userData) {
      return NextResponse.json({ 
        error: 'User not found',
        details: userError?.message 
      }, { status: 404 });
    }
    
    // Map course slugs to billing product IDs
    const productMapping: Record<string, string> = {
      'dot-hazmat': 'dot-hazmat',
      'advanced-hazmat': 'advanced-hazmat',
      'epa-rcra': 'epa-rcra',
    };
    
    const billingProductId = productMapping[courseSlug];
    if (!billingProductId) {
      return NextResponse.json({ 
        error: 'Invalid course slug' 
      }, { status: 400 });
    }
    
    // Call the database function to process the purchase
    const { data: result, error: processError } = await adminClient.rpc('process_course_purchase', {
      p_product_id: billingProductId,
      p_account_id: userData.id,
      p_payment_id: `manual-fix-${Date.now()}`,
      p_quantity: 1,
    });
    
    if (processError) {
      return NextResponse.json({ 
        error: 'Failed to process enrollment',
        details: processError.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      result,
      message: 'Enrollment created successfully',
      userId: userData.id,
      courseSlug,
      billingProductId
    });
    
  } catch (error) {
    console.error('Quick fix error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}