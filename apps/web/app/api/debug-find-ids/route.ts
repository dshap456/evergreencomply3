import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const adminClient = getSupabaseServerAdminClient();
  
  // Find the course
  const { data: course } = await adminClient
    .from('courses')
    .select('id, title')
    .eq('title', 'DOT HAZMAT - Advanced Awareness')
    .single();
  
  // Find team accounts (non-personal)
  const { data: accounts } = await adminClient
    .from('accounts')
    .select('id, name, slug')
    .eq('is_personal_account', false)
    .limit(5);
  
  return NextResponse.json({
    course,
    teamAccounts: accounts,
    usage: 'Use these IDs with /api/debug-seat-calculation'
  });
}