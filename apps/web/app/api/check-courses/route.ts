import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const adminClient = getSupabaseServerAdminClient();
  
  const { data: courses } = await adminClient
    .from('courses')
    .select('id, title, sku, billing_product_id, slug')
    .order('title');
    
  return NextResponse.json({ courses });
}