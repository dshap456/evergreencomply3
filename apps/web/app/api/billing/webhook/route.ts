// DISABLED: This webhook has been disabled to prevent duplicate processing
// Course purchases are now handled exclusively by /api/course-purchase-webhook
// Last disabled: 2025-08-27

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.warn('[DISABLED WEBHOOK] Billing webhook called but is disabled');
  
  // Return success to prevent Stripe from retrying
  // but log that this endpoint should be removed from Stripe webhook config
  return NextResponse.json({ 
    received: true,
    message: 'This endpoint is disabled. Course purchases are handled by /api/course-purchase-webhook',
    action_required: 'Please remove /api/billing/webhook from your Stripe webhook configuration'
  });
}