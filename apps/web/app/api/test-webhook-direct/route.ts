import { NextRequest, NextResponse } from 'next/server';

// Direct test - simulate calling the webhook with exact data
export async function GET(request: NextRequest) {
  const webhookUrl = new URL('/api/course-purchase-webhook', request.url);
  
  // Create a test event payload
  const testEvent = {
    id: 'evt_test_' + Date.now(),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_' + Date.now(),
        object: 'checkout.session',
        client_reference_id: 'b6c5a2cb-d4d7-4ac4-9296-85a5ea0b55bd',
        customer_email: 'testbrittnay@gmail.com',
        payment_status: 'paid',
        status: 'complete',
        metadata: {
          type: 'training-purchase',
          accountType: 'team',
          customerName: '',
          items: '[{"courseId":"advanced-hazmat","quantity":2}]',
          purchaseAccountId: 'b6c5a2cb-d4d7-4ac4-9296-85a5ea0b55bd',
          userId: 'b6c5a2cb-d4d7-4ac4-9296-85a5ea0b55bd'
        }
      }
    }
  };
  
  console.error('🧪 TEST: Calling webhook directly with test data');
  
  try {
    // Call the webhook endpoint directly
    const response = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Skip signature for this test
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(testEvent)
    });
    
    const result = await response.text();
    
    console.error('🧪 TEST: Webhook response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: result
    });
    
    return NextResponse.json({
      test: 'completed',
      webhookUrl: webhookUrl.toString(),
      response: {
        status: response.status,
        statusText: response.statusText,
        body: result
      },
      sentData: testEvent
    });
    
  } catch (error) {
    console.error('🧪 TEST: Error calling webhook:', error);
    return NextResponse.json({
      test: 'failed',
      error: error instanceof Error ? error.message : error
    });
  }
}