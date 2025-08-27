import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

// Simple endpoint that logs EVERY webhook call to the database
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    // Parse basic event info
    let eventData = null;
    try {
      const parsed = JSON.parse(body);
      eventData = {
        type: parsed.type,
        id: parsed.id,
        session_id: parsed.data?.object?.id,
        created: parsed.created,
      };
    } catch (e) {
      // Body isn't JSON
    }
    
    // Log to console immediately
    console.log('🚨 WEBHOOK RECEIVED AT:', timestamp);
    console.log('🚨 Event:', eventData);
    console.log('🚨 Has Signature:', !!signature);
    
    // Try to log to database
    const adminClient = getSupabaseServerAdminClient();
    
    // Create a simple log entry
    const { error } = await adminClient
      .from('webhook_test_logs')
      .insert({
        received_at: timestamp,
        endpoint: request.url,
        has_signature: !!signature,
        event_type: eventData?.type,
        event_id: eventData?.id,
        session_id: eventData?.session_id,
        body_size: body.length,
      });
    
    if (error) {
      console.error('🚨 Failed to log to database:', error);
    }
    
    // Always return success so Stripe doesn't retry
    return NextResponse.json({ 
      received: true,
      timestamp,
      logged: !error,
      event: eventData
    });
    
  } catch (error) {
    console.error('🚨 WEBHOOK ERROR:', error);
    return NextResponse.json({ 
      received: true,
      error: true,
      timestamp
    });
  }
}