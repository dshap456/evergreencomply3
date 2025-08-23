import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: NextRequest) {
  try {
    const adminClient = getSupabaseServerAdminClient();
    
    // Get the user
    const { data: { user } } = await adminClient.auth.admin.getUserById(
      'c01c1f21-619e-4df0-9c0b-c8a3f296a2b7' // support@evergreencomply.com
    );
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('Simulating webhook for user:', user.email);
    
    // Test each course slug
    const courseSlugs = [
      'dot-hazmat-general',  // This is what shows in your database
      'advanced-hazmat',
      'epa-rcra'
    ];
    
    const results = [];
    
    for (const slug of courseSlugs) {
      console.log(`Processing ${slug}...`);
      
      // Call the function that the webhook would call
      const { data, error } = await adminClient.rpc('process_course_purchase_by_slug', {
        p_course_slug: slug,
        p_account_id: user.id,
        p_payment_id: `test-payment-${Date.now()}`,
        p_quantity: 1
      });
      
      results.push({
        slug,
        success: !error,
        data,
        error: error?.message
      });
    }
    
    // Check enrollments after
    const { data: enrollments } = await adminClient
      .from('course_enrollments')
      .select(`
        course_id,
        enrolled_at,
        courses!inner (
          title,
          slug
        )
      `)
      .eq('user_id', user.id);
    
    return NextResponse.json({
      message: 'Webhook simulation complete',
      results,
      currentEnrollments: enrollments
    });
    
  } catch (error) {
    console.error('Webhook simulation error:', error);
    return NextResponse.json({
      error: 'Simulation failed',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}