import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

// Simple endpoint to log webhook calls
export async function POST(request: NextRequest) {
  console.log('[WEBHOOK-LOG-TEST] Webhook received at:', new Date().toISOString());
  
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    // Parse the body to get basic info
    let eventInfo = {};
    try {
      const parsed = JSON.parse(body);
      eventInfo = {
        type: parsed.type,
        id: parsed.id,
        created: parsed.created,
        object_id: parsed.data?.object?.id
      };
    } catch (e) {
      eventInfo = { parseError: true };
    }
    
    // Log to database for debugging
    const adminClient = getSupabaseServerAdminClient();
    
    // Create a simple log table if needed (or use existing)
    await adminClient.from('webhook_debug_logs').insert({
      endpoint: '/api/course-purchase-webhook',
      received_at: new Date().toISOString(),
      has_signature: !!signature,
      signature_prefix: signature?.substring(0, 20),
      event_info: eventInfo,
      body_length: body.length,
      headers: {
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent'),
      }
    }).select();
    
    console.log('[WEBHOOK-LOG-TEST] Logged webhook call:', eventInfo);
    
    return NextResponse.json({ 
      received: true,
      logged: true,
      timestamp: new Date().toISOString(),
      event: eventInfo
    });
    
  } catch (error) {
    console.error('[WEBHOOK-LOG-TEST] Error:', error);
    return NextResponse.json({ 
      received: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}