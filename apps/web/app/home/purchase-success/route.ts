import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Redirect handler after successful purchase
// Determines if user should go to personal courses or team management
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');
  
  const client = getSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    // Not authenticated, redirect to sign in
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }
  
  // Check if user has a team account with team-admin role
  const { data: teamMemberships } = await client
    .from('accounts_memberships')
    .select(`
      account_id,
      account_role,
      accounts!inner(
        id,
        name,
        slug,
        is_personal_account
      )
    `)
    .eq('user_id', user.id)
    .eq('account_role', 'team-admin')
    .eq('accounts.is_personal_account', false);
  
  if (teamMemberships && teamMemberships.length > 0) {
    // User is a team admin - redirect to team seat management
    const teamAccount = teamMemberships[0].accounts;
    const teamSlug = teamAccount.slug || teamAccount.id;
    
    console.log('[Purchase Success] User is team admin, redirecting to seat management');
    return NextResponse.redirect(
      new URL(`/home/${teamSlug}/courses/seats?purchase=success`, request.url)
    );
  }
  
  // Check if user has any course enrollments (individual purchase)
  const { data: enrollments } = await client
    .from('course_enrollments')
    .select('id')
    .eq('account_id', user.id)
    .limit(1);
  
  if (enrollments && enrollments.length > 0) {
    // User has individual enrollments - redirect to personal courses
    console.log('[Purchase Success] User has individual enrollments, redirecting to courses');
    return NextResponse.redirect(
      new URL('/home/courses?purchase=success', request.url)
    );
  }
  
  // Default to personal courses page
  console.log('[Purchase Success] Default redirect to courses');
  return NextResponse.redirect(
    new URL('/home/courses?purchase=success', request.url)
  );
}