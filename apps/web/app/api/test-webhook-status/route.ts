import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET(request: NextRequest) {
  const adminClient = getSupabaseServerAdminClient();
  
  // Check recent enrollments
  const { data: enrollments, error: enrollError } = await adminClient
    .from('course_enrollments')
    .select('id, account_id, enrolled_at, customer_name')
    .order('enrolled_at', { ascending: false })
    .limit(5);
    
  // Check recent team accounts
  const { data: teams, error: teamsError } = await adminClient
    .from('accounts')
    .select('id, name, is_personal_account, created_at, primary_owner_user_id')
    .eq('is_personal_account', false)
    .order('created_at', { ascending: false })
    .limit(5);
    
  // Check recent course_seats
  const { data: seats, error: seatsError } = await adminClient
    .from('course_seats')
    .select('id, account_id, total_seats, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  return NextResponse.json({
    status: 'Webhook Debug Info',
    environment: {
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'Set ✓' : 'Missing ❌',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set ✓' : 'Missing ❌',
    },
    recentData: {
      enrollments: enrollments || [],
      teamAccounts: teams || [],
      courseSeats: seats || [],
    },
    webhookEndpoints: [
      '/api/billing/webhook - The main webhook endpoint (should be configured in Stripe)',
      '/api/stripe-course-webhook - Alternative endpoint',
      '/api/course-purchase-webhook - Another alternative',
    ],
    stripeInstructions: [
      '1. Go to Stripe Dashboard → Developers → Webhooks',
      '2. Check which endpoint URL is configured',
      '3. Verify it points to: https://www.evergreencomply.com/api/billing/webhook',
      '4. Check the webhook signing secret matches STRIPE_WEBHOOK_SECRET env var',
      '5. Ensure "checkout.session.completed" event is selected',
    ],
  });
}