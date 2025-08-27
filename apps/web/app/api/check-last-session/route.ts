import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Check the last checkout session for the current user
export async function GET(request: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
    
    const client = getSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // List recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });
    
    // Find sessions for this user
    const userSessions = sessions.data.filter(s => 
      s.client_reference_id === user.id || 
      s.customer_email === user.email ||
      s.metadata?.userId === user.id
    );
    
    const results = userSessions.map(s => ({
      id: s.id,
      created: new Date(s.created * 1000).toISOString(),
      success_url: s.success_url,
      status: s.status,
      payment_status: s.payment_status,
      customer_email: s.customer_email,
      client_reference_id: s.client_reference_id,
      metadata: s.metadata,
      amount_total: s.amount_total,
    }));
    
    return NextResponse.json({
      user: { id: user.id, email: user.email },
      totalSessions: sessions.data.length,
      userSessions: results.length,
      sessions: results,
      note: 'Check the success_url field - this is where Stripe redirected after payment',
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}