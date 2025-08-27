import { NextRequest, NextResponse } from 'next/server';

// Test the actual redirect response
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id') || 'cs_live_a1wQXs0FkiuWaNUTmozJsQhHmIOJzINryeFfNs0HZhjdXbMS6Y25xxcGS7';
  
  // Call the purchase-success route internally
  const purchaseSuccessUrl = new URL('/home/purchase-success', request.url);
  purchaseSuccessUrl.searchParams.set('session_id', sessionId);
  
  // Fetch the route
  const response = await fetch(purchaseSuccessUrl.toString(), {
    headers: {
      cookie: request.headers.get('cookie') || '',
    },
    redirect: 'manual', // Don't follow redirects
  });
  
  const result = {
    status: response.status,
    statusText: response.statusText,
    location: response.headers.get('location'),
    headers: Object.fromEntries(response.headers.entries()),
    isRedirect: response.status >= 300 && response.status < 400,
    expectedBehavior: null as string | null,
  };
  
  if (result.isRedirect && result.location) {
    if (result.location.includes('/courses/seats')) {
      result.expectedBehavior = '✅ Would redirect to team seat management';
    } else if (result.location.includes('/auth/sign-in')) {
      result.expectedBehavior = '❌ User not authenticated - would redirect to sign-in';
    } else if (result.location.includes('pending=team')) {
      result.expectedBehavior = '⚠️ Team not ready - would show pending message';
    } else {
      result.expectedBehavior = '❓ Unexpected redirect location';
    }
  }
  
  return NextResponse.json(result);
}