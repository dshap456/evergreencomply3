import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import Stripe from 'stripe';

// Debug endpoint to understand why redirect isn't working
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');
  
  const debugInfo: any = {
    sessionId,
    timestamp: new Date().toISOString(),
  };
  
  try {
    // Get user
    const client = getSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    debugInfo.user = user ? { id: user.id, email: user.email } : null;
    
    if (!sessionId) {
      debugInfo.error = 'No session_id provided';
      return NextResponse.json(debugInfo);
    }
    
    // Get Stripe session
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items'],
      });
      
      debugInfo.stripeSession = {
        id: session.id,
        customer_email: session.customer_email,
        client_reference_id: session.client_reference_id,
        metadata: session.metadata,
        payment_status: session.payment_status,
        status: session.status,
        line_items: session.line_items?.data.map(item => ({
          description: item.description,
          quantity: item.quantity,
          price_id: item.price?.id,
        })),
      };
      
      // Calculate total quantity
      const totalQuantity = session.line_items?.data.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      debugInfo.totalQuantity = totalQuantity;
      debugInfo.isTeamPurchase = totalQuantity > 1;
      
    } catch (stripeError: any) {
      debugInfo.stripeError = stripeError.message;
    }
    
    // Check team memberships
    if (user) {
      const { data: teamMemberships } = await client
        .from('accounts_memberships')
        .select(`
          account_id,
          account_role,
          created_at,
          accounts!inner(
            id,
            name,
            slug,
            is_personal_account,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .eq('account_role', 'team_manager')  // Use correct role name from roles table
        .eq('accounts.is_personal_account', false);
      
      debugInfo.teamMemberships = teamMemberships;
      
      // Check enrollments
      const { data: enrollments } = await client
        .from('course_enrollments')
        .select('id, account_id, enrolled_at, course_id')
        .eq('account_id', user.id)
        .order('enrolled_at', { ascending: false })
        .limit(5);
      
      debugInfo.recentEnrollments = enrollments;
      
      // Check course seats
      const { data: seats } = await client
        .from('course_seats')
        .select(`
          id,
          account_id,
          course_id,
          total_seats,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      debugInfo.recentSeats = seats;
    }
    
    // Determine what redirect SHOULD happen
    if (debugInfo.isTeamPurchase) {
      debugInfo.expectedRedirect = 'Should go to team seat management';
      if (debugInfo.teamMemberships && debugInfo.teamMemberships.length > 0) {
        const team = debugInfo.teamMemberships[0].accounts;
        debugInfo.expectedPath = `/home/${team.slug || team.id}/courses/seats`;
      } else {
        debugInfo.expectedPath = 'Team account not found - webhook may not have processed';
      }
    } else {
      debugInfo.expectedRedirect = 'Should go to individual courses';
      debugInfo.expectedPath = '/home/courses';
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