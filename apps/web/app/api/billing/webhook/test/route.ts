import { NextRequest, NextResponse } from 'next/server';

// Simple test endpoint to verify webhook can be reached
export async function POST(request: NextRequest) {
  console.log('[Test Webhook] Received POST request');
  
  const headers = Object.fromEntries(request.headers.entries());
  console.log('[Test Webhook] Headers:', headers);
  
  const body = await request.text();
  console.log('[Test Webhook] Body length:', body.length);
  console.log('[Test Webhook] Has stripe signature:', !!headers['stripe-signature']);
  
  return NextResponse.json({ 
    success: true,
    message: 'Webhook endpoint is reachable',
    timestamp: new Date().toISOString(),
    hasSignature: !!headers['stripe-signature'],
    bodyLength: body.length
  });
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}