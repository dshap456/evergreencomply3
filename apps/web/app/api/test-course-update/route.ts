import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
  const { courseId, newSlug } = await request.json();
  
  if (!courseId || !newSlug) {
    return NextResponse.json({ error: 'Missing courseId or newSlug' }, { status: 400 });
  }
  
  // Test with both admin and regular client
  const adminClient = getSupabaseServerAdminClient();
  const regularClient = getSupabaseServerClient();
  
  // First, get the course with admin client
  const { data: course, error: fetchError } = await adminClient
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();
    
  if (fetchError || !course) {
    return NextResponse.json({ 
      error: 'Course not found', 
      fetchError 
    }, { status: 404 });
  }
  
  // Try update with admin client
  const { data: adminUpdate, error: adminError } = await adminClient
    .from('courses')
    .update({ slug: newSlug })
    .eq('id', courseId)
    .select();
    
  // Try update with regular client  
  const { data: regularUpdate, error: regularError } = await regularClient
    .from('courses')
    .update({ slug: newSlug })
    .eq('id', courseId)
    .select();
    
  // Check if it actually saved
  const { data: courseAfter, error: afterError } = await adminClient
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();
    
  // Check for any triggers that might be changing it
  const { data: triggers, error: triggerError } = await adminClient
    .rpc('get_triggers_on_table', { 
      table_name: 'courses',
      schema_name: 'public' 
    })
    .select()
    .catch(() => ({ data: null, error: 'No trigger function available' }));
    
  return NextResponse.json({
    courseBefore: course,
    adminUpdate: { data: adminUpdate, error: adminError },
    regularUpdate: { data: regularUpdate, error: regularError },
    courseAfter,
    afterError,
    slugChanged: courseAfter?.slug !== course.slug,
    newSlugSaved: courseAfter?.slug === newSlug,
    triggers: triggers || 'Unable to fetch triggers',
    triggerError
  });
}

// GET endpoint to check RLS and permissions
export async function GET(request: Request) {
  const adminClient = getSupabaseServerAdminClient();
  
  // Check if RLS is enabled
  const { data: rlsStatus, error: rlsError } = await adminClient
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .eq('schemaname', 'public')
    .eq('tablename', 'courses')
    .single()
    .catch(() => ({ data: null, error: 'Unable to check RLS status' }));
    
  // Try to get RLS policies
  const { data: policies, error: policiesError } = await adminClient
    .from('pg_policies')
    .select('*')
    .eq('schemaname', 'public')
    .eq('tablename', 'courses')
    .catch(() => ({ data: null, error: 'Unable to fetch policies' }));
    
  return NextResponse.json({
    rlsEnabled: rlsStatus?.rowsecurity || false,
    rlsError,
    policies: policies || [],
    policiesError,
    message: 'Use POST with {courseId, newSlug} to test updates'
  });
}