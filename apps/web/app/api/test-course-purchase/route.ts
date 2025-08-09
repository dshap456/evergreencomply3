import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';

export async function GET(request: NextRequest) {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  
  if (!auth.data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseServerAdminClient();

  // Get all courses with their billing info
  const { data: courses, error: coursesError } = await adminClient
    .from('courses')
    .select('id, title, sku, price, billing_product_id')
    .order('title');

  if (coursesError) {
    return NextResponse.json({ error: coursesError.message }, { status: 500 });
  }

  // Get user's enrollments
  const { data: enrollments, error: enrollmentsError } = await client
    .from('course_enrollments')
    .select('course_id, enrolled_at, progress_percentage')
    .eq('user_id', auth.data.id);

  if (enrollmentsError) {
    return NextResponse.json({ error: enrollmentsError.message }, { status: 500 });
  }

  return NextResponse.json({
    user_id: auth.data.id,
    user_email: auth.data.email,
    courses,
    enrollments,
    course_mapping: {
      'dot-hazmat': 'price_1RsDQh97cNCBYOcXZBML0Cwf',
      'advanced-hazmat': 'price_1RsDev97cNCBYOcX008NiFR8',
      'epa-rcra': 'price_1RsDf697cNCBYOcXkMlo2mPt',
    }
  });
}

// Test enrollment creation
export async function POST(request: NextRequest) {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  
  if (!auth.data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseServerAdminClient();
  const { courseId } = await request.json();

  // Simulate a course purchase
  const { data, error } = await adminClient.rpc('process_course_purchase', {
    p_product_id: courseId, // This should be billing_product_id like 'advanced-hazmat'
    p_account_id: auth.data.id, // Personal account ID is same as user ID
    p_payment_id: `test-${Date.now()}`,
    p_quantity: 1,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    result: data,
    message: 'Test enrollment created'
  });
}