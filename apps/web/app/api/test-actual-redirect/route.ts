import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Test what URL the purchase-success route would generate
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const simulate = searchParams.get('simulate') === 'true';
  
  const client = getSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  // Query exactly what purchase-success queries
  const { data: teamMemberships } = await client
    .from('accounts_memberships')
    .select(`
      account_id,
      account_role,
      accounts!inner(
        id,
        name,
        slug,
        is_personal_account
      )
    `)
    .eq('user_id', user.id)
    .eq('account_role', 'team_manager')
    .eq('accounts.is_personal_account', false)
    .limit(1);
  
  const result = {
    user: { id: user.id, email: user.email },
    teamMembershipsFound: teamMemberships?.length || 0,
    teamMemberships,
    wouldRedirectTo: null as string | null,
  };
  
  // Determine redirect
  if (teamMemberships && teamMemberships.length > 0) {
    const teamAccount = teamMemberships[0].accounts;
    const teamSlug = teamAccount.slug || teamAccount.id;
    result.wouldRedirectTo = `/home/${teamSlug}/courses/seats?purchase=success`;
    
    if (simulate) {
      // Actually perform the redirect
      return NextResponse.redirect(
        new URL(result.wouldRedirectTo, request.url)
      );
    }
  } else {
    result.wouldRedirectTo = '/home/courses?purchase=success&pending=team';
    
    if (simulate) {
      return NextResponse.redirect(
        new URL(result.wouldRedirectTo, request.url)
      );
    }
  }
  
  return NextResponse.json(result);
}