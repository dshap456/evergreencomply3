import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const adminClient = getSupabaseServerAdminClient();
  
  // Test organization
  const testAccountId = 'ba638bb1-9b90-4966-8be6-d278cc2e5120';
  
  // Get the account details
  const { data: account } = await adminClient
    .from('accounts')
    .select('*')
    .eq('id', testAccountId)
    .single();
  
  // Get all memberships for this account
  const { data: memberships } = await adminClient
    .from('accounts_memberships')
    .select(`
      *,
      user:auth.users!user_id(email)
    `)
    .eq('account_id', testAccountId);
  
  // Find the primary owner's email
  let ownerEmail = null;
  if (account?.primary_owner_user_id) {
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const owner = users?.find(u => u.id === account.primary_owner_user_id);
    ownerEmail = owner?.email;
  }
  
  return NextResponse.json({
    account: {
      id: account?.id,
      name: account?.name,
      primary_owner_user_id: account?.primary_owner_user_id,
      owner_email: ownerEmail,
      is_personal_account: account?.is_personal_account
    },
    members: memberships?.map(m => ({
      user_id: m.user_id,
      email: m.user?.email,
      role: m.account_role
    })) || [],
    analysis: {
      totalMembers: memberships?.length || 0,
      hasOwner: !!account?.primary_owner_user_id,
      message: 'Users who can access this organization data with new RLS policies'
    },
    howToTestNewPolicies: 'Log in as one of the users listed above to test if the new policies work'
  });
}