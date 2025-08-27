import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: Request) {
  try {
    const { email, inviteToken } = await request.json();
    
    if (!email || !inviteToken) {
      return NextResponse.json({ error: 'email and inviteToken required' });
    }
    
    const client = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    
    // Get the user
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const user = authUsers?.users?.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' });
    }
    
    console.log('🔥 Simulating callback for:', {
      userId: user.id,
      userEmail: user.email,
      inviteToken
    });
    
    // Call the RPC function (simulating what callback should do)
    const { data: result, error: rpcError } = await adminClient.rpc('process_pending_course_invitation_by_token', {
      p_user_id: user.id,
      p_invitation_token: inviteToken
    });
    
    console.log('🔥 RPC Result:', { result, error: rpcError });
    
    // Check if enrollment was created
    const { data: enrollment } = await adminClient
      .from('course_enrollments')
      .select(`
        *,
        courses (title, slug)
      `)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })
      .limit(1)
      .single();
    
    return NextResponse.json({
      success: !!result?.success,
      message: result?.success ? 'Enrollment created successfully!' : 'Failed to create enrollment',
      rpcResult: result,
      rpcError,
      enrollment,
      nextSteps: result?.success 
        ? 'User can now see "Start Course" button' 
        : 'Check the error and try again'
    });
    
  } catch (error) {
    console.error('Simulate callback error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Simulate what the auth callback should do',
    usage: 'POST with { "email": "user@example.com", "inviteToken": "token-from-invitation" }'
  });
}