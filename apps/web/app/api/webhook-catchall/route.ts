// Catch-all webhook to see if ANY webhooks are being received
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: NextRequest) {
  const adminClient = getSupabaseServerAdminClient();
  const timestamp = new Date().toISOString();
  
  console.error('🎯 WEBHOOK CATCHALL - SOMETHING HIT US!');
  console.error('URL:', request.url);
  console.error('Time:', timestamp);
  
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    
    // Log to database
    await adminClient.from('webhook_logs').insert({
      webhook_name: 'catchall',
      called_at: timestamp,
      url: request.url,
      headers: headers,
      body: body?.substring(0, 5000), // First 5000 chars
    });
    
    // Parse as JSON if possible
    let parsed = null;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      // Not JSON
    }
    
    console.error('Headers:', headers);
    console.error('Body type:', parsed?.type);
    console.error('Body ID:', parsed?.id);
    
    // Always return success to prevent retries
    return NextResponse.json({ 
      received: true,
      timestamp,
      endpoint: 'catchall',
      event_type: parsed?.type,
    });
    
  } catch (error) {
    console.error('Catchall error:', error);
    return NextResponse.json({ received: true });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Webhook catchall is listening',
    timestamp: new Date().toISOString(),
  });
}