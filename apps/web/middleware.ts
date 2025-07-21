import { type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '@kit/supabase/server-client';

export async function middleware(request: NextRequest) {
  let response = await import('next/server').then((mod) => mod.NextResponse.next({
    request: {
      headers: request.headers,
    },
  }));

  try {
    // Create a Supabase client configured to use cookies
    const supabase = createSupabaseServerClient(request, response);

    // Refresh session if expired - required for Server Components
    const { data: { session } } = await supabase.auth.getSession();

    // Optional: Add user info to headers for debugging
    if (session?.user) {
      response.headers.set('x-user-id', session.user.id);
      response.headers.set('x-user-email', session.user.email ?? '');
    }

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