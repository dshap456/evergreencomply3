import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Complete flow test - simulates what the webhook should do
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'test';
  const email = searchParams.get('email') || 'testbrittnay@gmail.com';
  
  const adminClient = getSupabaseServerAdminClient();
  const regularClient = getSupabaseServerClient();
  
  const results: any = {
    timestamp: new Date().toISOString(),
    action,
    email,
    steps: [],
  };
  
  try {
    // Step 1: Find the user
    const { data: authUser } = await adminClient
      .from('auth.users')
      .select('*')
      .eq('email', email)
      .single();
    
    results.steps.push({
      step: 'Find user',
      success: !!authUser,
      userId: authUser?.id,
    });
    
    if (!authUser) {
      results.error = 'User not found';
      return NextResponse.json(results);
    }
    
    const userId = authUser.id;
    
    if (action === 'test') {
      // Simulate a 2-seat purchase flow
      
      // Step 2: Create team account
      const teamName = `Test Team ${Date.now()}`;
      const { data: teamAccount, error: teamError } = await adminClient
        .from('accounts')
        .insert({
          primary_owner_user_id: userId,
          name: teamName,
          is_personal_account: false,
          email: null, // Don't use email
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      results.steps.push({
        step: 'Create team account',
        success: !!teamAccount,
        error: teamError,
        accountId: teamAccount?.id,
      });
      
      if (!teamAccount) {
        results.error = 'Failed to create team account';
        return NextResponse.json(results);
      }
      
      // Step 3: Create membership
      const { data: membership, error: membershipError } = await adminClient
        .from('accounts_memberships')
        .insert({
          user_id: userId,
          account_id: teamAccount.id,
          account_role: 'team_manager',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      results.steps.push({
        step: 'Create membership',
        success: !!membership,
        error: membershipError,
        membership,
      });
      
      // Step 4: Verify membership exists
      const { data: verifyMembership } = await adminClient
        .from('accounts_memberships')
        .select('*')
        .eq('user_id', userId)
        .eq('account_id', teamAccount.id)
        .single();
      
      results.steps.push({
        step: 'Verify membership',
        found: !!verifyMembership,
        membership: verifyMembership,
      });
      
      // Step 5: Check if regular client can see it
      const { data: { user } } = await regularClient.auth.getUser();
      
      if (user?.id === userId) {
        const { data: clientMembership, error: clientError } = await regularClient
          .from('accounts_memberships')
          .select(`
            *,
            accounts(*)
          `)
          .eq('user_id', userId)
          .eq('account_role', 'team_manager');
        
        results.steps.push({
          step: 'Client can read membership',
          success: !!clientMembership && clientMembership.length > 0,
          error: clientError,
          found: clientMembership?.length || 0,
        });
      }
      
      // Step 6: Create course seats
      const { data: seats, error: seatsError } = await adminClient
        .from('course_seats')
        .insert({
          account_id: teamAccount.id,
          course_id: 'cef6d4fe-a8e3-4b7e-a5e1-6f8e7d9c0b1a', // Use a real course ID
          total_seats: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      results.steps.push({
        step: 'Create course seats',
        success: !!seats,
        error: seatsError,
        seats,
      });
      
    } else if (action === 'cleanup') {
      // Clean up test data
      
      // Delete test team accounts
      const { data: testTeams } = await adminClient
        .from('accounts')
        .select('id')
        .eq('primary_owner_user_id', userId)
        .eq('is_personal_account', false)
        .like('name', 'Test Team%');
      
      if (testTeams && testTeams.length > 0) {
        const ids = testTeams.map(t => t.id);
        
        // Delete memberships first
        await adminClient
          .from('accounts_memberships')
          .delete()
          .in('account_id', ids);
        
        // Delete seats
        await adminClient
          .from('course_seats')
          .delete()
          .in('account_id', ids);
        
        // Delete accounts
        const { error: deleteError } = await adminClient
          .from('accounts')
          .delete()
          .in('id', ids);
        
        results.steps.push({
          step: 'Cleanup test accounts',
          deleted: ids.length,
          error: deleteError,
        });
      }
    }
    
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