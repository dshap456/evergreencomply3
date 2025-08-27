import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

// Diagnostic endpoint to check webhook configuration
export async function GET(request: NextRequest) {
  const adminClient = getSupabaseServerAdminClient();
  
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10),
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    },
    webhookEndpoints: [
      '/api/billing/webhook - RECOMMENDED (creates team accounts)',
      '/api/stripe-course-webhook - OLD (has bugs)',
      '/api/course-purchase-webhook - INCOMPLETE (no team accounts)',
    ],
    databaseFunctions: [],
    recentPurchases: [],
  };
  
  try {
    // Check which database functions exist
    const { data: functions } = await adminClient.rpc('get_function_info', {}).catch(() => ({ data: null }));
    
    // Alternative: Check function signatures
    const { data: funcData } = await adminClient
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'process_course_purchase_by_slug')
      .catch(() => ({ data: [] }));
    
    diagnostics.databaseFunctions = funcData || [];
    
    // Check recent course_seats entries
    const { data: recentSeats } = await adminClient
      .from('course_seats')
      .select('*, accounts(name, is_personal_account)')
      .order('created_at', { ascending: false })
      .limit(5);
    
    diagnostics.recentSeats = recentSeats;
    
    // Check recent enrollments
    const { data: recentEnrollments } = await adminClient
      .from('course_enrollments')
      .select('*, courses(title)')
      .order('enrolled_at', { ascending: false })
      .limit(5);
    
    diagnostics.recentEnrollments = recentEnrollments;
    
    // Check team accounts created recently
    const { data: recentTeams } = await adminClient
      .from('accounts')
      .select('*')
      .eq('is_personal_account', false)
      .order('created_at', { ascending: false })
      .limit(5);
    
    diagnostics.recentTeamAccounts = recentTeams;
    
    // Check accounts_memberships with team_manager role
    const { data: teamManagers } = await adminClient
      .from('accounts_memberships')
      .select('*, accounts(name, is_personal_account)')
      .eq('account_role', 'team_manager')
      .order('created_at', { ascending: false })
      .limit(5);
    
    diagnostics.teamManagerMemberships = teamManagers;
    
  } catch (error: any) {
    diagnostics.error = error.message;
  }
  
  // Recommendations
  diagnostics.recommendations = [
    '1. Verify in Stripe Dashboard that webhook URL is: https://www.evergreencomply.com/api/billing/webhook',
    '2. Ensure STRIPE_WEBHOOK_SECRET in Vercel matches the signing secret from Stripe',
    '3. Check that you are using the CORRECT webhook endpoint (billing/webhook)',
    '4. Run the database migration to fix process_course_purchase_by_slug function',
  ];
  
  // Check for common issues
  const issues = [];
  
  if (!diagnostics.environment.hasWebhookSecret) {
    issues.push('❌ STRIPE_WEBHOOK_SECRET not configured');
  }
  
  if (diagnostics.recentTeamAccounts?.some((a: any) => !a.created_at)) {
    issues.push('⚠️ Team accounts with NULL created_at found');
  }
  
  if (!diagnostics.teamManagerMemberships || diagnostics.teamManagerMemberships.length === 0) {
    issues.push('⚠️ No team_manager memberships found');
  }
  
  diagnostics.issues = issues;
  
  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}