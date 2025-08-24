import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { requireUser } from '@kit/supabase/require-user';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    
    // Get current user
    const auth = await requireUser(client);
    if (!auth.data) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const user = auth.data;
    
    // Check accounts via admin client
    const { data: accountMemberships } = await adminClient
      .from('accounts_memberships')
      .select(`
        account_id,
        role,
        accounts:account_id (
          id,
          name,
          slug,
          is_personal_account
        )
      `)
      .eq('user_id', user.id);
    
    // Check user_accounts view
    const { data: userAccountsView, error: viewError } = await client
      .from('user_accounts')
      .select('*');
    
    // Try raw query with RLS context
    const { data: rawAccounts } = await client
      .from('accounts')
      .select(`
        id,
        name,
        slug,
        is_personal_account,
        accounts_memberships!inner (
          role,
          user_id
        )
      `)
      .eq('accounts_memberships.user_id', user.id);
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      accountMemberships,
      userAccountsView,
      userAccountsViewError: viewError?.message,
      rawAccounts,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}