import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET(request: NextRequest) {
  try {
    const adminClient = getSupabaseServerAdminClient();
    
    // Find Bobs Warehouse account
    const { data: account } = await adminClient
      .from('accounts')
      .select('id, name, slug, is_personal_account')
      .eq('name', 'Bobs Warehouse')
      .single();
    
    // Check if the function exists
    const { data: functions } = await adminClient
      .rpc('pg_catalog.pg_proc', {})
      .select('proname')
      .like('proname', '%process_course%');
    
    // Get courses to verify slugs
    const { data: courses } = await adminClient
      .from('courses')
      .select('id, title, slug, billing_product_id');
    
    return NextResponse.json({
      bobsWarehouse: account,
      courses,
      note: 'Use the account.id with the test endpoint'
    });
    
  } catch (error) {
    console.error('Check error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}