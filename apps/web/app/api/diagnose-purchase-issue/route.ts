import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET(request: NextRequest) {
  const adminClient = getSupabaseServerAdminClient();
  const email = request.nextUrl.searchParams.get('email');
  
  if (!email) {
    return NextResponse.json({ error: 'Please provide email parameter' });
  }

  const diagnostics: any = {
    email,
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // 1. Check if user exists in auth.users
    const { data: authUsers } = await adminClient.auth.admin.listUsers({
      filter: `email.eq.${email}`,
      perPage: 1,
    });
    
    diagnostics.checks.authUserExists = authUsers?.users?.length > 0;
    if (authUsers?.users?.length > 0) {
      diagnostics.authUserId = authUsers.users[0].id;
    }

    // 2. Check if account exists
    const { data: account } = await adminClient
      .from('accounts')
      .select('id, email, is_personal_account')
      .eq('email', email)
      .eq('is_personal_account', true)
      .single();
    
    diagnostics.checks.accountExists = !!account;
    if (account) {
      diagnostics.accountId = account.id;
    }

    // 3. Check enrollments
    if (diagnostics.accountId) {
      const { data: enrollments } = await adminClient
        .from('course_enrollments')
        .select('id, course_id, created_at')
        .eq('account_id', diagnostics.accountId);
      
      diagnostics.enrollments = enrollments || [];
      diagnostics.checks.hasEnrollments = (enrollments?.length || 0) > 0;
    }

    // 4. Check recent payments
    const { data: payments } = await adminClient
      .from('course_purchases')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(5);
    
    diagnostics.recentPayments = payments || [];

    // 5. Summary
    diagnostics.summary = {
      userSetupCorrect: diagnostics.checks.authUserExists && diagnostics.checks.accountExists,
      hasEnrollments: diagnostics.checks.hasEnrollments,
      hasPurchases: (payments?.length || 0) > 0,
      probableCause: getProbableCause(diagnostics)
    };

  } catch (error) {
    diagnostics.error = error;
  }

  return NextResponse.json(diagnostics, { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function getProbableCause(diagnostics: any): string {
  if (!diagnostics.checks.authUserExists) {
    return "User was never created in auth.users table";
  }
  if (!diagnostics.checks.accountExists) {
    return "Personal account was never created (trigger might have failed)";
  }
  if (!diagnostics.checks.hasEnrollments && diagnostics.recentPayments?.length > 0) {
    return "Payment recorded but enrollment not created";
  }
  if (!diagnostics.recentPayments || diagnostics.recentPayments.length === 0) {
    return "No payment record found - webhook might not be processing";
  }
  return "Unknown issue";
}