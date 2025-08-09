import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';

export async function GET(request: NextRequest) {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  
  if (!auth.data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's enrollments with course details
  const { data: enrollments, error } = await client
    .from('course_enrollments')
    .select(`
      id,
      enrolled_at,
      progress_percentage,
      course:courses (
        id,
        title,
        billing_product_id
      )
    `)
    .eq('user_id', auth.data.id)
    .order('enrolled_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    user: {
      id: auth.data.id,
      email: auth.data.email
    },
    enrollments: enrollments || [],
    enrollmentCount: enrollments?.length || 0,
    message: enrollments?.length 
      ? `You have ${enrollments.length} course enrollment(s)` 
      : 'No enrollments found'
  });
}