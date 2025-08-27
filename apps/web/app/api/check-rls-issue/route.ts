import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    // Get both clients
    const regularClient = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    
    // First, sign in as the user to simulate their context
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const user = authUsers?.users?.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' });
    }
    
    // Try to query course_invitations with regular client (as the user would)
    const { data: regularQuery, error: regularError } = await regularClient
      .from('course_invitations')
      .select('*')
      .eq('email', email);
    
    // Try with admin client
    const { data: adminQuery, error: adminError } = await adminClient
      .from('course_invitations')
      .select('*')
      .eq('email', email);
    
    return NextResponse.json({
      userContext: {
        id: user.id,
        email: user.email
      },
      regularClientQuery: {
        success: !regularError,
        rowCount: regularQuery?.length || 0,
        error: regularError?.message,
        data: regularQuery
      },
      adminClientQuery: {
        success: !adminError,
        rowCount: adminQuery?.length || 0,
        error: adminError?.message,
        data: adminQuery
      },
      diagnosis: {
        hasRLSIssue: (adminQuery?.length || 0) > (regularQuery?.length || 0),
        explanation: (adminQuery?.length || 0) > (regularQuery?.length || 0) 
          ? '❌ RLS is blocking the user from seeing their invitations!'
          : '✅ User can see their invitations'
      }
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
    message: 'Check if RLS policies are blocking invitation queries',
    usage: 'POST with { "email": "user@example.com" }'
  });
}