import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
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
      
      console.log('[Purchase Success] Session retrieved:', {
        sessionId: session.id,
        customerEmail: session.customer_email,
        lineItems: session.line_items?.data.map(item => ({
          description: item.description,
          quantity: item.quantity,
          priceId: item.price?.id,
        })),
        totalQuantity: session.line_items?.data.reduce((sum, item) => sum + (item.quantity || 0), 0),
        metadata: session.metadata,
        clientReferenceId: session.client_reference_id,
      });
      
      // Calculate total quantity across all line items
      const totalQuantity = session.line_items?.data.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      
      // If this was a multi-seat purchase (2+), redirect to team management
      if (totalQuantity > 1) {
        console.log('[Purchase Success] Multi-seat purchase detected, waiting for team account...');
        console.log('[Purchase Success] User ID:', user.id);
        console.log('[Purchase Success] Session client_reference_id:', session.client_reference_id);
        
        // Wait a bit for webhook to process (max 5 seconds with retries)
        let teamAccount = null;
        let attemptCount = 0;
        for (let i = 0; i < 10; i++) {
          attemptCount++;
          console.log(`[Purchase Success] Attempt ${attemptCount}: Checking for team membership...`);
          
          const { data: teamMemberships, error: membershipError } = await client
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
            .eq('account_role', 'team_manager')  // Use correct role name from roles table
            .eq('accounts.is_personal_account', false)
            .limit(1);
          
          if (membershipError) {
            console.error(`[Purchase Success] Error checking team memberships:`, membershipError);
          }
          
          console.log(`[Purchase Success] Team memberships found:`, teamMemberships);
          
          if (teamMemberships && teamMemberships.length > 0) {
            teamAccount = teamMemberships[0].accounts;
            break;
          }
          
          // Wait 500ms before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (teamAccount) {
          const teamSlug = teamAccount.slug || teamAccount.id;
          console.log('[Purchase Success] ✅ Team account found:', {
            id: teamAccount.id,
            name: teamAccount.name,
            slug: teamSlug,
            created_at: teamAccount.created_at,
            owner_id: teamAccount.primary_owner_user_id,
          });
          console.log('[Purchase Success] Redirecting to:', `/home/${teamSlug}/courses/seats?purchase=success`);
          return NextResponse.redirect(
            new URL(`/home/${teamSlug}/courses/seats?purchase=success`, request.url)
          );
        } else {
          console.log('[Purchase Success] ❌ Team account not ready after 5 seconds');
          
          // Let's check what accounts DO exist for this user
          const { data: allMemberships } = await client
            .from('accounts_memberships')
            .select(`
              account_id,
              account_role,
              created_at,
              accounts!inner(
                id,
                name,
                is_personal_account,
                created_at
              )
            `)
            .eq('user_id', user.id);
          
          console.log('[Purchase Success] All user memberships:', allMemberships);
          
          // Check if webhook has processed at all
          const { data: recentSeats } = await client
            .from('course_seats')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
          
          console.log('[Purchase Success] Recent course_seats:', recentSeats);
          
          // Redirect to a pending page or show a message
          return NextResponse.redirect(
            new URL(`/home/courses?purchase=success&pending=team`, request.url)
          );
        }
      }
      
      // Single seat purchase - redirect to personal courses
      console.log('[Purchase Success] Single seat purchase, redirecting to personal courses');
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
  console.log('[Purchase Success] Default redirect to courses');
  return NextResponse.redirect(
    new URL('/home/courses?purchase=success', request.url)
  );
}