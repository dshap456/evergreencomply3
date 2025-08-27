import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

// Test what the redirect flow sees
export async function GET(request: NextRequest) {
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();
  
  const results: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  };
  
  try {
    // Step 1: Check current user
    const { data: { user }, error: authError } = await client.auth.getUser();
    
    results.steps.push({
      step: 'Get current user',
      user: user ? { id: user.id, email: user.email } : null,
      error: authError,
    });
    
    if (!user) {
      results.problem = 'User not authenticated - this is why redirect fails!';
      return NextResponse.json(results);
    }
    
    // Step 2: What the redirect query sees (using regular client)
    const { data: teamMemberships, error: membershipError } = await client
      .from('accounts_memberships')
      .select(`
        account_id,
        account_role,
        accounts!inner(
          id,
          name,
          slug,
          is_personal_account,
          created_at,
          primary_owner_user_id
        )
      `)
      .eq('user_id', user.id)
      .eq('account_role', 'team_manager')
      .eq('accounts.is_personal_account', false)
      .limit(1);
    
    results.steps.push({
      step: 'Query team memberships (regular client)',
      found: teamMemberships?.length || 0,
      data: teamMemberships,
      error: membershipError,
    });
    
    // Step 3: Same query with admin client
    const { data: adminMemberships, error: adminError } = await adminClient
      .from('accounts_memberships')
      .select(`
        account_id,
        account_role,
        accounts!inner(
          id,
          name,
          slug,
          is_personal_account,
          created_at,
          primary_owner_user_id
        )
      `)
      .eq('user_id', user.id)
      .eq('account_role', 'team_manager')
      .eq('accounts.is_personal_account', false)
      .limit(1);
    
    results.steps.push({
      step: 'Query team memberships (admin client)',
      found: adminMemberships?.length || 0,
      data: adminMemberships,
      error: adminError,
    });
    
    // Step 4: Check what URL would be generated
    if (teamMemberships && teamMemberships.length > 0) {
      const teamAccount = teamMemberships[0].accounts;
      const teamSlug = teamAccount.slug || teamAccount.id;
      results.redirectUrl = `/home/${teamSlug}/courses/seats?purchase=success`;
      results.status = '✅ Should redirect to team page';
    } else {
      results.redirectUrl = '/home/courses?purchase=success&pending=team';
      results.status = '❌ Would show pending message';
    }
    
    // Step 5: Direct check for the specific team account
    const { data: specificTeam } = await adminClient
      .from('accounts')
      .select('*')
      .eq('id', 'e13e2bef-1e19-45f1-95f8-53447322f0b4')
      .single();
    
    results.knownTeamAccount = specificTeam;
    
    // Step 6: Check if RLS might be blocking
    const { data: rlsTest } = await client
      .from('accounts')
      .select('id, name')
      .eq('id', 'e13e2bef-1e19-45f1-95f8-53447322f0b4');
    
    results.steps.push({
      step: 'RLS test - can user see team account?',
      found: !!rlsTest && rlsTest.length > 0,
      data: rlsTest,
    });
    
  } catch (error: any) {
    results.error = error.message;
    results.stack = error.stack;
  }
  
  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}