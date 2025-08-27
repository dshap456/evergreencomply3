import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();
  
  try {
    // Get current user
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' });
    }
    
    // Check user's account memberships
    const { data: memberships } = await adminClient
      .from('accounts_memberships')
      .select('*')
      .eq('user_id', user.id);
    
    // Check accounts user owns
    const { data: ownedAccounts } = await adminClient
      .from('accounts')
      .select('*')
      .eq('primary_owner_user_id', user.id);
    
    // Test organization account
    const testAccountId = 'ba638bb1-9b90-4966-8be6-d278cc2e5120';
    
    // Check if user has access to test organization
    const hasAccessViaOwnership = ownedAccounts?.some(acc => acc.id === testAccountId);
    const hasAccessViaMembership = memberships?.some(mem => mem.account_id === testAccountId);
    
    // Simulate what the new RLS policies would check
    const wouldHaveAccess = hasAccessViaOwnership || hasAccessViaMembership;
    
    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email
      },
      accountAccess: {
        ownedAccounts: ownedAccounts?.map(a => ({
          id: a.id,
          name: a.name,
          isPersonal: a.is_personal_account
        })),
        memberships: memberships?.map(m => ({
          account_id: m.account_id,
          role: m.account_role
        }))
      },
      testOrganization: {
        id: testAccountId,
        name: 'Bobs Warehouse',
        userHasOwnership: hasAccessViaOwnership,
        userHasMembership: hasAccessViaMembership,
        wouldHaveAccessWithNewPolicies: wouldHaveAccess
      },
      verdict: wouldHaveAccess 
        ? '✅ New RLS policies should work - you have access to this organization'
        : '❌ New RLS policies would block you - you need to be added as a member or owner',
      recommendation: !wouldHaveAccess
        ? 'You need to either: 1) Be added to accounts_memberships for this account, or 2) Be set as primary_owner_user_id'
        : 'Safe to apply the new secure RLS policies'
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}