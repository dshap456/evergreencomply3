import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const adminClient = getSupabaseServerAdminClient();
    
    // Step 1: Get the user
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const user = authUsers?.users?.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found',
        solution: 'User needs to sign up first via the invitation link' 
      });
    }
    
    // Step 2: Test the RPC function directly (simulating what callback does)
    const { data: result, error: rpcError } = await adminClient.rpc('process_pending_course_invitation', {
      p_user_email: email
    });
    
    if (rpcError) {
      // If type mismatch error, it means SQL fix hasn't been applied
      if (rpcError.message.includes('operator does not exist')) {
        return NextResponse.json({
          error: 'Type mismatch not fixed yet',
          solution: 'Run the SQL in URGENT_FIX_RUN_THIS.sql in Supabase dashboard',
          details: rpcError.message
        });
      }
      
      return NextResponse.json({
        error: 'RPC function failed',
        details: rpcError
      });
    }
    
    // Step 3: Verify enrollment was created
    const { data: enrollment } = await adminClient
      .from('course_enrollments')
      .select(`
        *,
        courses (
          title,
          slug
        )
      `)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })
      .limit(1)
      .single();
    
    return NextResponse.json({
      success: true,
      message: 'Automatic enrollment should work!',
      rpcResult: result,
      enrollment,
      nextSteps: enrollment 
        ? 'User can now access the course - they will see "Start Course" button'
        : 'No enrollment found - check if invitation exists'
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test automatic enrollment',
    usage: 'POST with { "email": "user@example.com" }',
    note: 'This simulates what happens during auth callback'
  });
}