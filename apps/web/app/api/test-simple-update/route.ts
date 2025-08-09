import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST() {
  const client = getSupabaseServerAdminClient();
  
  // Just do a simple update without any server action wrapper
  const { data, error } = await client
    .from('courses')
    .update({ status: 'draft' })
    .eq('id', 'd515f6a9-05e3-481d-a6db-d316ff098d09')
    .select()
    .single();
    
  return NextResponse.json({ data, error });
}