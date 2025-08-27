import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const adminClient = getSupabaseServerAdminClient();
  
  // Test if the function exists
  try {
    // Try to call it with dummy values to see if it exists
    const { data, error } = await adminClient.rpc('process_pending_course_invitation_by_token', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_invitation_token: 'test'
    });
    
    if (error && error.code === '42883') {
      return NextResponse.json({
        functionExists: false,
        error: 'Function does not exist',
        solution: 'The process_pending_course_invitation_by_token function needs to be created in the database'
      });
    }
    
    return NextResponse.json({
      functionExists: true,
      testResult: data || 'Function exists and returned',
      error: error?.message
    });
    
  } catch (err) {
    return NextResponse.json({
      functionExists: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}