import { NextRequest, NextResponse } from 'next/server';

// This endpoint helps debug webhook issues by showing what the webhook should process

export async function GET(request: NextRequest) {
  // Show the expected webhook configuration
  const webhookInfo = {
    endpoint: 'https://www.evergreencomply.com/api/billing/webhook',
    expectedEvents: ['checkout.session.completed'],
    requiredEnvVars: {
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'Set ✓' : 'Missing ❌',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set ✓' : 'Missing ❌',
    },
    priceToProductMapping: {
      'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat',
      'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',
      'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',
    },
    expectedMetadata: {
      type: 'training-purchase',
      accountType: 'personal or team',
      purchaseAccountId: 'The account ID making the purchase',
    },
    debugSteps: [
      '1. Check Stripe Dashboard → Webhooks → Your endpoint → Webhook attempts',
      '2. Look for the most recent attempt and check the response code',
      '3. If 200: Check response body for any errors',
      '4. If 400: Signature verification failed',
      '5. If 500: Internal error - check Vercel logs',
      '6. Verify the checkout session has metadata.type = "training-purchase"',
      '7. Verify client_reference_id is set to the user ID',
    ],
    vercelLogs: 'Go to Vercel Dashboard → Functions → api/billing/webhook → View logs',
  };
  
  return NextResponse.json(webhookInfo);
}