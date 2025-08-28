// Complete diagnostic of the webhook issue
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET(request: NextRequest) {
  const adminClient = getSupabaseServerAdminClient();
  const userId = 'b6c5a2cb-d4d7-4ac4-9296-85a5ea0b55bd';
  
  console.error('🔍 STARTING COMPLETE DIAGNOSIS');
  
  // 1. Check all accounts for this user
  const { data: allAccounts } = await adminClient
    .from('accounts')
    .select('*')
    .or(`id.eq.${userId},primary_owner_user_id.eq.${userId}`);
  
  // 2. Check all memberships
  const { data: allMemberships } = await adminClient
    .from('accounts_memberships')
    .select('*')
    .eq('user_id', userId);
  
  // 3. Check recent course_seats
  const { data: recentSeats } = await adminClient
    .from('course_seats')
    .select(`
      *,
      accounts(name, is_personal_account),
      courses(title, slug)
    `)
    .order('created_at', { ascending: false })
    .limit(10);
  
  // 4. Test the exact webhook query
  const { data: webhookQuery1, error: error1 } = await adminClient
    .from('accounts_memberships')
    .select('account_id')
    .eq('user_id', userId)
    .eq('account_role', 'team_manager');
  
  // 5. Test finding team by ownership
  const { data: webhookQuery2, error: error2 } = await adminClient
    .from('accounts')
    .select('id')
    .eq('primary_owner_user_id', userId)
    .eq('is_personal_account', false)
    .limit(1)
    .single();
  
  // 6. Check if the stored procedure works
  let storedProcTest = null;
  try {
    const { data, error } = await adminClient.rpc('process_course_purchase_by_slug', {
      p_course_slug: 'advanced-hazmat',
      p_account_id: 'e13e2bef-1e19-45f1-95f8-53447322f0b4', // The actual team account
      p_payment_id: 'test_diagnose_' + Date.now(),
      p_quantity: 2,
      p_customer_name: 'Diagnostic Test',
    });
    storedProcTest = { data, error };
  } catch (e) {
    storedProcTest = { error: e };
  }
  
  // 7. Check webhook logs
  const { data: webhookLogs } = await adminClient
    .from('webhook_bypass_test')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(5);
  
  return NextResponse.json({
    diagnosis: {
      user_id: userId,
      accounts: {
        all: allAccounts,
        personal: allAccounts?.filter(a => a.is_personal_account),
        team: allAccounts?.filter(a => !a.is_personal_account),
      },
      memberships: {
        all: allMemberships,
        team_manager: allMemberships?.filter(m => m.account_role === 'team_manager'),
      },
      webhook_queries: {
        find_by_membership: { data: webhookQuery1, error: error1 },
        find_by_ownership: { data: webhookQuery2, error: error2 },
      },
      recent_seats: recentSeats,
      stored_proc_test: storedProcTest,
      webhook_logs: webhookLogs,
      expected_team_account: 'e13e2bef-1e19-45f1-95f8-53447322f0b4',
      problem_summary: {
        has_team_account: allAccounts?.some(a => !a.is_personal_account && a.id === 'e13e2bef-1e19-45f1-95f8-53447322f0b4'),
        has_team_membership: allMemberships?.some(m => m.account_id === 'e13e2bef-1e19-45f1-95f8-53447322f0b4'),
        last_purchase_went_to: recentSeats?.[0]?.account_id,
        last_purchase_was_personal: recentSeats?.[0]?.accounts?.is_personal_account,
      }
    }
  });
}