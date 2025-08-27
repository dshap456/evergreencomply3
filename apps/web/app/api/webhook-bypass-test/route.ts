import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

// Test webhook that bypasses ALL verification - just to see if we're getting called
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  console.error('🔥🔥🔥 WEBHOOK BYPASS TEST - CALLED AT:', timestamp);
  
  try {
    const body = await request.text();
    let parsed: any = {};
    
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      console.error('Could not parse body as JSON');
    }
    
    // Log everything
    console.error('Event Type:', parsed.type);
    console.error('Event ID:', parsed.id);
    console.error('Session ID:', parsed.data?.object?.id);
    
    // Try to save to database as proof
    const adminClient = getSupabaseServerAdminClient();
    
    // Save to a simple table (create inline if needed)
    await adminClient.from('webhook_bypass_test').insert({
      received_at: timestamp,
      event_type: parsed.type,
      event_id: parsed.id,
      session_id: parsed.data?.object?.id,
      raw_body: body.substring(0, 1000) // First 1000 chars
    });
    
    // If it's a checkout.session.completed, process it
    if (parsed.type === 'checkout.session.completed' && parsed.data?.object) {
      const session = parsed.data.object;
      console.error('🎯 CHECKOUT SESSION COMPLETED:', session.id);
      console.error('Metadata:', session.metadata);
      console.error('Client Ref ID:', session.client_reference_id);
      
      // Return detailed response
      return NextResponse.json({
        received: true,
        timestamp,
        processed: true,
        event: {
          type: parsed.type,
          session_id: session.id,
          metadata: session.metadata
        },
        message: 'Webhook bypass test - checkout session received'
      });
    }
    
    return NextResponse.json({
      received: true,
      timestamp,
      event_type: parsed.type,
      message: 'Webhook bypass test - event received'
    });
    
  } catch (error) {
    console.error('🔥 WEBHOOK BYPASS ERROR:', error);
    return NextResponse.json({
      received: true,
      error: true,
      timestamp
    });
  }
}

// GET endpoint to test it's reachable
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook bypass test is ready',
    timestamp: new Date().toISOString(),
    note: 'This endpoint bypasses all verification for testing only'
  });
}