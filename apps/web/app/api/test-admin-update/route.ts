import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
  const { courseId } = await request.json();
  
  console.log('🔍 Test Admin Update: Starting test for course:', courseId);
  
  // Test 1: Regular client update (with RLS)
  const regularClient = getSupabaseServerClient();
  const { data: regularUpdate, error: regularError } = await regularClient
    .from('courses')
    .update({
      slug: 'test-regular-slug',
      status: 'draft',
      updated_at: new Date().toISOString()
    })
    .eq('id', courseId)
    .select()
    .single();
    
  console.log('📊 Regular client update:', { 
    success: !regularError, 
    slug: regularUpdate?.slug,
    status: regularUpdate?.status,
    error: regularError?.message 
  });
  
  // Test 2: Admin client update (bypasses RLS)
  const adminClient = getSupabaseServerAdminClient();
  const { data: adminUpdate, error: adminError } = await adminClient
    .from('courses')
    .update({
      slug: 'test-admin-slug',
      status: 'archived',
      updated_at: new Date().toISOString()
    })
    .eq('id', courseId)
    .select()
    .single();
    
  console.log('📊 Admin client update:', { 
    success: !adminError, 
    slug: adminUpdate?.slug,
    status: adminUpdate?.status,
    error: adminError?.message 
  });
  
  // Test 3: Fetch to verify what's actually in the database
  const { data: verify, error: verifyError } = await adminClient
    .from('courses')
    .select('id, title, slug, status, updated_at')
    .eq('id', courseId)
    .single();
    
  console.log('✅ Final verification:', verify);
  
  return NextResponse.json({
    regularClient: { 
      success: !regularError, 
      data: regularUpdate,
      error: regularError?.message 
    },
    adminClient: { 
      success: !adminError, 
      data: adminUpdate,
      error: adminError?.message 
    },
    finalState: verify
  });
}