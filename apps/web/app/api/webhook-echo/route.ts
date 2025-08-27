import { NextRequest, NextResponse } from 'next/server';

// Dead simple webhook echo - just to confirm it's being called
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`[WEBHOOK-ECHO] Received POST at ${timestamp}`);
  
  const signature = request.headers.get('stripe-signature');
  console.log(`[WEBHOOK-ECHO] Has signature: ${!!signature}`);
  
  // Just return success immediately
  return NextResponse.json({ 
    received: true,
    timestamp,
    message: 'Webhook echo endpoint - confirming receipt'
  });
}