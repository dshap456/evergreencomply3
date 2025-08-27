import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { createTeamAccountsApi } from '@kit/team-accounts/api';

export async function GET(request: NextRequest) {
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();
  
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' });
  }
  
  // 1. Check what team accounts exist for the user
  const { data: memberships } = await client
    .from('accounts_memberships')
    .select(`
      *,
      accounts!inner(*)
    `)
    .eq('user_id', user.id);
  
  // 2. Check what the admin client sees (bypasses RLS)
  const { data: adminMemberships } = await adminClient
    .from('accounts_memberships')
    .select(`
      *,
      accounts!inner(*)
    `)
    .eq('user_id', user.id);
  
  // 3. Try to get team workspace for each team account
  const workspaceResults = [];
  const api = createTeamAccountsApi(client);
  
  for (const membership of adminMemberships || []) {
    if (!membership.accounts.is_personal_account) {
      const slug = membership.accounts.slug || membership.accounts.id;
      
      try {
        const workspace = await api.getAccountWorkspace(slug);
        workspaceResults.push({
          slug,
          success: true,
          hasAccount: !!workspace.data?.account,
          workspace: workspace.data,
        });
      } catch (error: any) {
        workspaceResults.push({
          slug,
          success: false,
          error: error.message,
        });
      }
    }
  }
  
  // 4. Check the RLS policies 
  const { data: rlsCheck } = await client.rpc('team_account_workspace', {
    account_slug: adminMemberships?.find(m => !m.accounts.is_personal_account)?.accounts.slug || ''
  }).single();
  
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    memberships: {
      viaRLS: memberships,
      viaAdmin: adminMemberships,
      difference: adminMemberships?.length !== memberships?.length ? 'RLS is blocking some memberships!' : 'Same count',
    },
    workspaceResults,
    rlsCheckResult: rlsCheck,
    analysis: {
      hasTeamAccount: adminMemberships?.some(m => !m.accounts.is_personal_account),
      teamAccounts: adminMemberships?.filter(m => !m.accounts.is_personal_account).map(m => ({
        id: m.accounts.id,
        slug: m.accounts.slug,
        name: m.accounts.name,
        role: m.account_role,
      })),
    }
  });
}