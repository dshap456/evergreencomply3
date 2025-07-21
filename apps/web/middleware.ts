import { type NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@kit/supabase/server-client';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Allow all auth routes to pass through without modification
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/update-password') || url.pathname.startsWith('/debug-route')) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    // Create a Supabase client configured to use cookies
    const supabase = createSupabaseServerClient(request, response);

    // Refresh session if expired - required for Server Components
    await supabase.auth.getSession();

  } catch (error) {
    // If there's an error with auth, continue but log it
    console.error('Middleware auth error:', error);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images in the public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}