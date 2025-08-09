import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const client = getSupabaseServerAdminClient();
  
  const { data: courses, error } = await client
    .from('courses')
    .select('id, title, status, account_id')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ courses });
}