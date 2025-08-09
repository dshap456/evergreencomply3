import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: Request) {
  const { courseId, slug, status } = await request.json();
  const client = getSupabaseServerAdminClient();
  
  console.log('🔍 Test Direct Update: Input:', { courseId, slug, status });
  
  // First, get the current course
  const { data: before, error: fetchError } = await client
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();
    
  console.log('📋 Before update:', before);
  console.log('📋 Fetch error:', fetchError);
  
  // Try to update directly
  const { data: after, error: updateError } = await client
    .from('courses')
    .update({
      slug: slug,
      status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', courseId)
    .select()
    .single();
    
  console.log('📊 After update:', after);
  console.log('❌ Update error:', updateError);
  
  // Double check by fetching again
  const { data: verify, error: verifyError } = await client
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();
    
  console.log('✅ Verification fetch:', verify);
  
  return NextResponse.json({
    before,
    after,
    verify,
    updateError,
    success: !updateError
  });
}