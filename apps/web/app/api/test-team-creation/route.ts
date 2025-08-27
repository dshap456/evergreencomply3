import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Test endpoint to debug team account creation
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  
  const adminClient = getSupabaseServerAdminClient();
  const client = getSupabaseServerClient();
  
  // Get current user
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const debugInfo: any = {
    action,
    userId: user.id,
    userEmail: user.email,
    timestamp: new Date().toISOString(),
  };
  
  try {
    if (action === 'check') {
      // Check existing team accounts and memberships
      const { data: memberships, error: membershipError } = await adminClient
        .from('accounts_memberships')
        .select(`
          *,
          accounts(*)
        `)
        .eq('user_id', user.id);
      
      debugInfo.memberships = memberships;
      debugInfo.membershipError = membershipError;
      
      // Check all team accounts owned by this user
      const { data: ownedAccounts, error: ownedError } = await adminClient
        .from('accounts')
        .select('*')
        .eq('primary_owner_user_id', user.id)
        .eq('is_personal_account', false);
      
      debugInfo.ownedTeamAccounts = ownedAccounts;
      debugInfo.ownedError = ownedError;
      
    } else if (action === 'create') {
      // Attempt to create a team account manually
      console.log('[Test] Creating team account for user:', user.id);
      
      // Step 1: Create team account
      const { data: teamAccount, error: teamError } = await adminClient
        .from('accounts')
        .insert({
          primary_owner_user_id: user.id,
          name: `Test Team ${Date.now()}`,
          is_personal_account: false,
          email: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      debugInfo.teamAccount = teamAccount;
      debugInfo.teamError = teamError;
      
      if (teamAccount) {
        // Step 2: Create membership
        console.log('[Test] Creating membership for account:', teamAccount.id);
        
        const { data: membership, error: membershipError } = await adminClient
          .from('accounts_memberships')
          .insert({
            user_id: user.id,
            account_id: teamAccount.id,
            account_role: 'team_manager',  // Use correct role name from roles table
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        debugInfo.membership = membership;
        debugInfo.membershipError = membershipError;
        
        // Step 3: Verify it was created
        const { data: verify } = await adminClient
          .from('accounts_memberships')
          .select('*')
          .eq('user_id', user.id)
          .eq('account_id', teamAccount.id)
          .single();
        
        debugInfo.verification = verify;
      }
      
    } else if (action === 'cleanup') {
      // Clean up test team accounts with null created_at
      const { data: nullAccounts } = await adminClient
        .from('accounts')
        .select('*')
        .eq('primary_owner_user_id', user.id)
        .is('created_at', null);
      
      debugInfo.accountsWithNullCreatedAt = nullAccounts;
      
      if (nullAccounts && nullAccounts.length > 0) {
        // Delete these accounts
        const ids = nullAccounts.map(a => a.id);
        const { error: deleteError } = await adminClient
          .from('accounts')
          .delete()
          .in('id', ids);
        
        debugInfo.deleteError = deleteError;
        debugInfo.deletedCount = nullAccounts.length;
      }
    }
    
  } catch (error: any) {
    debugInfo.error = error.message;
    debugInfo.stack = error.stack;
  }
  
  return NextResponse.json(debugInfo, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}