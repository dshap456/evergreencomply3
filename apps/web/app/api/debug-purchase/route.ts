import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Debug endpoint to check purchase state
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email') || 'testbrittnay@gmail.com';
  
  const adminClient = getSupabaseServerAdminClient();
  const client = getSupabaseServerClient();
  
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    searchEmail: email,
  };
  
  try {
    // 1. Find user in auth.users
    const { data: authUser } = await adminClient
      .from('auth.users')
      .select('id, email, created_at')
      .eq('email', email)
      .single();
    
    debugInfo.authUser = authUser;
    
    if (authUser) {
      // 2. Find all accounts for this user
      const { data: memberships } = await adminClient
        .from('accounts_memberships')
        .select(`
          *,
          accounts(*)
        `)
        .eq('user_id', authUser.id);
      
      debugInfo.memberships = memberships;
      
      // 3. Find team accounts owned by this user
      const { data: ownedAccounts } = await adminClient
        .from('accounts')
        .select('*')
        .eq('primary_owner_user_id', authUser.id)
        .eq('is_personal_account', false);
      
      debugInfo.ownedTeamAccounts = ownedAccounts;
      
      // 4. Find personal account
      const { data: personalAccount } = await adminClient
        .from('accounts')
        .select('*')
        .eq('primary_owner_user_id', authUser.id)
        .eq('is_personal_account', true)
        .single();
      
      debugInfo.personalAccount = personalAccount;
      
      // 5. Check enrollments
      const { data: enrollments } = await adminClient
        .from('course_enrollments')
        .select(`
          *,
          courses(id, title, slug)
        `)
        .eq('user_id', authUser.id);
      
      debugInfo.enrollments = enrollments;
      
      // 6. Check course seats for all related accounts
      const accountIds = [
        personalAccount?.id,
        ...(ownedAccounts?.map(a => a.id) || []),
        ...(memberships?.map(m => m.account_id) || [])
      ].filter(Boolean);
      
      if (accountIds.length > 0) {
        const { data: seats } = await adminClient
          .from('course_seats')
          .select(`
            *,
            courses(id, title, slug),
            accounts(id, name, is_personal_account)
          `)
          .in('account_id', accountIds);
        
        debugInfo.courseSeats = seats;
      }
      
      // 7. Summary
      debugInfo.summary = {
        hasPersonalAccount: !!personalAccount,
        teamAccountsOwned: ownedAccounts?.length || 0,
        totalMemberships: memberships?.length || 0,
        teamManagerMemberships: memberships?.filter(m => m.account_role === 'team_manager').length || 0,
        enrolledCourses: enrollments?.length || 0,
        totalSeatsAcrossAccounts: debugInfo.courseSeats?.reduce((sum: number, s: any) => sum + (s.total_seats || 0), 0) || 0,
      };
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