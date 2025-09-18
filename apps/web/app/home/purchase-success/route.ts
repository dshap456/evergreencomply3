import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import Stripe from 'stripe';

// Redirect handler after successful purchase
// Determines if user should go to personal courses or team management
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  const client = getSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    // Not authenticated, redirect to sign in
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  // CRITICAL: Check the Stripe session to determine purchase type
  // Don't rely on database state - webhook might not have finished yet!
  if (sessionId) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-06-30.basil',
      });

      // Retrieve the checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items'],
      });

      // Calculate total quantity across all line items
      const totalQuantity = session.line_items?.data.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

      // If this was a multi-seat purchase (2+), redirect to team management
      if (totalQuantity > 1) {
        // Get admin client for database operations
        const adminClient = getSupabaseServerAdminClient();

        // First check if purchase was processed by checking course_seats
        const { data: purchaseCheck } = await adminClient
          .from('course_seats')
          .select('id, account_id, seats_purchased')
          .eq('payment_id', sessionId)
          .single();

        if (!purchaseCheck) {
          console.error('[Purchase Success] ⚠️ Purchase not found after checkout! Calling failsafe...');
          // Call failsafe endpoint to process the purchase
          try {
            const response = await fetch(new URL('/api/ensure-purchase-processed', request.url).toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId })
            });

            await response.json();
          } catch (error) {
            console.error('[Purchase Success] Failsafe failed:', error);
          }
        }

        // Wait a bit for webhook to process (max 5 seconds with retries)
        let teamAccount = null;

        for (let i = 0; i < 10; i++) {
          // Try multiple approaches to find the team account
          const { data: teamMemberships, error: membershipError } = await adminClient
            .from('accounts_memberships')
            .select(`
              account_id,
              account_role,
              accounts!inner(
                id,
                name,
                slug,
                is_personal_account,
                created_at,
                primary_owner_user_id
              )
            `)
            .eq('user_id', user.id)
            .eq('account_role', 'team_manager')
            .eq('accounts.is_personal_account', false)
            .limit(1);

          if (membershipError) {
            console.error(`[Purchase Success] Error checking team memberships:`, membershipError);
          }

          if (teamMemberships && teamMemberships.length > 0) {
            teamAccount = teamMemberships[0].accounts;
            break;
          }

          // Wait 500ms before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (teamAccount) {
          const teamSlug = teamAccount.slug || teamAccount.id;
          return NextResponse.redirect(
            new URL(`/home/${teamSlug}/courses/seats?purchase=success`, request.url)
          );
        } else {
          // Redirect to a pending page or show a message
          return NextResponse.redirect(
            new URL(`/home/courses?purchase=success&pending=team`, request.url)
          );
        }
      }

      // Single seat purchase - redirect to personal courses
      return NextResponse.redirect(
        new URL('/home/courses?purchase=success', request.url)
      );

    } catch (error) {
      console.error('[Purchase Success] Error retrieving session:', error);
    }
  }

  // Fallback: Check database state (for backwards compatibility)
  const { data: teamMemberships } = await client
    .from('accounts_memberships')
    .select(`
      account_id,
      account_role,
      accounts!inner(
        id,
        name,
        slug,
        is_personal_account
      )
    `)
    .eq('user_id', user.id)
    .eq('account_role', 'team_manager')  // Use correct role name from roles table
    .eq('accounts.is_personal_account', false);

  if (teamMemberships && teamMemberships.length > 0) {
    const teamAccount = teamMemberships[0].accounts;
    const teamSlug = teamAccount.slug || teamAccount.id;
    return NextResponse.redirect(
      new URL(`/home/${teamSlug}/courses/seats?purchase=success`, request.url)
    );
  }

  // Default to personal courses page
  return NextResponse.redirect(
    new URL('/home/courses?purchase=success', request.url)
  );
}
