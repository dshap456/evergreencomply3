// DISABLED: This webhook endpoint has been disabled to prevent duplicate processing
// Use /api/course-purchase-webhook instead
// The original file has been backed up as route.ts.backup

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.warn('[DISABLED WEBHOOK] Attempt to use disabled stripe-course-webhook endpoint');
  
  return NextResponse.json(
    { 
      error: 'This webhook endpoint has been disabled to prevent duplicate processing.',
      message: 'Please use /api/course-purchase-webhook instead.',
      recommendation: 'Remove this endpoint from your Stripe webhook configuration.'
    },
    { status: 410 } // 410 Gone - indicates the resource is no longer available
  );
}